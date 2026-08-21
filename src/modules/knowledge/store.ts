import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type {
  KnowledgeArticle,
  KnowledgeArticleInput,
  KnowledgeCategory,
  KnowledgeCategoryInput,
  KnowledgeDirectory,
  KnowledgeDirectoryInput,
} from './types'

export const useKnowledgeStore = defineStore('knowledge', () => {
  const articles = ref<KnowledgeArticle[]>([])
  /** 分类是扁平标签，不承担目录层级。 */
  const categories = ref<KnowledgeCategory[]>([])
  /** 目录独立维护层级，最多两层。 */
  const directories = ref<KnowledgeDirectory[]>([])
  const loading = ref(false)
  const categoriesLoading = ref(false)
  const directoriesLoading = ref(false)
  const error = ref<string | null>(null)
  const categoryError = ref<string | null>(null)
  const directoryError = ref<string | null>(null)
  let articlesLoadedUserId: string | undefined
  let categoriesLoadedUserId: string | undefined
  let directoriesLoadedUserId: string | undefined

  function sortArticles(list: KnowledgeArticle[]): KnowledgeArticle[] {
    return [...list].sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
      return b.updated_at.localeCompare(a.updated_at)
    })
  }

  function sortCategories(list: KnowledgeCategory[]): KnowledgeCategory[] {
    return [...list].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
  }

  function sortDirectories(list: KnowledgeDirectory[]): KnowledgeDirectory[] {
    return [...list].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
  }

  async function fetchCategories(force = false): Promise<boolean> {
    const auth = useAuthStore()
    if (!auth.user) return false
    if (!force && categoriesLoadedUserId === auth.user.id) return true
    categoriesLoadedUserId = auth.user.id
    categoriesLoading.value = true
    categoryError.value = null
    try {
      const { data, error: err } = await supabase
        .from('knowledge_categories')
        .select('*')
        .eq('user_id', auth.user.id)
        .eq('is_default', false)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
      if (err) throw err
      categories.value = sortCategories((data ?? []) as KnowledgeCategory[])
      return true
    } catch (e: any) {
      categoryError.value = e?.message ?? '加载分类失败'
      categories.value = []
      console.error('fetchCategories error:', e)
      return false
    } finally {
      categoriesLoading.value = false
    }
  }

  async function fetchDirectories(force = false): Promise<boolean> {
    const auth = useAuthStore()
    if (!auth.user) return false
    if (!force && directoriesLoadedUserId === auth.user.id) return true
    directoriesLoadedUserId = auth.user.id
    directoriesLoading.value = true
    directoryError.value = null
    try {
      const { data, error: err } = await supabase
        .from('knowledge_directories')
        .select('*')
        .eq('user_id', auth.user.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
      if (err) throw err
      directories.value = sortDirectories((data ?? []) as KnowledgeDirectory[])
      return true
    } catch (e: any) {
      directoryError.value = e?.message ?? '加载目录失败'
      directories.value = []
      console.error('fetchDirectories error:', e)
      return false
    } finally {
      directoriesLoading.value = false
    }
  }

  async function fetchArticles(force = false): Promise<boolean> {
    const auth = useAuthStore()
    if (!auth.user) return false
    await Promise.all([fetchCategories(force), fetchDirectories(force)])
    if (!force && articles.value.length > 0 && articlesLoadedUserId === auth.user.id) return true
    articlesLoadedUserId = auth.user.id
    if (articles.value.length === 0) loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('knowledge_articles')
        .select('*')
        .eq('user_id', auth.user.id)
        .order('updated_at', { ascending: false })
      if (err) throw err
      articles.value = sortArticles((data ?? []) as KnowledgeArticle[])
      return true
    } catch (e: any) {
      error.value = e?.message ?? '加载知识库失败'
      console.error('fetchArticles error:', e)
      return false
    } finally {
      loading.value = false
    }
  }

  function createSlug(name: string, existingSlugs: string[], prefix: string): string {
    const normalized = name
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
    const base = `${prefix}-${normalized || 'item'}`
    let slug = base
    let index = 2
    while (existingSlugs.includes(slug)) {
      slug = `${base}-${index}`
      index += 1
    }
    return slug
  }

  async function createCategory(input: KnowledgeCategoryInput) {
    const auth = useAuthStore()
    if (!auth.user) throw new Error('未登录')
    const name = input.name.trim()
    if (!name) throw new Error('请填写分类名称')
    if (categories.value.some((category) => category.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('分类名称已存在')
    }
    const maxSortOrder = categories.value.reduce((max, category) => Math.max(max, category.sort_order), 0)
    const { data, error: err } = await supabase
      .from('knowledge_categories')
      .insert({
        user_id: auth.user.id,
        slug: createSlug(name, categories.value.map((category) => category.slug), 'custom'),
        name,
        color: input.color,
        is_default: false,
        sort_order: maxSortOrder + 10,
      })
      .select()
      .single()
    if (err) throw err
    categories.value = sortCategories([...categories.value, data as KnowledgeCategory])
    return data as KnowledgeCategory
  }

  async function updateCategory(id: string, input: KnowledgeCategoryInput) {
    const name = input.name.trim()
    if (!name) throw new Error('请填写分类名称')
    if (categories.value.some((category) => category.id !== id && category.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('分类名称已存在')
    }
    const { data, error: err } = await supabase
      .from('knowledge_categories')
      .update({ name, color: input.color })
      .eq('id', id)
      .select()
      .single()
    if (err) throw err
    categories.value = sortCategories(categories.value.map((category) => (category.id === id ? data as KnowledgeCategory : category)))
    return data as KnowledgeCategory
  }

  async function deleteCategory(id: string) {
    const { error: err } = await supabase.from('knowledge_categories').delete().eq('id', id)
    if (err) throw err
    categories.value = categories.value.filter((category) => category.id !== id)
  }

  async function createDirectory(input: KnowledgeDirectoryInput) {
    const auth = useAuthStore()
    if (!auth.user) throw new Error('未登录')
    const name = input.name.trim()
    if (!name) throw new Error('请填写目录名称')
    const parentId = input.parent_id ?? null
    if (parentId) {
      const parent = directories.value.find((directory) => directory.id === parentId)
      if (!parent) throw new Error('所选父目录不存在')
      if (parent.parent_id) throw new Error('目录最多支持两级，不能继续创建子目录')
    }
    if (directories.value.some((directory) =>
      (directory.parent_id ?? null) === parentId && directory.name.toLowerCase() === name.toLowerCase(),
    )) {
      throw new Error('同一目录下已有同名目录')
    }
    const maxSortOrder = directories.value.reduce((max, directory) => Math.max(max, directory.sort_order), 0)
    const { data, error: err } = await supabase
      .from('knowledge_directories')
      .insert({
        user_id: auth.user.id,
        parent_id: parentId,
        slug: createSlug(name, directories.value.map((directory) => directory.slug), 'directory'),
        name,
        sort_order: maxSortOrder + 10,
      })
      .select()
      .single()
    if (err) throw err
    directories.value = sortDirectories([...directories.value, data as KnowledgeDirectory])
    return data as KnowledgeDirectory
  }

  async function updateDirectory(id: string, input: KnowledgeDirectoryInput) {
    const name = input.name.trim()
    if (!name) throw new Error('请填写目录名称')
    const target = directories.value.find((directory) => directory.id === id)
    const parentId = target?.parent_id ?? null
    if (directories.value.some((directory) =>
      directory.id !== id && (directory.parent_id ?? null) === parentId && directory.name.toLowerCase() === name.toLowerCase(),
    )) {
      throw new Error('同一目录下已有同名目录')
    }
    const { data, error: err } = await supabase
      .from('knowledge_directories')
      .update({ name })
      .eq('id', id)
      .select()
      .single()
    if (err) throw err
    directories.value = sortDirectories(directories.value.map((directory) => (directory.id === id ? data as KnowledgeDirectory : directory)))
    return data as KnowledgeDirectory
  }

  async function deleteDirectory(id: string) {
    if (directories.value.some((directory) => directory.parent_id === id)) {
      throw new Error('请先删除该目录下的子目录')
    }
    const { error: err } = await supabase.from('knowledge_directories').delete().eq('id', id)
    if (err) throw err
    directories.value = directories.value.filter((directory) => directory.id !== id)
  }

  async function createArticle(input: KnowledgeArticleInput) {
    const auth = useAuthStore()
    if (!auth.user) throw new Error('未登录')
    const { data, error: err } = await supabase
      .from('knowledge_articles')
      .insert({ ...input, user_id: auth.user.id })
      .select()
      .single()
    if (err) throw err
    articles.value = sortArticles([data, ...articles.value])
    return data
  }

  async function updateArticle(id: string, input: Partial<KnowledgeArticleInput>) {
    const { data, error: err } = await supabase
      .from('knowledge_articles')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (err) throw err
    const idx = articles.value.findIndex((article) => article.id === id)
    if (idx !== -1) {
      articles.value[idx] = data
      articles.value = sortArticles(articles.value)
    }
    return data
  }

  async function deleteArticle(id: string) {
    const { error: err } = await supabase.from('knowledge_articles').delete().eq('id', id)
    if (err) throw err
    articles.value = articles.value.filter((article) => article.id !== id)
  }

  async function togglePinned(id: string) {
    const target = articles.value.find((article) => article.id === id)
    if (!target) return
    await updateArticle(id, { is_pinned: !target.is_pinned })
  }

  return {
    articles,
    categories,
    directories,
    loading,
    categoriesLoading,
    directoriesLoading,
    error,
    categoryError,
    directoryError,
    fetchCategories,
    fetchDirectories,
    fetchArticles,
    createCategory,
    updateCategory,
    deleteCategory,
    createDirectory,
    updateDirectory,
    deleteDirectory,
    createArticle,
    updateArticle,
    deleteArticle,
    togglePinned,
  }
})

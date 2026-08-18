import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type { KnowledgeArticle, KnowledgeArticleInput } from './types'

export const useKnowledgeStore = defineStore('knowledge', () => {
  /** 笔记列表（置顶优先，其余按 updated_at 倒序） */
  const articles = ref<KnowledgeArticle[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  /** 已加载数据的用户 id：同一用户页面切换不重复全量拉取 */
  let articlesLoadedUserId: string | undefined

  /** 笔记排序：置顶在前，其余按 updated_at 倒序（ISO 字符串字典序即时间序） */
  function sortArticles(list: KnowledgeArticle[]): KnowledgeArticle[] {
    return [...list].sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
      return b.updated_at.localeCompare(a.updated_at)
    })
  }

  /** 拉取笔记列表；返回是否成功（供调用方做刷新提示等） */
  async function fetchArticles(force = false): Promise<boolean> {
    const auth = useAuthStore()
    if (!auth.user) return false
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
    const idx = articles.value.findIndex((a) => a.id === id)
    if (idx !== -1) {
      articles.value[idx] = data
      // 置顶状态可能变化，替换后重排以维持 置顶优先 + 时间倒序
      articles.value = sortArticles(articles.value)
    }
    return data
  }

  async function deleteArticle(id: string) {
    const { error: err } = await supabase.from('knowledge_articles').delete().eq('id', id)
    if (err) throw err
    articles.value = articles.value.filter((a) => a.id !== id)
  }

  /** 切换置顶（列表内快捷操作，无需打开编辑） */
  async function togglePinned(id: string) {
    const target = articles.value.find((a) => a.id === id)
    if (!target) return
    await updateArticle(id, { is_pinned: !target.is_pinned })
  }

  return {
    articles,
    loading,
    error,
    fetchArticles,
    createArticle,
    updateArticle,
    deleteArticle,
    togglePinned,
  }
})

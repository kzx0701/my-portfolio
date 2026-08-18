<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { BookOpen, FileText, Pin, PinOff, Plus, RotateCw, Search } from '@lucide/vue'
import { Badge, Button, Input, Skeleton } from '@/components/ui'
import { useKnowledgeStore } from '@/modules/knowledge/store'
import {
  ArticleDeleteDialog,
  ArticleFormDialog,
  ArticleViewDialog,
} from '@/modules/knowledge/components'
import {
  CATEGORY_META,
  categoryMeta,
  type KnowledgeArticle,
  type KnowledgeArticleInput,
} from '@/modules/knowledge/types'
import { toast } from '@/lib/toast'

const store = useKnowledgeStore()

/** 关键词搜索（匹配标题 / 正文 / 标签） */
const searchText = ref('')
/** 分类筛选：'all' 表示全部 */
const categoryFilter = ref<'all' | string>('all')

const formOpen = ref(false)
const editingArticle = ref<KnowledgeArticle | null>(null)
const viewingArticle = ref<KnowledgeArticle | null>(null)
const deleteTarget = ref<KnowledgeArticle | null>(null)
const submitting = ref(false)
const deleting = ref(false)
const refreshing = ref(false)

onMounted(() => {
  store.fetchArticles()
})

/** 分类筛选选项（全部 + 已用分类） */
const categoryOptions = computed(() => {
  const used = new Set<string>()
  for (const a of store.articles) {
    if (a.category) used.add(a.category)
  }
  return ['all', ...used]
})

/** 前端过滤：关键词 + 分类；归档默认隐藏（避免列表被旧内容淹没） */
const filteredArticles = computed(() => {
  const kw = searchText.value.trim().toLowerCase()
  return store.articles.filter((a) => {
    if (a.is_archived) return false
    if (categoryFilter.value !== 'all' && a.category !== categoryFilter.value) return false
    if (!kw) return true
    return (
      a.title.toLowerCase().includes(kw) ||
      a.content.toLowerCase().includes(kw) ||
      a.tags.some((t) => t.toLowerCase().includes(kw))
    )
  })
})

/** 列表空态：完全无数据（引导新建） vs 筛选无结果 */
const isEmpty = computed(() => store.articles.length === 0)

/** 正文摘要：去掉 Markdown 符号后取前 60 字 */
function excerpt(content: string): string {
  const plain = content
    .replace(/```[\s\S]*?```/g, '[代码] ')
    .replace(/[#>*_`~[\]()!-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length > 60 ? `${plain.slice(0, 60)}…` : plain || '暂无正文内容'
}

/** 更新时间短展示：今天显示 HH:mm，今年显示 MM-DD，更早显示 YYYY-MM-DD */
function timeLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const sameYear = d.getFullYear() === now.getFullYear()
  if (sameDay) return `今天 ${pad(d.getHours())}:${pad(d.getMinutes())}`
  if (sameYear) return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

async function handleRefresh() {
  refreshing.value = true
  try {
    const ok = await store.fetchArticles(true)
    if (ok) toast('数据已刷新', 'success')
    else toast('刷新失败，请重试', 'error')
  } finally {
    refreshing.value = false
  }
}

function openCreate() {
  editingArticle.value = null
  formOpen.value = true
}

function openEdit(article: KnowledgeArticle) {
  viewingArticle.value = null
  editingArticle.value = article
  formOpen.value = true
}

function openView(article: KnowledgeArticle) {
  viewingArticle.value = article
}

async function handleTogglePinned(article: KnowledgeArticle) {
  try {
    await store.togglePinned(article.id)
    toast(article.is_pinned ? '已取消置顶' : '已置顶', 'success')
  } catch (e: any) {
    toast(e?.message ?? '操作失败', 'error')
  }
}

async function handleSubmit(input: KnowledgeArticleInput) {
  submitting.value = true
  try {
    if (editingArticle.value) {
      await store.updateArticle(editingArticle.value.id, input)
      toast('笔记已更新', 'success')
    } else {
      await store.createArticle(input)
      toast('笔记已创建', 'success')
    }
    formOpen.value = false
  } catch (e: any) {
    console.error('保存笔记失败', e)
    toast(e?.message ?? '保存失败', 'error')
  } finally {
    submitting.value = false
  }
}

async function handleDeleteConfirm() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await store.deleteArticle(deleteTarget.value.id)
    deleteTarget.value = null
    viewingArticle.value = null
    toast('笔记已删除', 'success')
  } catch (e: any) {
    console.error('删除笔记失败', e)
    toast(e?.message ?? '删除失败', 'error')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-6">
    <!-- 标题区（logo 与首页卡片同 viewTransitionName，实现 VT 共享元素 morphing） -->
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-teal-500 text-white shadow-md shadow-sky-500/25"
          :style="{ viewTransitionName: 'vt-knowledge' }"
        >
          <BookOpen class="h-5 w-5" />
        </div>
        <div>
          <h2 class="text-lg font-semibold">笔记列表</h2>
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <Button variant="outline" :disabled="store.loading || refreshing" @click="handleRefresh">
          <RotateCw class="h-4 w-4" :class="refreshing && 'animate-spin'" />
          刷新
        </Button>
        <Button @click="openCreate">
          <Plus class="h-4 w-4" />
          新建笔记
        </Button>
      </div>
    </div>

    <!-- 工具栏：搜索 + 分类筛选 -->
    <div class="flex flex-wrap items-center gap-3">
      <div class="relative w-full max-w-xs">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input v-model="searchText" class="pl-9" placeholder="搜索标题、正文、标签…" />
      </div>
      <div class="flex flex-wrap items-center gap-1.5">
        <button
          v-for="c in categoryOptions"
          :key="c"
          class="rounded-full border px-3 py-1 text-xs transition-colors"
          :class="
            categoryFilter === c
              ? 'border-transparent bg-primary text-primary-foreground'
              : 'border-border text-muted-foreground hover:text-foreground'
          "
          @click="categoryFilter = c"
        >
          {{ c === 'all' ? '全部' : CATEGORY_META[c]?.label ?? c }}
        </button>
      </div>
    </div>

    <!-- 列表 -->
    <div v-if="store.loading && store.articles.length === 0" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Skeleton v-for="i in 6" :key="i" class="h-40 rounded-xl" />
    </div>
    <div v-else-if="store.error && store.articles.length === 0" class="rounded-lg border border-destructive/50 p-6 text-center text-sm text-destructive">
      加载失败：{{ store.error }}
    </div>
    <div v-else-if="isEmpty" class="rounded-lg border border-dashed py-16 text-center">
      <FileText class="mx-auto h-10 w-10 text-muted-foreground/60" />
      <p class="mt-3 font-medium">还没有笔记</p>
      <p class="mt-1 text-sm text-muted-foreground">记录开发心得、踩坑经验、知识沉淀，随时检索</p>
      <Button class="mt-4" @click="openCreate">
        <Plus class="h-4 w-4" />
        写第一篇笔记
      </Button>
    </div>
    <div v-else class="animate-in grid gap-4 fade-in slide-in-from-bottom-2 [animation-duration:400ms] sm:grid-cols-2 lg:grid-cols-3">
      <button
        v-for="a in filteredArticles"
        :key="a.id"
        class="group relative flex flex-col overflow-hidden rounded-xl border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        @click="openView(a)"
      >
        <div class="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-sky-400 to-teal-500 opacity-0 transition-opacity group-hover:opacity-100" />
        <div class="flex items-start justify-between gap-2">
          <Badge variant="outline" :class="categoryMeta(a.category).badgeClass">
            {{ categoryMeta(a.category).label }}
          </Badge>
          <span
            role="button"
            class="shrink-0 text-muted-foreground transition-colors hover:text-amber-600"
            :title="a.is_pinned ? '取消置顶' : '置顶'"
            @click.stop="handleTogglePinned(a)"
          >
            <Pin v-if="a.is_pinned" class="h-4 w-4 fill-amber-500 text-amber-500" />
            <PinOff v-else class="h-4 w-4" />
          </span>
        </div>
        <h3 class="mt-3 line-clamp-2 font-semibold leading-snug group-hover:text-primary">{{ a.title }}</h3>
        <p class="mt-1.5 line-clamp-2 flex-1 text-sm text-muted-foreground">{{ excerpt(a.content) }}</p>
        <div class="mt-3 flex items-center justify-between gap-2">
          <div v-if="a.tags.length > 0" class="flex min-w-0 flex-wrap gap-1">
            <Badge v-for="tag in a.tags.slice(0, 3)" :key="tag" variant="secondary" class="text-xs font-normal">
              {{ tag }}
            </Badge>
          </div>
          <span v-else />
          <span class="shrink-0 text-xs text-muted-foreground tabular-nums">{{ timeLabel(a.updated_at) }}</span>
        </div>
      </button>
    </div>

    <p v-if="!isEmpty && filteredArticles.length === 0" class="py-10 text-center text-sm text-muted-foreground">
      没有符合筛选条件的笔记
    </p>

    <!-- 阅读弹窗 -->
    <ArticleViewDialog
      :open="viewingArticle !== null"
      :article="viewingArticle"
      @update:open="(v) => !v && (viewingArticle = null)"
      @edit="viewingArticle && openEdit(viewingArticle)"
      @remove="viewingArticle && (deleteTarget = viewingArticle)"
    />

    <!-- 新建/编辑弹窗 -->
    <ArticleFormDialog
      v-model:open="formOpen"
      :article="editingArticle"
      :submitting="submitting"
      @submit="handleSubmit"
    />

    <!-- 删除确认弹窗 -->
    <ArticleDeleteDialog
      :open="deleteTarget !== null"
      :article-title="deleteTarget?.title"
      :deleting="deleting"
      @update:open="(v) => !v && (deleteTarget = null)"
      @confirm="handleDeleteConfirm"
    />
  </div>
</template>

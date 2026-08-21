<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowRight, BookOpen, FolderTree, Plus } from '@lucide/vue'
import { Badge, Button, Card, Skeleton } from '@/components/ui'
import { useKnowledgeStore } from '@/modules/knowledge/store'
import { ArticleFormDialog, KnowledgeStatsCards } from '@/modules/knowledge/components'
import { categoryMeta, directoryPath, type KnowledgeArticleInput } from '@/modules/knowledge/types'
import { toast } from '@/lib/toast'

const store = useKnowledgeStore()

/** 仪表盘数据是否加载完成（加载完成前显示骨架，避免误闪空态） */
const loaded = ref(false)

const formOpen = ref(false)
const submitting = ref(false)

onMounted(async () => {
  await Promise.all([store.fetchArticles()])
  loaded.value = true
})

/** 最近更新笔记（最多 6 条，未归档） */
const recentArticles = computed(() => store.articles.filter((a) => !a.is_archived).slice(0, 6))

/** 是否完全无数据（引导写笔记） */
const isEmpty = computed(() => store.articles.length === 0)

/** 更新时间短展示（与列表页一致） */
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

async function handleCreate(input: KnowledgeArticleInput) {
  submitting.value = true
  try {
    await store.createArticle(input)
    toast('笔记已创建', 'success')
    formOpen.value = false
  } catch (e: any) {
    console.error('创建笔记失败', e)
    toast(e?.message ?? '创建失败', 'error')
  } finally {
    submitting.value = false
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
          <h2 class="text-lg font-semibold">仪表盘</h2>
        </div>
      </div>
      <Button class="shrink-0" @click="formOpen = true">
        <Plus class="h-4 w-4" />
        新建笔记
      </Button>
    </div>

    <!-- 加载中：骨架屏 -->
    <template v-if="!loaded">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton v-for="i in 4" :key="i" class="h-[104px] rounded-xl" />
      </div>
      <div class="grid items-start gap-4 lg:grid-cols-3">
        <Skeleton class="h-[360px] rounded-lg lg:col-span-2" />
        <Skeleton class="h-[360px] rounded-lg" />
      </div>
    </template>

    <!-- 加载完成 -->
    <template v-else>
      <!-- 完全无数据：引导 -->
      <Card
        v-if="isEmpty"
        class="flex animate-in flex-col items-center justify-center gap-4 border-dashed py-20 text-center fade-in [animation-duration:400ms]"
      >
        <BookOpen class="h-12 w-12 text-muted-foreground/60" />
        <div class="space-y-1">
          <p class="font-medium">知识库还是空的</p>
          <p class="text-sm text-muted-foreground">记录开发心得、踩坑经验与常用工具，形成你的专属知识库</p>
        </div>
        <div class="flex gap-3">
          <Button @click="formOpen = true">
            <Plus class="h-4 w-4" />
            写第一篇笔记
          </Button>
        </div>
      </Card>

      <template v-else>
        <!-- 统计卡（首块先入场） -->
        <div class="animate-in fade-in slide-in-from-bottom-2 [animation-duration:400ms]">
          <KnowledgeStatsCards />
        </div>

        <!-- 主区：最近更新 -->
        <div class="animate-in fade-in slide-in-from-bottom-2 [animation-duration:400ms] [animation-delay:80ms]">
          <div class="rounded-lg border p-4">
            <div class="mb-3 flex items-center justify-between">
              <h3 class="text-sm font-semibold">最近更新</h3>
              <RouterLink
                to="/knowledge/articles"
                class="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
              >
                查看全部
                <ArrowRight class="h-3.5 w-3.5" />
              </RouterLink>
            </div>
            <ul v-if="recentArticles.length > 0" class="divide-y">
              <li
                v-for="a in recentArticles"
                :key="a.id"
                class="flex items-center gap-3 py-2.5 text-sm"
              >
                <Badge variant="outline" :class="categoryMeta(a.category, store.categories).badgeClass" class="shrink-0">
                  {{ categoryMeta(a.category, store.categories).label }}
                </Badge>
                <span class="min-w-0 flex-1 truncate font-medium">{{ a.title }}</span>
                <span v-if="a.directory_id" class="hidden max-w-40 items-center gap-1 truncate text-xs text-muted-foreground sm:inline-flex">
                  <FolderTree class="h-3 w-3 shrink-0" />
                  {{ directoryPath(a.directory_id, store.directories) }}
                </span>
                <span class="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {{ timeLabel(a.updated_at) }}
                </span>
              </li>
            </ul>
            <p v-else class="py-8 text-center text-sm text-muted-foreground">暂无笔记</p>
          </div>
        </div>
      </template>
    </template>

    <!-- 新建笔记弹窗 -->
    <ArticleFormDialog
      v-model:open="formOpen"
      :categories="store.categories"
      :directories="store.directories"
      :submitting="submitting"
      @submit="handleCreate"
    />
  </div>
</template>

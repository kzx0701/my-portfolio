<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CalendarDays, Folder, Maximize2, Minimize2, MonitorUp, Pin, Pencil, Trash2 } from '@lucide/vue'
import { Badge, Button, Dialog } from '@/components/ui'
import { renderMarkdown } from '@/lib/markdown'
import { categoryMeta, directoryPath, type KnowledgeArticle, type KnowledgeCategory, type KnowledgeDirectory } from '@/modules/knowledge/types'

const props = defineProps<{
  open: boolean
  article?: KnowledgeArticle | null
  categories?: KnowledgeCategory[]
  directories?: KnowledgeDirectory[]
  /** 演示舞台由父页面承载；此时预览降级为非模态，避免锁住舞台交互。 */
  presentationActive?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  edit: []
  remove: []
  present: [article: KnowledgeArticle]
}>()

/** 关闭动画期间保留最后一篇文章，避免父组件先清空 article 导致弹窗高度塌缩闪烁。 */
const displayedArticle = ref<KnowledgeArticle | null>(null)
watch(
  () => [props.open, props.article] as const,
  ([open, article]) => {
    if (open && article) displayedArticle.value = article
  },
  { immediate: true },
)

const category = computed(() => categoryMeta(displayedArticle.value?.category ?? null, props.categories))
const directory = computed(() => directoryPath(displayedArticle.value?.directory_id ?? null, props.directories))
const isFullscreen = ref(false)

function handleOpenChange(open: boolean) {
  if (!open) isFullscreen.value = false
  emit('update:open', open)
}

/** 更新时间展示（YYYY-MM-DD HH:mm） */
const updatedLabel = computed(() => {
  const t = displayedArticle.value?.updated_at
  if (!t) return ''
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return t
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
})
</script>

<template>
  <Dialog
    :open="open"
    :modal="!presentationActive"
    :class="isFullscreen ? 'h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)]' : 'max-w-3xl'"
    @update:open="handleOpenChange"
  >
    <div v-if="displayedArticle" class="flex h-full min-h-0 flex-col">
      <div class="mb-4 flex shrink-0 items-start gap-3 pr-9">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <Badge variant="outline" :class="category.badgeClass">{{ category.label }}</Badge>
            <span v-if="displayedArticle.is_pinned" class="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <Pin class="h-3 w-3" />
              置顶
            </span>
            <span class="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays class="h-3 w-3" />
              {{ updatedLabel }}
            </span>
            <span class="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Folder class="h-3 w-3" />
              {{ directory }}
            </span>
          </div>
          <h2 class="mt-2 text-xl font-semibold leading-snug">{{ displayedArticle.title }}</h2>
        </div>
        <div class="flex shrink-0 items-center gap-1">
          <Button type="button" variant="outline" size="sm" @click="emit('present', displayedArticle)">
            <MonitorUp class="h-3.5 w-3.5" />
            演示
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="text-muted-foreground"
            :title="isFullscreen ? '退出放大阅读' : '放大阅读'"
            :aria-label="isFullscreen ? '退出放大阅读' : '放大阅读'"
            @click="isFullscreen = !isFullscreen"
          >
            <Minimize2 v-if="isFullscreen" class="h-4 w-4" />
            <Maximize2 v-else class="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        class="markdown-body min-h-0 flex-1 overflow-y-auto rounded-lg border bg-muted/20 p-5"
        :class="isFullscreen ? 'max-h-none' : 'max-h-[55vh]'"
        v-html="renderMarkdown(displayedArticle.content)"
      />

      <div class="mt-5 flex shrink-0 justify-end gap-2">
        <Button type="button" variant="destructive" @click="emit('remove')">
          <Trash2 class="h-4 w-4" />
          删除
        </Button>
        <Button type="button" @click="emit('edit')">
          <Pencil class="h-4 w-4" />
          编辑
        </Button>
      </div>
    </div>
  </Dialog>
</template>

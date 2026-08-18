<script setup lang="ts">
import { computed } from 'vue'
import { CalendarDays, Pin, Pencil, Tags, Trash2 } from '@lucide/vue'
import { Badge, Button, Dialog } from '@/components/ui'
import { renderMarkdown } from '@/lib/markdown'
import { categoryMeta, type KnowledgeArticle } from '@/modules/knowledge/types'

const props = defineProps<{
  open: boolean
  article?: KnowledgeArticle | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  edit: []
  remove: []
}>()

const category = computed(() => categoryMeta(props.article?.category ?? null))

/** 更新时间展示（YYYY-MM-DD HH:mm） */
const updatedLabel = computed(() => {
  const t = props.article?.updated_at
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
    class="max-w-3xl"
    @update:open="emit('update:open', $event)"
  >
    <div v-if="article">
      <div class="mb-4">
        <div class="flex flex-wrap items-center gap-2">
          <Badge variant="outline" :class="category.badgeClass">{{ category.label }}</Badge>
          <span v-if="article.is_pinned" class="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
            <Pin class="h-3 w-3" />
            置顶
          </span>
          <span class="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays class="h-3 w-3" />
            {{ updatedLabel }}
          </span>
        </div>
        <h2 class="mt-2 text-xl font-semibold leading-snug">{{ article.title }}</h2>
        <div v-if="article.tags.length > 0" class="mt-2 flex flex-wrap items-center gap-1.5">
          <Tags class="h-3.5 w-3.5 text-muted-foreground" />
          <Badge
            v-for="tag in article.tags"
            :key="tag"
            variant="secondary"
            class="text-xs font-normal"
          >
            {{ tag }}
          </Badge>
        </div>
      </div>

      <div class="markdown-body max-h-[55vh] overflow-y-auto rounded-lg border bg-muted/20 p-5" v-html="renderMarkdown(article.content)" />

      <div class="mt-5 flex justify-end gap-2">
        <Button type="button" variant="outline" @click="emit('remove')">
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

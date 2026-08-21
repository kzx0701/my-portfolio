<script setup lang="ts">
import { ref, watch } from 'vue'
import { Check, Pencil, Plus, Settings2, Trash2, X } from '@lucide/vue'
import { Button, Dialog, Input, Label } from '@/components/ui'
import KnowledgeColorPicker from './KnowledgeColorPicker.vue'
import {
  categoryDotClass,
  type KnowledgeCategory,
  type KnowledgeCategoryInput,
} from '@/modules/knowledge/types'

const props = defineProps<{
  open: boolean
  categories: KnowledgeCategory[]
  articleCountByCategory?: Record<string, number>
  submitting?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  create: [input: KnowledgeCategoryInput]
  update: [id: string, input: KnowledgeCategoryInput]
  remove: [id: string]
}>()

const newName = ref('')
const newColor = ref('sky')
const editingId = ref<string | null>(null)
const editingName = ref('')
const editingColor = ref('sky')

watch(
  () => props.open,
  (open) => {
    if (open) {
      newName.value = ''
      newColor.value = 'sky'
      editingId.value = null
    }
  },
)

function usageCount(slug: string): number {
  return props.articleCountByCategory?.[slug] ?? 0
}

function handleCreate() {
  if (!newName.value.trim()) return
  emit('create', { name: newName.value.trim(), color: newColor.value })
}

function startEdit(category: KnowledgeCategory) {
  editingId.value = category.id
  editingName.value = category.name
  editingColor.value = category.color
}

function cancelEdit() {
  editingId.value = null
}

function saveEdit() {
  if (!editingId.value || !editingName.value.trim()) return
  emit('update', editingId.value, { name: editingName.value.trim(), color: editingColor.value })
}
</script>

<template>
  <Dialog
    :open="open"
    title="分类标签"
    description="分类是知识文件的标签，用来描述内容属于什么类型；目录负责决定文件放在哪里。"
    class="max-w-2xl"
    @update:open="emit('update:open', $event)"
  >
    <div class="space-y-5">
      <form class="rounded-xl border bg-muted/20 p-4" @submit.prevent="handleCreate">
        <div class="mb-3 flex items-center gap-2">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Plus class="h-4 w-4" />
          </div>
          <div>
            <p class="text-sm font-semibold">新增分类标签</p>
            <p class="text-xs text-muted-foreground">例如：前端、读书、方法论、待整理</p>
          </div>
        </div>
        <div class="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <div class="space-y-1.5">
            <Label for="new-category-name" class="text-xs">标签名称</Label>
            <Input id="new-category-name" v-model="newName" placeholder="输入一个分类标签" />
          </div>
          <div class="space-y-1.5">
            <Label class="text-xs">标记颜色</Label>
            <KnowledgeColorPicker v-model="newColor" />
          </div>
          <Button type="submit" :disabled="submitting || !newName.trim()">添加标签</Button>
        </div>
      </form>

      <div>
        <div class="mb-2 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Settings2 class="h-4 w-4 text-muted-foreground" />
            <p class="text-sm font-semibold">已有分类标签</p>
          </div>
          <span class="text-xs tabular-nums text-muted-foreground">{{ categories.length }} 个</span>
        </div>

        <div v-if="categories.length > 0" class="divide-y rounded-xl border">
          <div v-for="category in categories" :key="category.id" class="flex min-h-14 flex-wrap items-center gap-3 px-4 py-3">
            <template v-if="editingId === category.id">
              <div class="h-3 w-3 shrink-0 rounded-full" :class="categoryDotClass(editingColor)" />
              <Input v-model="editingName" class="h-8 min-w-0 flex-1" @keydown.enter.prevent="saveEdit" />
              <KnowledgeColorPicker v-model="editingColor" compact />
              <button type="button" class="rounded-md p-1.5 text-emerald-600 transition-colors hover:bg-emerald-500/10" title="保存" @click="saveEdit">
                <Check class="h-4 w-4" />
              </button>
              <button type="button" class="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted" title="取消" @click="cancelEdit">
                <X class="h-4 w-4" />
              </button>
            </template>
            <template v-else>
              <div class="h-3 w-3 shrink-0 rounded-full" :class="categoryDotClass(category.color)" />
              <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ category.name }}</span>
              <span class="w-14 text-right text-xs tabular-nums text-muted-foreground">{{ usageCount(category.slug) }} 篇</span>
              <button type="button" class="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" title="编辑标签" @click="startEdit(category)">
                <Pencil class="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                class="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-30"
                :disabled="submitting || usageCount(category.slug) > 0"
                :title="usageCount(category.slug) > 0 ? '请先移除该标签下的知识文件' : '删除标签'"
                @click="emit('remove', category.id)"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </template>
          </div>
        </div>
        <div v-else class="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">还没有分类标签，从上方创建你的第一个标签。</div>
        <p class="mt-3 text-xs leading-relaxed text-muted-foreground">分类标签是扁平的内容属性，不负责目录层级；一个文件当前支持一个分类标签和一个所在目录。</p>
      </div>
    </div>
  </Dialog>
</template>

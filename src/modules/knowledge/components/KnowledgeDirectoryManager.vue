<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, ChevronRight, Folder, FolderPlus, Pencil, Trash2, X } from '@lucide/vue'
import { Button, Dialog, Input, Label, Select } from '@/components/ui'
import type { KnowledgeDirectory, KnowledgeDirectoryInput } from '@/modules/knowledge/types'

const props = defineProps<{
  open: boolean
  directories: KnowledgeDirectory[]
  articleCountByDirectory?: Record<string, number>
  submitting?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  create: [input: KnowledgeDirectoryInput]
  update: [id: string, input: KnowledgeDirectoryInput]
  remove: [id: string]
}>()

const ROOT_DIRECTORY_VALUE = '__root__'
const newName = ref('')
const newParentId = ref(ROOT_DIRECTORY_VALUE)
const editingId = ref<string | null>(null)
const editingName = ref('')

const rootDirectories = computed(() => props.directories.filter((directory) => !directory.parent_id))
const parentOptions = computed(() => [
  { value: ROOT_DIRECTORY_VALUE, label: '根目录' },
  ...rootDirectories.value.map((directory) => ({ value: directory.id, label: directory.name })),
])
const treeItems = computed(() => rootDirectories.value.flatMap((root) => [
  { directory: root, depth: 0 },
  ...props.directories
    .filter((directory) => directory.parent_id === root.id)
    .map((directory) => ({ directory, depth: 1 })),
]))

watch(
  () => props.open,
  (open) => {
    if (open) {
      newName.value = ''
      newParentId.value = ROOT_DIRECTORY_VALUE
      editingId.value = null
    }
  },
)

function usageCount(id: string): number {
  return props.articleCountByDirectory?.[id] ?? 0
}

function childCount(id: string): number {
  return props.directories.filter((directory) => directory.parent_id === id).length
}

function handleCreate() {
  if (!newName.value.trim()) return
  emit('create', {
    name: newName.value.trim(),
    parent_id: newParentId.value === ROOT_DIRECTORY_VALUE ? null : newParentId.value,
  })
}

function startEdit(directory: KnowledgeDirectory) {
  editingId.value = directory.id
  editingName.value = directory.name
}

function saveEdit() {
  if (!editingId.value || !editingName.value.trim()) return
  emit('update', editingId.value, { name: editingName.value.trim() })
}
</script>

<template>
  <Dialog
    :open="open"
    title="目录配置"
    description="目录决定知识文件的所在位置，支持根目录和一级子目录。"
    class="max-w-2xl"
    @update:open="emit('update:open', $event)"
  >
    <div class="space-y-5">
      <form class="rounded-xl border bg-muted/20 p-4" @submit.prevent="handleCreate">
        <div class="mb-3 flex items-center gap-2">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FolderPlus class="h-4 w-4" />
          </div>
          <div>
            <p class="text-sm font-semibold">新建目录</p>
            <p class="text-xs text-muted-foreground">例如：工作资料 / 项目复盘</p>
          </div>
        </div>
        <div class="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <div class="space-y-1.5">
            <Label for="new-directory-name" class="text-xs">目录名称</Label>
            <Input id="new-directory-name" v-model="newName" placeholder="输入目录名称" />
          </div>
          <div class="space-y-1.5">
            <Label for="new-directory-parent" class="text-xs">父级目录</Label>
            <Select id="new-directory-parent" v-model="newParentId" :options="parentOptions" class="w-32" />
          </div>
          <Button type="submit" :disabled="submitting || !newName.trim()">创建目录</Button>
        </div>
      </form>

      <div>
        <div class="mb-2 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Folder class="h-4 w-4 text-muted-foreground" />
            <p class="text-sm font-semibold">已有目录</p>
          </div>
          <span class="text-xs tabular-nums text-muted-foreground">{{ directories.length }} 个</span>
        </div>

        <div v-if="treeItems.length > 0" class="divide-y rounded-xl border">
          <div
            v-for="item in treeItems"
            :key="item.directory.id"
            class="flex min-h-14 flex-wrap items-center gap-3 py-3 pr-4"
            :class="item.depth === 1 ? 'pl-10' : 'pl-4'"
          >
            <ChevronRight v-if="item.depth === 1" class="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
            <template v-if="editingId === item.directory.id">
              <Folder class="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input v-model="editingName" class="h-8 min-w-0 flex-1" @keydown.enter.prevent="saveEdit" />
              <button type="button" class="rounded-md p-1.5 text-emerald-600 transition-colors hover:bg-emerald-500/10" title="保存" @click="saveEdit">
                <Check class="h-4 w-4" />
              </button>
              <button type="button" class="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted" title="取消" @click="editingId = null">
                <X class="h-4 w-4" />
              </button>
            </template>
            <template v-else>
              <Folder class="h-4 w-4 shrink-0 text-muted-foreground" />
              <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ item.directory.name }}</span>
              <span v-if="item.depth === 0" class="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70">根目录</span>
              <span class="w-14 text-right text-xs tabular-nums text-muted-foreground">{{ usageCount(item.directory.id) }} 篇</span>
              <button type="button" class="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" title="编辑目录" @click="startEdit(item.directory)">
                <Pencil class="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                class="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-30"
                :disabled="submitting || usageCount(item.directory.id) > 0 || childCount(item.directory.id) > 0"
                :title="childCount(item.directory.id) > 0 ? '请先删除子目录' : usageCount(item.directory.id) > 0 ? '请先移除目录中的知识文件' : '删除目录'"
                @click="emit('remove', item.directory.id)"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </template>
          </div>
        </div>
        <div v-else class="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">还没有目录，从上方创建你的第一个根目录。</div>
        <p class="mt-3 text-xs leading-relaxed text-muted-foreground">目录最多支持两级；知识文件可以不放入任何目录，届时会显示为“未归档目录”。</p>
      </div>
    </div>
  </Dialog>
</template>

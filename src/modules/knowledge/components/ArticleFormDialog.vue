<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import {
  Bold,
  Code2,
  Eye,
  Folder,
  Heading1,
  Heading2,
  Italic,
  Link2,
  List as ListIcon,
  ListOrdered,
  Minus,
  PenLine,
  Pin,
  Quote,
  SplitSquareHorizontal,
  Tag,
} from '@lucide/vue'
import { Button, Dialog, Input, Label, Select } from '@/components/ui'
import { renderMarkdown } from '@/lib/markdown'
import { toast } from '@/lib/toast'
import {
  categoryOptions,
  directoryOptions,
  type KnowledgeArticle,
  type KnowledgeArticleInput,
  type KnowledgeCategory,
  type KnowledgeDirectory,
} from '@/modules/knowledge/types'

const props = defineProps<{
  open: boolean
  /** 传入笔记则为编辑，否则为新建 */
  article?: KnowledgeArticle | null
  categories: KnowledgeCategory[]
  directories: KnowledgeDirectory[]
  submitting?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [input: KnowledgeArticleInput]
}>()

type EditorMode = 'write' | 'preview' | 'split'

const form = reactive<KnowledgeArticleInput>({
  title: '',
  category: null,
  directory_id: null,
  tags: [],
  content: '',
  is_pinned: false,
  is_archived: false,
})

const editorMode = ref<EditorMode>('write')
const editorRef = ref<HTMLTextAreaElement | null>(null)
const isComposing = ref(false)
const NO_DIRECTORY_VALUE = '__no_directory__'
const directorySelection = ref(NO_DIRECTORY_VALUE)

const characterCount = computed(() => form.content.length)
const lineCount = computed(() => (form.content ? form.content.split('\n').length : 0))
const categorySelectOptions = computed(() => categoryOptions(props.categories))
const directorySelectOptions = computed(() => [
  { value: NO_DIRECTORY_VALUE, label: '未归档目录' },
  ...directoryOptions(props.directories),
])

watch(
  () => props.open,
  (open) => {
    if (open) {
      form.title = props.article?.title ?? ''
      form.category = props.article?.category ?? null
      form.directory_id = props.article?.directory_id ?? null
      form.content = props.article?.content ?? ''
      form.is_pinned = props.article?.is_pinned ?? false
      form.is_archived = props.article?.is_archived ?? false
      directorySelection.value = props.article?.directory_id ?? NO_DIRECTORY_VALUE
      form.tags = props.article?.tags ?? []
      editorMode.value = 'write'
      focusEditorAtStart()
    }
  },
)

function focusEditor() {
  nextTick(() => editorRef.value?.focus())
}

/** 每次打开编辑器从文档开头开始，避免沿用上次的光标/滚动位置。 */
function focusEditorAtStart() {
  nextTick(() => {
    const editor = editorRef.value
    if (!editor) return
    editor.focus()
    editor.setSelectionRange(0, 0)
    editor.scrollTop = 0
  })
}

/** 在当前光标处插入 Markdown 片段，并尽量保留选区体验 */
function insertMarkdown(before: string, after = '', placeholder = '文本') {
  const editor = editorRef.value
  if (!editor) return

  const start = editor.selectionStart
  const end = editor.selectionEnd
  const selected = form.content.slice(start, end) || placeholder
  form.content = `${form.content.slice(0, start)}${before}${selected}${after}${form.content.slice(end)}`
  nextTick(() => {
    editor.focus()
    const nextStart = start + before.length
    editor.setSelectionRange(nextStart, nextStart + selected.length)
  })
}

function insertLinePrefix(prefix: string) {
  const editor = editorRef.value
  if (!editor) return

  const start = editor.selectionStart
  const lineStart = form.content.lastIndexOf('\n', start - 1) + 1
  form.content = `${form.content.slice(0, lineStart)}${prefix}${form.content.slice(lineStart)}`
  nextTick(() => {
    editor.focus()
    editor.setSelectionRange(start + prefix.length, start + prefix.length)
  })
}

function insertLink() {
  const editor = editorRef.value
  if (!editor) return
  const selected = form.content.slice(editor.selectionStart, editor.selectionEnd) || '链接文字'
  insertMarkdown('[', '](https://)', selected)
}

function handleEditorKeydown(event: KeyboardEvent) {
  if (isComposing.value) return
  const modifier = event.metaKey || event.ctrlKey
  if (!modifier) return

  const key = event.key.toLowerCase()
  const actions: Record<string, () => void> = {
    b: () => insertMarkdown('**', '**'),
    i: () => insertMarkdown('*', '*'),
    k: insertLink,
  }
  if (actions[key]) {
    event.preventDefault()
    actions[key]()
  }
}

function handleSubmit() {
  const title = form.title.trim()
  const content = form.content.trim()
  if (!title) {
    toast('请填写知识文件标题', 'error')
    return
  }
  if (!content) {
    toast('请先写一点正文内容', 'error')
    focusEditor()
    return
  }

  emit('submit', {
    title,
    category: form.category || null,
    directory_id: directorySelection.value === NO_DIRECTORY_VALUE ? null : directorySelection.value,
    // 标签功能已从界面移除；编辑已有文件时保留历史标签，避免无意丢失数据。
    tags: form.tags,
    content: form.content,
    is_pinned: form.is_pinned,
    is_archived: form.is_archived,
  })
}
</script>

<template>
  <Dialog
    :open="open"
    :title="article ? '编辑知识文件' : '新建知识文件'"
    description="用 Markdown 记录可复用的经验、流程与思考。"
    :hide-header="true"
    class="knowledge-editor-dialog max-w-6xl overflow-hidden p-0"
    @update:open="emit('update:open', $event)"
  >
    <form class="knowledge-editor flex min-h-0 flex-col" @submit.prevent="handleSubmit">
      <div class="border-b bg-[linear-gradient(135deg,color-mix(in_oklch,var(--muted)_62%,transparent),transparent_68%)] px-6 pb-4 pt-7 sm:px-9 sm:pb-5 sm:pt-8">
        <div class="flex items-center gap-2 pr-10 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <span>知识文件</span>
          <span class="h-1 w-1 rounded-full bg-muted-foreground/50" />
          <span>{{ article ? '编辑中' : '新草稿' }}</span>
        </div>
        <Input
          id="article-title"
          v-model="form.title"
          class="mt-3 h-auto border-0 bg-transparent px-0 py-1 text-3xl font-semibold tracking-[-0.035em] shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0 sm:text-4xl"
          placeholder="给这份知识起个标题…"
          autocomplete="off"
          required
        />
        <div class="mt-7 flex flex-wrap items-center gap-2 border-t pt-4">
          <div class="inline-flex h-9 items-center rounded-md bg-background/70 px-2 shadow-sm ring-1 ring-border/70">
            <Tag class="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
            <Label for="article-category" class="mr-1 text-xs font-medium text-muted-foreground">分类</Label>
            <Select id="article-category" v-model="form.category" :options="categorySelectOptions" placeholder="未分类" class="h-8 w-28 border-0 bg-transparent px-1 text-xs shadow-none focus:ring-0" />
          </div>
          <div class="inline-flex h-9 items-center rounded-md bg-background/70 px-2 shadow-sm ring-1 ring-border/70">
            <Folder class="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
            <Label for="article-directory" class="mr-1 text-xs font-medium text-muted-foreground">目录</Label>
            <Select id="article-directory" v-model="directorySelection" :options="directorySelectOptions" class="h-8 w-32 border-0 bg-transparent px-1 text-xs shadow-none focus:ring-0" />
          </div>
          <button
            type="button"
            class="inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold transition-colors sm:ml-auto"
            :class="form.is_pinned
              ? 'border-amber-400/50 bg-amber-500/10 text-amber-700 dark:text-amber-400'
              : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'"
            :aria-pressed="form.is_pinned"
            :title="form.is_pinned ? '取消置顶' : '置顶文件'"
            @click="form.is_pinned = !form.is_pinned"
          >
            <Pin class="h-3.5 w-3.5" :class="form.is_pinned && 'fill-amber-400 text-amber-500'" />
            置顶
          </button>
        </div>
      </div>

      <div class="flex items-center justify-between gap-3 border-b px-5 py-2.5 sm:px-7">
        <div class="flex items-center gap-1 rounded-lg bg-muted p-1" aria-label="编辑模式">
          <button type="button" class="editor-mode-button" :class="editorMode === 'write' && 'editor-mode-active'" @click="editorMode = 'write'; focusEditor()">
            <PenLine class="h-3.5 w-3.5" />
            编辑
          </button>
          <button type="button" class="editor-mode-button" :class="editorMode === 'split' && 'editor-mode-active'" @click="editorMode = 'split'; focusEditor()">
            <SplitSquareHorizontal class="h-3.5 w-3.5" />
            分栏
          </button>
          <button type="button" class="editor-mode-button" :class="editorMode === 'preview' && 'editor-mode-active'" @click="editorMode = 'preview'">
            <Eye class="h-3.5 w-3.5" />
            预览
          </button>
        </div>
        <span class="hidden text-xs text-muted-foreground sm:block">Markdown · 支持 ⌘/Ctrl + B / I / K</span>
      </div>

      <div class="editor-workspace min-h-0 flex-1" :class="editorMode === 'split' ? 'editor-workspace-split' : ''">
        <div v-if="editorMode !== 'preview'" class="editor-pane flex min-h-0 flex-1 flex-col">
          <div class="editor-toolbar flex flex-wrap items-center gap-0.5 border-b px-4 py-2 sm:px-6">
            <button type="button" class="editor-tool-button" title="粗体 (⌘/Ctrl + B)" @click="insertMarkdown('**', '**')"><Bold class="h-4 w-4" /></button>
            <button type="button" class="editor-tool-button" title="斜体 (⌘/Ctrl + I)" @click="insertMarkdown('*', '*')"><Italic class="h-4 w-4" /></button>
            <span class="mx-1 h-5 w-px bg-border" />
            <button type="button" class="editor-tool-button" title="一级标题" @click="insertLinePrefix('# ')"><Heading1 class="h-4 w-4" /></button>
            <button type="button" class="editor-tool-button" title="二级标题" @click="insertLinePrefix('## ')"><Heading2 class="h-4 w-4" /></button>
            <button type="button" class="editor-tool-button" title="引用" @click="insertLinePrefix('> ')"><Quote class="h-4 w-4" /></button>
            <span class="mx-1 h-5 w-px bg-border" />
            <button type="button" class="editor-tool-button" title="无序列表" @click="insertLinePrefix('- ')"><ListIcon class="h-4 w-4" /></button>
            <button type="button" class="editor-tool-button" title="有序列表" @click="insertLinePrefix('1. ')"><ListOrdered class="h-4 w-4" /></button>
            <button type="button" class="editor-tool-button" title="代码" @click="insertMarkdown('`', '`')"><Code2 class="h-4 w-4" /></button>
            <button type="button" class="editor-tool-button" title="链接 (⌘/Ctrl + K)" @click="insertLink"><Link2 class="h-4 w-4" /></button>
            <button type="button" class="editor-tool-button" title="分割线" @click="insertMarkdown('\n---\n', '', '')"><Minus class="h-4 w-4" /></button>
          </div>
          <textarea
            ref="editorRef"
            v-model="form.content"
            class="knowledge-textarea min-h-[280px] flex-1 resize-none bg-transparent px-5 py-5 text-[15px] leading-7 outline-none sm:px-8 sm:py-7"
            placeholder="从一个清晰的结论开始…\n\n你可以使用 Markdown 组织标题、列表、代码和引用。"
            spellcheck="false"
            @compositionstart="isComposing = true"
            @compositionend="isComposing = false"
            @keydown="handleEditorKeydown"
          />
        </div>

        <div v-if="editorMode !== 'write'" class="preview-pane min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8 sm:py-7">
          <div v-if="form.content.trim()" class="markdown-body editor-preview" v-html="renderMarkdown(form.content)" />
          <div v-else class="flex h-full min-h-[280px] items-center justify-center text-sm text-muted-foreground">预览会显示在这里</div>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-5 py-3 text-xs text-muted-foreground sm:px-7">
        <div class="flex items-center gap-3 tabular-nums">
          <span>{{ characterCount }} 字</span>
          <span>{{ lineCount }} 行</span>
        </div>
        <div class="flex items-center gap-2">
          <Button type="button" variant="outline" @click="emit('update:open', false)">取消</Button>
          <Button type="submit" :disabled="submitting">
            {{ submitting ? '保存中…' : article ? '保存修改' : '保存知识文件' }}
          </Button>
        </div>
      </div>
    </form>
  </Dialog>
</template>

<style scoped>
.knowledge-editor-dialog :deep([data-reka-dialog-content]) {
  max-height: min(90vh, 880px);
}

.knowledge-editor-dialog {
  max-height: min(90vh, 880px);
}

.knowledge-editor {
  height: min(90vh, 880px);
  max-height: min(90vh, 880px);
}

.editor-workspace {
  display: flex;
  min-height: 0;
}

.editor-workspace-split .editor-pane,
.editor-workspace-split .preview-pane {
  width: 50%;
}

.editor-workspace-split .preview-pane {
  border-left: 1px solid var(--border);
  background: color-mix(in oklch, var(--muted) 45%, transparent);
}

.editor-mode-button,
.editor-tool-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border-radius: 0.45rem;
  color: var(--muted-foreground);
  transition: background-color 150ms ease, color 150ms ease, box-shadow 150ms ease;
}

.editor-mode-button {
  min-height: 1.9rem;
  padding: 0.3rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.editor-mode-button:hover,
.editor-tool-button:hover {
  color: var(--foreground);
  background: color-mix(in oklch, var(--background) 70%, transparent);
}

.editor-mode-active {
  color: var(--foreground);
  background: var(--background);
  box-shadow: 0 1px 2px color-mix(in oklch, var(--foreground) 8%, transparent);
}

.editor-tool-button {
  height: 2rem;
  width: 2rem;
}

.knowledge-textarea::selection {
  background: color-mix(in oklch, var(--primary) 18%, transparent);
}

@media (max-width: 640px) {
  .knowledge-editor {
    height: 90vh;
    max-height: 90vh;
  }

  .editor-workspace-split {
    display: block;
    overflow-y: auto;
  }

  .editor-workspace-split .editor-pane,
  .editor-workspace-split .preview-pane {
    width: 100%;
  }

  .editor-workspace-split .editor-pane {
    min-height: 320px;
  }

  .editor-workspace-split .preview-pane {
    min-height: 240px;
    border-left: 0;
    border-top: 1px solid var(--border);
  }
}
</style>

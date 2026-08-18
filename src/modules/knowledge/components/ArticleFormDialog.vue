<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { Button, Checkbox, Dialog, Input, Label, Select, Tabs, Textarea } from '@/components/ui'
import { renderMarkdown } from '@/lib/markdown'
import { toast } from '@/lib/toast'
import { CATEGORY_OPTIONS, type KnowledgeArticle, type KnowledgeArticleInput } from '@/modules/knowledge/types'

const props = defineProps<{
  open: boolean
  /** 传入笔记则为编辑，否则为新建 */
  article?: KnowledgeArticle | null
  submitting?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [input: KnowledgeArticleInput]
}>()

const form = reactive<KnowledgeArticleInput>({
  title: '',
  category: null,
  tags: [],
  content: '',
  is_pinned: false,
  is_archived: false,
})

/** 标签输入（逗号分隔文本 ↔ tags 数组转换的中间形态） */
const tagsText = ref('')

watch(
  () => props.open,
  (open) => {
    if (open) {
      form.title = props.article?.title ?? ''
      form.category = props.article?.category ?? null
      form.content = props.article?.content ?? ''
      form.is_pinned = props.article?.is_pinned ?? false
      form.is_archived = props.article?.is_archived ?? false
      tagsText.value = (props.article?.tags ?? []).join(', ')
    }
  },
)

/** 逗号 / 中文逗号分隔解析为标签数组（去空去重） */
function parseTags(): string[] {
  const list = tagsText.value
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean)
  return [...new Set(list)]
}

function handleSubmit() {
  const title = form.title.trim()
  if (!title) {
    toast('请填写笔记标题', 'error')
    return
  }
  emit('submit', {
    title,
    category: form.category,
    tags: parseTags(),
    content: form.content,
    is_pinned: form.is_pinned,
    is_archived: form.is_archived,
  })
}
</script>

<template>
  <Dialog
    :open="open"
    :title="article ? '编辑笔记' : '新建笔记'"
    description="标题与正文必填；正文支持 Markdown（# 标题、- 列表、``` 代码块等）。"
    class="max-w-3xl"
    @update:open="emit('update:open', $event)"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div class="space-y-2">
        <Label for="article-title">标题 *</Label>
        <Input id="article-title" v-model="form.title" placeholder="这篇笔记的主题，如：Vite 多环境变量配置踩坑" required />
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <div class="space-y-2">
          <Label for="article-category">分类</Label>
          <Select id="article-category" v-model="form.category" :options="CATEGORY_OPTIONS" placeholder="选择分类" />
        </div>
        <div class="space-y-2 sm:col-span-2">
          <Label for="article-tags">标签</Label>
          <Input id="article-tags" v-model="tagsText" placeholder="用逗号分隔，如：vite, tailwind, 部署" />
        </div>
      </div>

      <div class="space-y-2">
        <Label>正文 *</Label>
        <Tabs default-value="edit">
          <TabsList class="mb-2">
            <TabsTrigger value="edit">编辑</TabsTrigger>
            <TabsTrigger value="preview">预览</TabsTrigger>
          </TabsList>
          <TabsContent value="edit">
            <Textarea
              v-model="form.content"
              class="min-h-56 font-mono text-sm leading-relaxed"
              placeholder="支持 Markdown：标题、列表、链接、代码块…"
            />
          </TabsContent>
          <TabsContent value="preview">
            <div
              class="markdown-body max-h-80 min-h-56 overflow-y-auto rounded-md border bg-muted/20 p-4"
              v-html="renderMarkdown(form.content)"
            />
          </TabsContent>
        </Tabs>
      </div>

      <div class="flex items-center gap-6">
        <label class="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <Checkbox
            :model-value="form.is_pinned"
            @update:model-value="(v) => (form.is_pinned = !!v)"
          />
          置顶显示
        </label>
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" @click="emit('update:open', false)">取消</Button>
        <Button type="submit" :disabled="submitting">
          {{ submitting ? '保存中…' : article ? '保存修改' : '创建笔记' }}
        </Button>
      </div>
    </form>
  </Dialog>
</template>

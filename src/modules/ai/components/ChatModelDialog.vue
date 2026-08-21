<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, MessageCircle, Pencil, Plus, Star, Trash2 } from '@lucide/vue'
import { Badge, Button, Dialog, Skeleton } from '@/components/ui'
import { useAiChatStore } from '@/modules/ai-chat/store'
import type { AiChatModel, AiChatModelInput } from '@/modules/ai-chat/types'
import type { AiService } from '@/modules/ai/types'
import { useAiStore } from '@/modules/ai/store'
import { toast } from '@/lib/toast'
import ChatModelDeleteDialog from './ChatModelDeleteDialog.vue'
import ChatModelFormDialog from './ChatModelFormDialog.vue'

const props = defineProps<{
  open: boolean
  service?: AiService | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const chatStore = useAiChatStore()
const aiStore = useAiStore()
const formOpen = ref(false)
const editingModel = ref<AiChatModel | null>(null)
const deleteTarget = ref<AiChatModel | null>(null)
const submitting = ref(false)
const deleting = ref(false)

const serviceModels = computed(() => (props.service ? chatStore.modelsOf(props.service.id) : []))

watch(
  () => props.open,
  (open) => {
    if (open) chatStore.fetchModels()
  },
)

function secretName(secretId: string | null): string {
  if (!secretId) return '未绑定密钥'
  return aiStore.secrets.find((secret) => secret.id === secretId)?.name ?? '密钥不可用'
}

function openCreate() {
  editingModel.value = null
  formOpen.value = true
}

function openEdit(model: AiChatModel) {
  editingModel.value = model
  formOpen.value = true
}

async function handleSubmit(input: AiChatModelInput) {
  submitting.value = true
  try {
    if (editingModel.value) {
      await chatStore.updateModel(editingModel.value.id, input)
      toast('对话模型已更新', 'success')
    } else {
      await chatStore.createModel(input)
      toast('对话模型已加入', 'success')
    }
    formOpen.value = false
  } catch (e: any) {
    console.error('保存对话模型失败', e)
    toast(e?.message ?? '保存失败', 'error')
  } finally {
    submitting.value = false
  }
}

async function handleDeleteConfirm() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await chatStore.deleteModel(deleteTarget.value.id)
    deleteTarget.value = null
    toast('对话模型已移除', 'success')
  } catch (e: any) {
    console.error('移除对话模型失败', e)
    toast(e?.message ?? '移除失败', 'error')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <Dialog :open="open" class="max-w-2xl" @update:open="emit('update:open', $event)">
    <div v-if="service" class="space-y-5">
      <div class="min-w-0">
        <h2 class="pr-8 text-xl font-semibold tracking-tight">{{ service.name }}</h2>
        <div class="mt-4 flex items-center justify-between gap-3 border-b pb-3">
          <p class="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MessageCircle class="h-4 w-4" />
            对话模型
          </p>
          <Button variant="outline" size="sm" class="shrink-0" @click="openCreate">
            <Plus class="h-4 w-4" />
            添加模型
          </Button>
        </div>
      </div>

      <div v-if="serviceModels.length > 0" class="space-y-2">
        <div
          v-for="model in serviceModels"
          :key="model.id"
          class="flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors hover:border-teal-500/30 hover:bg-teal-500/[0.03]"
        >
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-400">
            <MessageCircle class="h-4 w-4" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="truncate text-sm font-medium">{{ model.display_name }}</p>
              <Badge v-if="model.is_default" variant="outline" class="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                <Star class="h-3 w-3" />默认
              </Badge>
              <Badge v-if="!model.enabled" variant="secondary" class="font-normal">已停用</Badge>
            </div>
            <code class="mt-1 block truncate font-mono text-xs text-muted-foreground">{{ model.model_id }}</code>
            <p class="mt-1 truncate text-xs text-muted-foreground">密钥：{{ secretName(model.secret_id) }}</p>
          </div>
          <div class="flex shrink-0 items-center gap-0.5">
            <span v-if="model.enabled" class="mr-1 hidden items-center gap-1 text-xs text-emerald-600 sm:flex dark:text-emerald-400">
              <Check class="h-3.5 w-3.5" />可用
            </span>
            <Button variant="ghost" size="icon" class="h-8 w-8" title="编辑模型" aria-label="编辑模型" @click="openEdit(model)">
              <Pencil class="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" class="h-8 w-8 text-destructive hover:text-destructive" title="移除模型" aria-label="移除模型" @click="deleteTarget = model">
              <Trash2 class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <div v-else class="rounded-xl border border-dashed px-5 py-10 text-center">
        <MessageCircle class="mx-auto h-8 w-8 text-muted-foreground/60" />
        <p class="mt-3 text-sm font-medium">还没有对话模型</p>
        <p class="mt-1 text-xs text-muted-foreground">选择一个已有密钥，把模型加入全局 AI 对话</p>
        <Button class="mt-4" size="sm" @click="openCreate">
          <Plus class="h-4 w-4" />
          添加模型
        </Button>
      </div>
    </div>
    <div v-else class="space-y-2">
      <Skeleton v-for="i in 3" :key="i" class="h-12 rounded-md" />
    </div>

    <ChatModelFormDialog
      v-if="service"
      v-model:open="formOpen"
      :service="service"
      :model="editingModel"
      :has-existing-models="serviceModels.length > 0"
      :submitting="submitting"
      @submit="handleSubmit"
    />

    <ChatModelDeleteDialog
      :open="deleteTarget !== null"
      :model-name="deleteTarget?.display_name"
      :deleting="deleting"
      @update:open="(v) => !v && (deleteTarget = null)"
      @confirm="handleDeleteConfirm"
    />
  </Dialog>
</template>

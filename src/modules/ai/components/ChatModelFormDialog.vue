<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { Button, Checkbox, Dialog, Input, Label, Select } from '@/components/ui'
import { useAiStore } from '@/modules/ai/store'
import type { AiService } from '@/modules/ai/types'
import type { AiChatModel, AiChatModelInput } from '@/modules/ai-chat/types'
import { toast } from '@/lib/toast'

const props = defineProps<{
  open: boolean
  service: AiService
  model?: AiChatModel | null
  hasExistingModels?: boolean
  submitting?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [input: AiChatModelInput]
}>()

const aiStore = useAiStore()

const PROTOCOL_OPTIONS = [{ value: 'openai_compatible', label: 'OpenAI 兼容接口' }]
const AUTH_TYPE_OPTIONS = [
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'api_key', label: 'API Key 请求头' },
]

const secretOptions = computed(() =>
  aiStore.secretsOf(props.service.id)
    .filter((secret) => secret.key_value)
    .map((secret) => ({ value: secret.id, label: secret.name })),
)

const form = reactive({
  displayName: '',
  modelId: '',
  protocol: 'openai_compatible',
  authType: 'bearer',
  endpointUrl: '',
  secretId: null as string | null,
  enabled: true,
  isDefault: false,
})

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.displayName = props.model?.display_name ?? `${props.service.name} 对话`
    form.modelId = props.model?.model_id ?? ''
    form.protocol = props.model?.protocol ?? 'openai_compatible'
    form.authType = props.model?.auth_type ?? (props.service.service_type === 'xiaomi' ? 'api_key' : 'bearer')
    form.endpointUrl = props.model?.endpoint_url ?? ''
    form.secretId = props.model?.secret_id ?? secretOptions.value[0]?.value ?? null
    form.enabled = props.model?.enabled ?? true
    form.isDefault = props.model?.is_default ?? !props.hasExistingModels
  },
)

watch(secretOptions, (options) => {
  if (props.open && !form.secretId && options.length > 0) form.secretId = options[0].value
})

function handleSubmit() {
  const displayName = form.displayName.trim()
  const modelId = form.modelId.trim()
  if (!displayName) {
    toast('请填写显示名称', 'error')
    return
  }
  if (!modelId) {
    toast('请填写模型 ID', 'error')
    return
  }
  if (!form.secretId || !secretOptions.value.some((option) => option.value === form.secretId)) {
    toast('请先在密钥管理中添加并选择一条有效密钥', 'error')
    return
  }
  emit('submit', {
    service_id: props.service.id,
    secret_id: form.secretId,
    display_name: displayName,
    model_id: modelId,
    protocol: 'openai_compatible',
    auth_type: form.authType as AiChatModelInput['auth_type'],
    endpoint_url: form.endpointUrl.trim() || null,
    enabled: form.enabled,
    is_default: form.isDefault,
  })
}
</script>

<template>
  <Dialog
    :open="open"
    :title="model ? '编辑对话模型' : '加入 AI 对话'"
    description="选择工具密钥，配置实际发送给模型接口的模型 ID。"
    @update:open="emit('update:open', $event)"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div class="rounded-lg border bg-muted/20 px-3 py-2.5 text-sm">
        <span class="text-muted-foreground">当前工具：</span>
        <span class="font-medium">{{ service.name }}</span>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-2">
          <Label for="chat-model-display-name">显示名称 *</Label>
          <Input id="chat-model-display-name" v-model="form.displayName" placeholder="如：DeepSeek Chat" required />
        </div>
        <div class="space-y-2">
          <Label for="chat-model-id">模型 ID *</Label>
          <Input id="chat-model-id" v-model="form.modelId" placeholder="如：deepseek-chat" required />
        </div>
      </div>

      <div class="space-y-2">
        <Label for="chat-model-protocol">调用协议</Label>
        <Select id="chat-model-protocol" v-model="form.protocol" :options="PROTOCOL_OPTIONS" />
      </div>

      <div class="space-y-2">
        <Label for="chat-model-auth-type">鉴权方式</Label>
        <Select id="chat-model-auth-type" v-model="form.authType" :options="AUTH_TYPE_OPTIONS" />
        <p class="text-xs text-muted-foreground">MiMo 使用“API Key 请求头”，请求头名称为 <code>api-key</code>。</p>
      </div>

      <div class="space-y-2">
        <Label for="chat-model-endpoint">Chat API 地址（选填）</Label>
        <Input
          id="chat-model-endpoint"
          v-model="form.endpointUrl"
          :placeholder="service.base_url ? `留空自动使用 ${service.base_url}` : 'https://example.com/v1/chat/completions'"
        />
        <p class="text-xs text-muted-foreground">留空时根据工具的 API 地址自动推导。</p>
      </div>

      <div class="space-y-2">
        <Label for="chat-model-secret">使用密钥 *</Label>
        <Select
          v-if="secretOptions.length > 0"
          id="chat-model-secret"
          v-model="form.secretId"
          :options="secretOptions"
          placeholder="选择该工具下的密钥"
        />
        <div v-else class="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          当前工具还没有有效密钥，请先关闭此弹窗，在密钥管理中添加。
        </div>
      </div>

      <div class="flex flex-wrap gap-5 pt-1">
        <label class="flex items-center gap-2 text-sm">
          <Checkbox :checked="form.enabled" @update:model-value="form.enabled = Boolean($event)" />
          启用此模型
        </label>
        <label class="flex items-center gap-2 text-sm">
          <Checkbox :checked="form.isDefault" @update:model-value="form.isDefault = Boolean($event)" />
          设为默认模型
        </label>
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" @click="emit('update:open', false)">取消</Button>
        <Button type="submit" :disabled="submitting || secretOptions.length === 0">
          {{ submitting ? '保存中…' : model ? '保存修改' : '加入对话' }}
        </Button>
      </div>
    </form>
  </Dialog>
</template>

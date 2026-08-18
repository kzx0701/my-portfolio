<script setup lang="ts">
import { reactive, watch } from 'vue'
import { Button, Dialog, Input, Label, Select, Textarea } from '@/components/ui'
import { toast } from '@/lib/toast'
import { maskKey, type AiSecret, type AiSecretInput } from '@/modules/ai/types'
import { useAiStore } from '@/modules/ai/store'
import { computed } from 'vue'

const props = defineProps<{
  open: boolean
  /** 传入密钥则为编辑，否则为新建 */
  secret?: AiSecret | null
  submitting?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [input: AiSecretInput]
}>()

const store = useAiStore()

/** 密钥可关联的工具（详情弹窗内已固定 service_id，此处仅新建入口可选） */
const serviceOptions = computed(() =>
  store.services.map((s) => ({ value: s.id, label: s.name })),
)

const form = reactive<Omit<AiSecretInput, 'key_value'> & { key_value: string }>({
  service_id: null,
  name: '',
  service: null,
  key_value: '',
  note: null,
})

watch(
  () => props.open,
  (open) => {
    if (open) {
      form.service_id = props.secret?.service_id ?? store.services[0]?.id ?? null
      form.name = props.secret?.name ?? ''
      form.service = props.secret?.service ?? null
      // 编辑时明文不回填（避免明文常驻输入框）；留空 = 保持原密钥不变
      form.key_value = ''
      form.note = props.secret?.note ?? null
    }
  },
)

function handleSubmit() {
  const name = form.name.trim()
  if (!name) {
    toast('请填写密钥名称', 'error')
    return
  }
  const keyValue = form.key_value.trim()
  // 新建：密钥必填；编辑：留空保持原值
  if (!props.secret && !keyValue) {
    toast('请填写密钥内容', 'error')
    return
  }
  emit('submit', {
    service_id: form.service_id,
    name,
    service: form.service?.trim() || null,
    key_value: props.secret ? keyValue || props.secret.key_value : keyValue || null,
    note: form.note?.trim() || null,
  })
}
</script>

<template>
  <Dialog
    :open="open"
    :title="secret ? '编辑密钥' : '新建密钥'"
    description="用于存放 AI API Key、工具 Token 等凭据；列表中仅显示打码片段，复制时才取用明文。"
    @update:open="emit('update:open', $event)"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-2">
          <Label for="ai-secret-name">名称 *</Label>
          <Input id="ai-secret-name" v-model="form.name" placeholder="如：OpenAI API Key" required />
        </div>
        <div class="space-y-2">
          <Label for="ai-secret-service">所属工具</Label>
          <Select id="ai-secret-service" v-model="form.service_id" :options="serviceOptions" placeholder="选择工具" />
        </div>
      </div>

      <div class="space-y-2">
        <Label for="ai-secret-value">密钥内容{{ secret ? '（选填）' : ' *' }}</Label>
        <Input
          id="ai-secret-value"
          v-model="form.key_value"
          type="password"
          autocomplete="off"
          :placeholder="secret ? `留空保持原值（当前：${maskKey(secret.key_value)}）` : '粘贴密钥内容'"
        />
        <p v-if="secret" class="text-xs text-muted-foreground">编辑时留空则保持原密钥不变</p>
      </div>

      <div class="space-y-2">
        <Label for="ai-secret-note">备注</Label>
        <Textarea id="ai-secret-note" v-model="form.note" placeholder="用途说明，如：生产环境 / 开发环境…" :rows="2" />
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" @click="emit('update:open', false)">取消</Button>
        <Button type="submit" :disabled="submitting">
          {{ submitting ? '保存中…' : secret ? '保存修改' : '创建密钥' }}
        </Button>
      </div>
    </form>
  </Dialog>
</template>

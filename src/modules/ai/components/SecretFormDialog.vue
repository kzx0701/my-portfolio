<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { Eye, EyeOff } from '@lucide/vue'
import { Button, Dialog, Input, Label, Textarea } from '@/components/ui'
import { toast } from '@/lib/toast'
import { maskKey, type AiSecret, type AiSecretInput } from '@/modules/ai/types'

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

const form = reactive<Omit<AiSecretInput, 'key_value'> & { key_value: string }>({
  service_id: null,
  name: '',
  service: null,
  key_value: '',
  note: null,
})

const showKey = ref(false)

watch(
  () => props.open,
  (open) => {
    if (open) {
      form.service_id = props.secret?.service_id ?? null
      form.name = props.secret?.name ?? ''
      form.service = props.secret?.service ?? null
      // 编辑时明文不回填（避免明文常驻输入框）；留空 = 保持原密钥不变
      form.key_value = ''
      form.note = props.secret?.note ?? null
      showKey.value = false
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
    description="保管 API Key、Token 等凭据；保存后默认显示打码片段。"
    @update:open="emit('update:open', $event)"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div class="space-y-2">
        <Label for="ai-secret-name">名称 *</Label>
        <Input id="ai-secret-name" v-model="form.name" placeholder="如：OpenAI API Key" required />
      </div>

      <div class="space-y-2">
        <Label for="ai-secret-value">密钥内容{{ secret ? '（选填）' : ' *' }}</Label>
        <div class="relative">
          <Input
            id="ai-secret-value"
            v-model="form.key_value"
            :type="showKey ? 'text' : 'password'"
            autocomplete="new-password"
            class="pr-10"
            :placeholder="secret ? `留空保持原值（当前：${maskKey(secret.key_value)}）` : '粘贴密钥内容'"
          />
          <button
            type="button"
            class="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            :title="showKey ? '隐藏密钥' : '显示密钥'"
            :aria-label="showKey ? '隐藏密钥' : '显示密钥'"
            @click="showKey = !showKey"
          >
            <EyeOff v-if="showKey" class="h-4 w-4" />
            <Eye v-else class="h-4 w-4" />
          </button>
        </div>
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

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { Button, Dialog, Input, Label } from '@/components/ui'
import { toast } from '@/lib/toast'
import type { AiService, AiServiceInput } from '@/modules/ai/types'

const props = defineProps<{
  open: boolean
  service?: AiService | null
  submitting?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [input: AiServiceInput]
}>()

const form = reactive({
  kind: 'model_api' as 'model_api' | 'agent' | 'relay',
  name: '',
  consoleUrl: '',
})

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.kind = (props.service?.kind as 'model_api' | 'agent' | 'relay') ?? 'model_api'
    form.name = props.service?.name ?? ''
    form.consoleUrl = props.service?.console_url ?? ''
  },
)

function handleSubmit() {
  const name = form.name.trim()
  if (!name) {
    toast('请填写工具名称', 'error')
    return
  }

  emit('submit', {
    name,
    kind: form.kind,
    // 工具管理不绑定具体平台；平台/模型信息在对话模型配置中单独维护。
    service_type: props.service?.service_type ?? null,
    console_url: form.consoleUrl.trim() || null,
  })
}
</script>

<template>
  <Dialog
    :open="open"
    :title="service ? '编辑工具' : '添加工具'"
    description="只记录工具名称、类型、控制台和密钥。"
    class="max-w-lg"
    @update:open="emit('update:open', $event)"
  >
    <form class="space-y-5" @submit.prevent="handleSubmit">
      <div class="space-y-2">
        <Label for="tool-name">工具名称 *</Label>
        <Input id="tool-name" v-model="form.name" placeholder="如：小米 MiMo Token Plan" required />
      </div>

      <div class="space-y-2">
        <Label>工具类型 *</Label>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="option in [
              { value: 'model_api', label: '模型 API' },
              { value: 'agent', label: 'Agent 工具' },
              { value: 'relay', label: '中转站' },
            ]"
            :key="option.value"
            type="button"
            class="rounded-lg border px-2 py-2.5 text-sm transition-colors"
            :class="form.kind === option.value ? 'border-transparent bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:text-foreground'"
            @click="form.kind = option.value as typeof form.kind"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <div class="space-y-2">
        <Label for="tool-console-url">控制台地址（选填）</Label>
        <Input id="tool-console-url" v-model="form.consoleUrl" placeholder="如：https://platform.example.com" />
        <p class="text-xs text-muted-foreground">保存后可在工具管理列表中一键打开。</p>
      </div>

      <div class="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" @click="emit('update:open', false)">取消</Button>
        <Button type="submit" :disabled="submitting">
          {{ submitting ? '保存中…' : service ? '保存修改' : '添加工具' }}
        </Button>
      </div>
    </form>
  </Dialog>
</template>

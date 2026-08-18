<script setup lang="ts">
import { reactive, watch } from 'vue'
import { Button, Dialog, Input, Label, Select, Textarea } from '@/components/ui'
import DatePicker from '@/components/DatePicker.vue'
import { toast } from '@/lib/toast'
import { useAiStore } from '@/modules/ai/store'
import { CONSUMPTION_TYPE_OPTIONS, currentDate, PAYMENT_METHOD_OPTIONS, SERVICE_TYPE_OPTIONS, type AiUsageRecord, type AiUsageRecordInput } from '@/modules/ai/types'

const props = defineProps<{
  open: boolean
  /** 传入记录则为编辑，否则为新建 */
  record?: AiUsageRecord | null
  submitting?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [input: AiUsageRecordInput]
}>()

const store = useAiStore()

/** 工具选项（消费归属） */
const serviceOptions = SERVICE_TYPE_OPTIONS

const form = reactive<{
  service_type: string
  usage_date: string
  amount: number | ''
  payment_method: string | null
  consumption_type: string | null
  note: string | null
}>({
  service_type: 'deepseek',
  usage_date: currentDate(),
  amount: '',
  payment_method: null,
  consumption_type: null,
  note: null,
})

watch(
  () => props.open,
  (open) => {
    if (open) {
      // 编辑时从 service_id 反查 service_type
      if (props.record?.service_id) {
        const svc = store.services.find((s) => s.id === props.record!.service_id)
        form.service_type = svc?.service_type ?? 'deepseek'
      } else {
        form.service_type = 'deepseek'
      }
      form.usage_date = props.record?.usage_date ?? currentDate()
      form.amount = props.record?.amount ?? ''
      form.payment_method = props.record?.payment_method ?? null
      form.consumption_type = props.record?.consumption_type ?? null
      form.note = props.record?.note ?? null
    }
  },
)

async function handleSubmit() {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.usage_date)) {
    toast('请选择消费日期', 'error')
    return
  }
  if (form.amount === '' || form.amount === null || Number(form.amount) < 0) {
    toast('请填写消费金额（¥）', 'error')
    return
  }

  // 查找或创建对应的工具记录
  let service = store.services.find((s) => s.service_type === form.service_type)
  if (!service) {
    // 自动创建工具记录
    const meta = SERVICE_TYPE_OPTIONS.find((o) => o.value === form.service_type)
    service = await store.createService({
      name: meta?.label ?? form.service_type,
      service_type: form.service_type as any,
      kind: 'model_api',
      plan: null,
      base_url: null,
      balance_query_url: null,
      balance: null,
      balance_updated_at: null,
      quota_limit: null,
      quota_reset_time: null,
      note: null,
    })
  }

  emit('submit', {
    service_id: service.id,
    usage_date: form.usage_date,
    amount: Number(form.amount),
    payment_method: form.payment_method,
    consumption_type: form.consumption_type,
    note: form.note?.trim() || null,
  })
}
</script>

<template>
  <Dialog
    :open="open"
    :title="record ? '编辑消费记录' : '添加消费记录'"
    description="记录 AI 工具的消费金额（人民币），按日期逐笔记录。"
    @update:open="emit('update:open', $event)"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-2">
          <Label for="usage-service">工具 *</Label>
          <Select id="usage-service" v-model="form.service_type" :options="serviceOptions" placeholder="选择工具" />
        </div>
        <div class="space-y-2">
          <Label for="usage-date">消费日期 *</Label>
          <DatePicker id="usage-date" v-model="form.usage_date" placeholder="选择日期" />
        </div>
      </div>

      <div class="space-y-2">
        <Label for="usage-amount">消费金额（¥）*</Label>
        <div class="relative">
          <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">¥</span>
          <Input
            id="usage-amount"
            v-model.number="form.amount"
            type="number"
            min="0"
            step="0.01"
            class="pl-7"
            placeholder="如 15.00"
            required
          />
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-2">
          <Label for="usage-payment">支付方式</Label>
          <Select id="usage-payment" v-model="form.payment_method" :options="PAYMENT_METHOD_OPTIONS" placeholder="选择支付方式" />
        </div>
        <div class="space-y-2">
          <Label for="usage-type">消费类型</Label>
          <Select id="usage-type" v-model="form.consumption_type" :options="CONSUMPTION_TYPE_OPTIONS" placeholder="选择消费类型" />
        </div>
      </div>

      <div class="space-y-2">
        <Label for="usage-note">备注</Label>
        <Textarea id="usage-note" v-model="form.note" placeholder="如：Codex 使用较多、Trae 充值消耗…" :rows="2" />
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" @click="emit('update:open', false)">取消</Button>
        <Button type="submit" :disabled="submitting">
          {{ submitting ? '保存中…' : record ? '保存修改' : '添加记录' }}
        </Button>
      </div>
    </form>
  </Dialog>
</template>

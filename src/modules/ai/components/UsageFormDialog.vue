<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { Button, Dialog, Input, Label, Select, Textarea } from '@/components/ui'
import DatePicker from '@/components/DatePicker.vue'
import { toast } from '@/lib/toast'
import { currentDate, PAYMENT_METHOD_OPTIONS, type AiUsageRecord, type AiUsageRecordInput } from '@/modules/ai/types'
import { useAiStore } from '@/modules/ai/store'

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
const serviceOptions = computed(() =>
  store.services.map((s) => ({ value: s.id, label: s.name })),
)

const form = reactive<
  Omit<AiUsageRecordInput, 'amount' | 'service_id'> & {
    service_id: string | null
    amount: number | ''
  }
>({
  service_id: null,
  usage_date: currentDate(),
  amount: '',
  payment_method: null,
  note: null,
})

watch(
  () => props.open,
  (open) => {
    if (open) {
      form.service_id = props.record?.service_id ?? store.services[0]?.id ?? null
      form.usage_date = props.record?.usage_date ?? currentDate()
      form.amount = props.record?.amount ?? ''
      form.payment_method = props.record?.payment_method ?? null
      form.note = props.record?.note ?? null
    }
  },
)

function handleSubmit() {
  if (!form.service_id) {
    toast('请选择工具', 'error')
    return
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.usage_date)) {
    toast('请选择消费日期', 'error')
    return
  }
  if (form.amount === '' || form.amount === null || Number(form.amount) < 0) {
    toast('请填写消费金额（¥）', 'error')
    return
  }
  emit('submit', {
    service_id: form.service_id,
    usage_date: form.usage_date,
    amount: Number(form.amount),
    payment_method: form.payment_method,
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
          <Select id="usage-service" v-model="form.service_id" :options="serviceOptions" placeholder="选择工具" />
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

      <div class="space-y-2">
        <Label for="usage-payment">支付方式</Label>
        <Select id="usage-payment" v-model="form.payment_method" :options="PAYMENT_METHOD_OPTIONS" placeholder="选择支付方式" />
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

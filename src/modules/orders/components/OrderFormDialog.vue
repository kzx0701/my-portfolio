<script setup lang="ts">
import { reactive, watch } from 'vue'
import { Button, Dialog, Input, Label, Select, Textarea } from '@/components/ui'
import { ORDER_STATUS_OPTIONS, type Order, type OrderInput } from '@/modules/orders/types'

const props = defineProps<{
  open: boolean
  /** 传入订单则为编辑，否则为新建 */
  order?: Order | null
  submitting?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [input: OrderInput]
}>()

const form = reactive<OrderInput>({
  project_name: '',
  client_name: '',
  amount: null,
  status: 'pending',
  progress: 0,
  description: null,
  start_date: null,
  due_date: null,
})

watch(
  () => props.open,
  (open) => {
    if (open) {
      if (props.order) {
        form.project_name = props.order.project_name
        form.client_name = props.order.client_name
        form.amount = props.order.amount
        form.status = props.order.status
        form.progress = props.order.progress
        form.description = props.order.description
        form.start_date = props.order.start_date
        form.due_date = props.order.due_date
      } else {
        form.project_name = ''
        form.client_name = ''
        form.amount = null
        form.status = 'pending'
        form.progress = 0
        form.description = null
        form.start_date = null
        form.due_date = null
      }
    }
  },
)

function handleSubmit() {
  if (!form.project_name.trim()) return
  emit('submit', {
    ...form,
    project_name: form.project_name.trim(),
    client_name: form.client_name?.trim() || null,
    amount: form.amount === null || form.amount === 0 ? null : Number(form.amount),
    progress: Math.min(100, Math.max(0, Number(form.progress) || 0)),
    description: form.description?.trim() || null,
  })
}
</script>

<template>
  <Dialog
    :open="open"
    :title="order ? '编辑订单' : '新建订单'"
    @update:open="emit('update:open', $event)"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-2">
          <Label for="project-name">项目名称 *</Label>
          <Input id="project-name" v-model="form.project_name" placeholder="如：企业官网改版" required />
        </div>
        <div class="space-y-2">
          <Label for="client-name">客户名称</Label>
          <Input id="client-name" v-model="form.client_name" placeholder="客户 / 联系人" />
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <div class="space-y-2">
          <Label for="amount">金额（元）</Label>
          <Input id="amount" v-model.number="form.amount" type="number" min="0" step="0.01" placeholder="0" />
        </div>
        <div class="space-y-2">
          <Label for="status">阶段</Label>
          <Select id="status" v-model="form.status" :options="ORDER_STATUS_OPTIONS" />
        </div>
        <div class="space-y-2">
          <Label for="progress">进度（%）</Label>
          <Input id="progress" v-model.number="form.progress" type="number" min="0" max="100" placeholder="0-100" />
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-2">
          <Label for="start-date">开始日期</Label>
          <Input id="start-date" v-model="form.start_date" type="date" />
        </div>
        <div class="space-y-2">
          <Label for="due-date">截止日期</Label>
          <Input id="due-date" v-model="form.due_date" type="date" />
        </div>
      </div>

      <div class="space-y-2">
        <Label for="description">项目描述 / 备注</Label>
        <Textarea id="description" v-model="form.description" placeholder="记录项目要点、需求、交付范围…" :rows="4" />
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" @click="emit('update:open', false)">取消</Button>
        <Button type="submit" :disabled="submitting">
          {{ submitting ? '保存中…' : order ? '保存修改' : '创建' }}
        </Button>
      </div>
    </form>
  </Dialog>
</template>
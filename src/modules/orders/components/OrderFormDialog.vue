<script setup lang="ts">
import { reactive, watch } from 'vue'
import { Button, Dialog, Input, Label, Select, Textarea } from '@/components/ui'
import DatePicker from '@/components/DatePicker.vue'
import {
  ORDER_CHANNEL_OPTIONS,
  ORDER_STATUS_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  type Order,
  type OrderInput,
} from '@/modules/orders/types'

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
  project_type: 'web',
  channel: 'xianyu',
  amount: null,
  status: 'negotiating',
  repo_url: null,
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
        form.project_type = props.order.project_type ?? 'web'
        form.channel = props.order.channel ?? 'xianyu'
        form.amount = props.order.amount
        form.status = props.order.status
        form.repo_url = props.order.repo_url
        form.description = props.order.description
        form.start_date = props.order.start_date
        form.due_date = props.order.due_date
      } else {
        form.project_name = ''
        form.client_name = ''
        form.project_type = 'web'
        form.channel = 'xianyu'
        form.amount = null
        form.status = 'negotiating'
        form.repo_url = null
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
    channel: form.channel,
    amount: form.amount === null || form.amount === 0 ? null : Number(form.amount),
    repo_url: form.repo_url?.trim() || null,
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

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-2">
          <Label for="project-type">项目类型</Label>
          <Select id="project-type" v-model="form.project_type" :options="PROJECT_TYPE_OPTIONS" />
        </div>
        <div class="space-y-2">
          <Label for="channel">渠道来源</Label>
          <Select id="channel" v-model="form.channel" :options="ORDER_CHANNEL_OPTIONS" />
        </div>
        <div class="space-y-2">
          <Label for="amount">订单金额（元）</Label>
          <Input id="amount" v-model.number="form.amount" type="number" min="0" step="0.01" placeholder="0" />
        </div>
        <div class="space-y-2">
          <Label for="status">当前阶段</Label>
          <Select id="status" v-model="form.status" :options="ORDER_STATUS_OPTIONS" />
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-2">
          <Label for="start-date">开始日期</Label>
          <DatePicker id="start-date" v-model="form.start_date" placeholder="选择开始日期" />
        </div>
        <div class="space-y-2">
          <Label for="due-date">结束日期</Label>
          <DatePicker id="due-date" v-model="form.due_date" placeholder="选择结束日期" />
        </div>
      </div>

      <div class="space-y-2">
        <Label for="repo-url">项目地址</Label>
        <Input
          id="repo-url"
          v-model="form.repo_url"
          type="url"
          placeholder="GitHub / Gitee 仓库地址，如 https://github.com/user/repo"
        />
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
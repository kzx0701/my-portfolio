<script setup lang="ts">
import { reactive, watch } from 'vue'
import { Button, Dialog, Input, Label, Textarea } from '@/components/ui'
import DatePicker from '@/components/DatePicker.vue'
import { toast } from '@/lib/toast'
import type { WorkLogItem, WorkLogItemInput } from '@/modules/worklog/types'

const props = defineProps<{
  open: boolean
  item?: WorkLogItem | null
  workDate: string
  submitting?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [input: WorkLogItemInput]
}>()

const form = reactive<WorkLogItemInput>({
  work_date: props.workDate,
  title: '',
  description: null,
})

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.work_date = props.item?.work_date ?? props.workDate
    form.title = props.item?.title ?? ''
    form.description = props.item?.description ?? null
  },
)

function handleSubmit() {
  const title = form.title.trim()
  if (!title) {
    toast('请输入事项名称', 'error')
    return
  }
  emit('submit', {
    work_date: form.work_date,
    title,
    description: form.description?.trim() || null,
  })
}
</script>

<template>
  <Dialog
    :open="open"
    :title="item ? '编辑工作事项' : '添加工作事项'"
    description="调整事项内容或将它安排到其他日期。"
    @update:open="emit('update:open', $event)"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div class="space-y-2">
        <Label for="worklog-title">事项名称</Label>
        <Input id="worklog-title" v-model="form.title" maxlength="200" autofocus placeholder="今天准备完成什么？" />
      </div>
      <div class="space-y-2">
        <Label for="worklog-date">工作日期</Label>
        <DatePicker id="worklog-date" v-model="form.work_date" />
      </div>
      <div class="space-y-2">
        <Label for="worklog-description">补充说明</Label>
        <Textarea
          id="worklog-description"
          v-model="form.description"
          :rows="4"
          maxlength="2000"
          placeholder="需要注意的内容、结果或链接（选填）"
        />
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" @click="emit('update:open', false)">取消</Button>
        <Button type="submit" :disabled="submitting">
          {{ submitting ? '保存中…' : '保存事项' }}
        </Button>
      </div>
    </form>
  </Dialog>
</template>

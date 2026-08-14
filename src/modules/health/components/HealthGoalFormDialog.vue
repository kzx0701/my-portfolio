<script setup lang="ts">
import { reactive, watch } from 'vue'
import { Button, Dialog, Input, Label, Select } from '@/components/ui'
import DatePicker from '@/components/DatePicker.vue'
import { useHealthStore } from '@/modules/health/store'
import { toast } from '@/lib/toast'
import { GOAL_TYPE_OPTIONS, type HealthGoal, type HealthGoalInput } from '@/modules/health/types'

const props = defineProps<{
  open: boolean
  /** 传入目标则为编辑，否则为新建 */
  goal?: HealthGoal | null
  submitting?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [input: HealthGoalInput]
}>()

const store = useHealthStore()

const form = reactive<HealthGoalInput>({
  goal_type: null,
  start_weight_kg: null,
  start_date: null,
  target_weight_kg: null,
  target_body_fat_pct: null,
  target_date: null,
  achieved_date: null,
})

/** 最近一次体重记录（records 已按 record_date 倒序，取第一条有体重的）；作为目标基线默认值 */
function latestWeight(): { weight: number; date: string } | null {
  for (const r of store.records) {
    if (r.weight_kg !== null) return { weight: r.weight_kg, date: r.record_date }
  }
  return null
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      form.goal_type = props.goal?.goal_type ?? null
      form.start_weight_kg = props.goal?.start_weight_kg ?? null
      form.start_date = props.goal?.start_date ?? null
      form.target_weight_kg = props.goal?.target_weight_kg ?? null
      form.target_body_fat_pct = props.goal?.target_body_fat_pct ?? null
      form.target_date = props.goal?.target_date ?? null
      form.achieved_date = props.goal?.achieved_date ?? null
      if (!props.goal) {
        // 新建目标时起始基线自动带出最近一次体重记录（可修改）
        const lw = latestWeight()
        form.start_weight_kg = lw?.weight ?? null
        form.start_date = lw?.date ?? null
      }
    }
  },
)

/** 数值输入归一化：空 / 0 → null，其余转 number */
function num(v: number | '' | null): number | null {
  return v === '' || v === null || v === 0 ? null : Number(v)
}

function handleSubmit() {
  // 起始日期与目标日期校验：目标日期不能早于起始日期
  if (form.start_date && form.target_date && form.target_date < form.start_date) {
    toast('目标日期不能早于起始日期', 'error')
    return
  }
  emit('submit', {
    goal_type: form.goal_type,
    start_weight_kg: num(form.start_weight_kg),
    start_date: form.start_date,
    target_weight_kg: num(form.target_weight_kg),
    target_body_fat_pct: num(form.target_body_fat_pct),
    target_date: form.target_date,
    achieved_date: form.achieved_date,
  })
}
</script>

<template>
  <Dialog
    :open="open"
    :title="goal ? '编辑健康目标' : '设定健康目标'"
    description="设定目标类型、起始基线、目标数值与达成期限，档案页将跟踪进度。"
    @update:open="emit('update:open', $event)"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-2">
          <Label for="goal-type">目标类型</Label>
          <Select id="goal-type" v-model="form.goal_type" :options="GOAL_TYPE_OPTIONS" />
        </div>
        <div class="space-y-2">
          <Label for="target-body-fat">目标体脂率（%）</Label>
          <Input id="target-body-fat" v-model.number="form.target_body_fat_pct" type="number" min="0" step="0.1" placeholder="如 15" />
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-2">
          <Label for="start-weight">起始体重（kg）</Label>
          <Input id="start-weight" v-model.number="form.start_weight_kg" type="number" min="0" step="0.1" placeholder="如 68" />
        </div>
        <div class="space-y-2">
          <Label for="start-date">起始日期</Label>
          <DatePicker id="start-date" v-model="form.start_date" placeholder="从哪一天开始" />
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-2">
          <Label for="target-weight">目标体重（kg）</Label>
          <Input id="target-weight" v-model.number="form.target_weight_kg" type="number" min="0" step="0.1" placeholder="如 62" />
        </div>
        <div class="space-y-2">
          <Label for="target-date">目标日期</Label>
          <DatePicker id="target-date" v-model="form.target_date" placeholder="什么时候达成" />
        </div>
      </div>

      <div class="space-y-2">
        <Label for="achieved-date">达成日期</Label>
        <DatePicker id="achieved-date" v-model="form.achieved_date" placeholder="实际达成日期（标记完成时自动记录为当天）" />
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" @click="emit('update:open', false)">取消</Button>
        <Button type="submit" :disabled="submitting">
          {{ submitting ? '保存中…' : goal ? '保存修改' : '设定目标' }}
        </Button>
      </div>
    </form>
  </Dialog>
</template>

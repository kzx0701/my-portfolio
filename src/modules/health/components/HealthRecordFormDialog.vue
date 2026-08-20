<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { Badge, Button, Dialog, Input, Label, Textarea } from '@/components/ui'
import DatePicker from '@/components/DatePicker.vue'
import { useHealthStore } from '@/modules/health/store'
import { bmiMeta, resolveBMI, type HealthRecord, type HealthRecordInput } from '@/modules/health/types'
import { toast } from '@/lib/toast'

const props = defineProps<{
  open: boolean
  /** 传入记录则为编辑，否则为新建 */
  record?: HealthRecord | null
  submitting?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [input: HealthRecordInput]
}>()

const store = useHealthStore()

/** 本地日期 YYYY-MM-DD */
function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const form = reactive<HealthRecordInput>({
  record_date: todayStr(),
  weight_kg: null,
  body_fat_pct: null,
  visceral_fat: null,
  fat_mass_kg: null,
  muscle_kg: null,
  bmi: null,
  note: null,
})

watch(
  () => props.open,
  (open) => {
    if (open) {
      if (props.record) {
        form.record_date = props.record.record_date
        form.weight_kg = props.record.weight_kg
        form.body_fat_pct = props.record.body_fat_pct
        form.visceral_fat = props.record.visceral_fat
        form.fat_mass_kg = props.record.fat_mass_kg
        form.muscle_kg = props.record.muscle_kg
        form.bmi = props.record.bmi
        form.note = props.record.note
      } else {
        form.record_date = todayStr()
        form.weight_kg = null
        form.body_fat_pct = null
        form.visceral_fat = null
        form.fat_mass_kg = null
        form.muscle_kg = null
        form.bmi = null
        form.note = null
      }
    }
  },
)

/** 档案身高（固定属性，BMI 统一用它计算；未建档为 null） */
const profileHeight = computed(() => store.profile?.height_cm ?? null)

/** BMI 实时预览：手动录入优先（bmi 列），留空时按体重 + 档案身高自动计算 */
const previewBMI = computed(() => resolveBMI(form.bmi, form.weight_kg, profileHeight.value))

/** 日期冲突检测：同一天已有记录（编辑时排除自身）—— 一天仅能记录一条 */
const dateConflict = computed(() =>
  store.records.some((r) => r.record_date === form.record_date && r.id !== props.record?.id),
)

/** 数值输入归一化：空 / 0 → null，其余转 number */
function num(v: number | '' | null): number | null {
  return v === '' || v === null || v === 0 ? null : Number(v)
}

function handleSubmit() {
  // weight_kg 为必填：null / 空字符串 / 0 均拦截（v-model.number 空输入时运行时可能为 ''，此处以真值判断兜底）
  if (!form.weight_kg) return
  // 一天一条记录：该日期已有记录时拦截
  if (dateConflict.value) {
    toast(`该日期（${form.record_date}）已有一条健康记录，一天仅能记录一条`, 'error')
    return
  }
  emit('submit', {
    record_date: form.record_date,
    weight_kg: num(form.weight_kg),
    body_fat_pct: num(form.body_fat_pct),
    visceral_fat: num(form.visceral_fat),
    fat_mass_kg: num(form.fat_mass_kg),
    muscle_kg: num(form.muscle_kg),
    bmi: num(form.bmi),
    note: form.note?.trim() || null,
  })
}
</script>

<template>
  <Dialog
    :open="open"
    :title="record ? '编辑健康记录' : '新建健康记录'"
    @update:open="emit('update:open', $event)"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-2">
          <Label for="record-date">记录日期 *</Label>
          <DatePicker id="record-date" v-model="form.record_date" placeholder="选择日期" />
          <p v-if="dateConflict" class="text-xs font-medium text-destructive">
            该日期已有一条健康记录，一天仅能记录一条
          </p>
        </div>
        <div class="space-y-2">
          <Label for="weight">体重（kg）*</Label>
          <Input id="weight" v-model.number="form.weight_kg" type="number" min="0" step="0.01" placeholder="如 65.50" required />
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-2">
          <Label for="body-fat">体脂率（%）</Label>
          <Input id="body-fat" v-model.number="form.body_fat_pct" type="number" min="0" step="0.1" placeholder="如 18.5" />
        </div>
        <div class="space-y-2">
          <Label for="visceral-fat">内脏脂肪</Label>
          <Input id="visceral-fat" v-model.number="form.visceral_fat" type="number" min="0" step="0.1" placeholder="如 8" />
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-2">
          <Label for="fat-mass">脂肪量（kg）</Label>
          <Input id="fat-mass" v-model.number="form.fat_mass_kg" type="number" min="0" step="0.1" placeholder="如 12.5" />
        </div>
        <div class="space-y-2">
          <Label for="muscle">肌肉量（kg）</Label>
          <Input id="muscle" v-model.number="form.muscle_kg" type="number" min="0" step="0.1" placeholder="如 42.3" />
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-2">
          <Label for="bmi">BMI（选填）</Label>
          <Input id="bmi" v-model.number="form.bmi" type="number" min="0" step="0.01" placeholder="如 23.5，留空自动计算" />
        </div>
        <!-- BMI 预览：手动录入优先，留空时按体重 + 档案身高自动计算 -->
        <div class="space-y-2">
          <Label>BMI 预览</Label>
          <div
            v-if="previewBMI !== null"
            class="flex h-9 items-center gap-2 rounded-md border border-dashed px-3 text-sm"
          >
            <span class="text-muted-foreground">BMI</span>
            <span class="font-semibold tabular-nums">{{ previewBMI.toFixed(2) }}</span>
            <Badge variant="outline" :class="bmiMeta(previewBMI).badgeClass" class="whitespace-nowrap">
              {{ bmiMeta(previewBMI).label }}
            </Badge>
          </div>
          <p v-else-if="profileHeight === null" class="text-xs text-muted-foreground">
            请先在「个人档案」中填写身高，BMI 将自动计算
          </p>
          <p v-else class="text-xs text-muted-foreground">填写体重后自动计算 BMI（身高 {{ profileHeight }} cm）</p>
        </div>
      </div>

      <div class="space-y-2">
        <Label for="note">备注</Label>
        <Textarea id="note" v-model="form.note" placeholder="如：开始控制饮食、感冒恢复期…" :rows="3" />
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" @click="emit('update:open', false)">取消</Button>
        <Button type="submit" :disabled="submitting">
          {{ submitting ? '保存中…' : record ? '保存修改' : '创建' }}
        </Button>
      </div>
    </form>
  </Dialog>
</template>

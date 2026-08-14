<script setup lang="ts">
import { reactive, watch } from 'vue'
import { Button, Dialog, Input, Label, Select } from '@/components/ui'
import DatePicker from '@/components/DatePicker.vue'
import {
  BLOOD_TYPE_OPTIONS,
  GENDER_OPTIONS,
  type HealthProfile,
  type HealthProfileInput,
} from '@/modules/health/types'

const props = defineProps<{
  open: boolean
  /** 传入档案则为编辑，否则为新建 */
  profile?: HealthProfile | null
  submitting?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [input: HealthProfileInput]
}>()

const form = reactive<HealthProfileInput>({
  height_cm: null,
  birth_date: null,
  gender: null,
  blood_type: null,
})

watch(
  () => props.open,
  (open) => {
    if (open) {
      form.height_cm = props.profile?.height_cm ?? null
      form.birth_date = props.profile?.birth_date ?? null
      form.gender = props.profile?.gender ?? null
      form.blood_type = props.profile?.blood_type ?? null
    }
  },
)

/** 数值输入归一化：空 / 0 → null，其余转 number */
function num(v: number | '' | null): number | null {
  return v === '' || v === null || v === 0 ? null : Number(v)
}

function handleSubmit() {
  // 身高为档案核心（健康记录 BMI 依赖），必填
  if (!form.height_cm) return
  emit('submit', {
    height_cm: num(form.height_cm),
    birth_date: form.birth_date,
    gender: form.gender,
    blood_type: form.blood_type,
  })
}
</script>

<template>
  <Dialog
    :open="open"
    :title="profile ? '编辑个人档案' : '建立个人档案'"
    description="身高、出生日期等固定信息，健康记录的 BMI 将统一使用此身高计算。"
    @update:open="emit('update:open', $event)"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-2">
          <Label for="height">身高（cm）*</Label>
          <Input id="height" v-model.number="form.height_cm" type="number" min="0" step="0.1" placeholder="如 172" required />
        </div>
        <div class="space-y-2">
          <Label for="birth-date">出生日期 *</Label>
          <DatePicker id="birth-date" v-model="form.birth_date" placeholder="选择出生日期" />
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-2">
          <Label for="gender">性别</Label>
          <Select id="gender" v-model="form.gender" :options="GENDER_OPTIONS" />
        </div>
        <div class="space-y-2">
          <Label for="blood-type">血型</Label>
          <Select id="blood-type" v-model="form.blood_type" :options="BLOOD_TYPE_OPTIONS" />
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" @click="emit('update:open', false)">取消</Button>
        <Button type="submit" :disabled="submitting">
          {{ submitting ? '保存中…' : profile ? '保存修改' : '创建档案' }}
        </Button>
      </div>
    </form>
  </Dialog>
</template>

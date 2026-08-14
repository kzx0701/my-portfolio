<script setup lang="ts">
import { computed } from 'vue'
import { Activity, CircleCheck, Target, Weight } from '@lucide/vue'
import { cn } from '@/lib/utils'
import { useHealthStore } from '@/modules/health/store'
import { bmiMeta, resolveBMI } from '@/modules/health/types'

const store = useHealthStore()

/** 最近一条体重记录（records 已按 record_date 倒序） */
const latest = computed(() => store.records[0] ?? null)
const prev = computed(() => store.records[1] ?? null)

/** 当前体重（两位小数） */
const currentWeight = computed<number | null>(() => latest.value?.weight_kg ?? null)

/** 较上次变化：正=增重 / 负=减重 / null=无对比 */
const weightDelta = computed<number | null>(() => {
  if (currentWeight.value === null || prev.value?.weight_kg === null) return null
  const delta = Math.round(((currentWeight.value ?? 0) - (prev.value?.weight_kg ?? 0)) * 100) / 100
  return delta === 0 ? 0 : delta
})

/** 较上次变化文案 */
const deltaLabel = computed(() => {
  if (weightDelta.value === null) return '暂无历史记录'
  if (weightDelta.value === 0) return '较上次持平'
  return `较上次 ${weightDelta.value > 0 ? '+' : ''}${weightDelta.value} kg`
})

/** 最新有效 BMI（手动优先，留空自动计算） */
const latestBMI = computed<number | null>(() => {
  const r = latest.value
  if (!r) return null
  return resolveBMI(r.bmi, r.weight_kg, store.profile?.height_cm ?? null)
})

/** 统计卡配置 */
const stats = computed(() => [
  {
    title: '当前体重',
    value: currentWeight.value !== null ? currentWeight.value.toFixed(2) : '—',
    hint: deltaLabel.value,
    icon: Weight,
    iconClass: 'bg-gradient-to-br from-sky-400 to-blue-500',
    accentClass: 'bg-linear-to-r from-sky-400 to-blue-500',
  },
  {
    title: 'BMI',
    value: latestBMI.value !== null ? latestBMI.value.toFixed(2) : '—',
    hint: latestBMI.value !== null ? bmiMeta(latestBMI.value).label : '暂无数据',
    icon: Activity,
    iconClass: 'bg-gradient-to-br from-teal-400 to-emerald-500',
    accentClass: 'bg-linear-to-r from-teal-400 to-emerald-500',
  },
  {
    title: '进行中目标',
    value: store.goals.filter((g) => g.status === 'in_progress').length,
    hint: '正在执行中',
    icon: Target,
    iconClass: 'bg-gradient-to-br from-indigo-400 to-indigo-600',
    accentClass: 'bg-linear-to-r from-indigo-400 to-indigo-600',
  },
  {
    title: '已完成目标',
    value: store.goals.filter((g) => g.status === 'completed').length,
    hint: '已达成',
    icon: CircleCheck,
    iconClass: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
    accentClass: 'bg-linear-to-r from-emerald-400 to-emerald-600',
  },
])
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <div
      v-for="s in stats"
      :key="s.title"
      class="relative overflow-hidden rounded-xl bg-card p-5 shadow-sm"
    >
      <div :class="cn('absolute inset-x-0 top-0 h-1', s.accentClass)" />
      <div class="flex items-center gap-4">
        <div
          :class="
            cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md',
              s.iconClass,
            )
          "
        >
          <component :is="s.icon" class="h-5 w-5" />
        </div>
        <div class="min-w-0">
          <p class="text-sm font-medium text-muted-foreground">{{ s.title }}</p>
          <p class="mt-0.5 text-2xl font-bold tabular-nums tracking-tight">{{ s.value }}</p>
          <p class="mt-0.5 truncate text-xs text-muted-foreground">{{ s.hint }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

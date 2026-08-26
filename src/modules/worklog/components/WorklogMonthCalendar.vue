<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight, CircleCheck, RotateCw } from '@lucide/vue'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { calendarRange, fromDateKey, toDateKey } from '@/modules/worklog/date'
import type { WorkLogItem } from '@/modules/worklog/types'

const props = defineProps<{
  modelValue: string
  items: WorkLogItem[]
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'range-change': [start: string, end: string, force?: boolean]
}>()

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']
const todayKey = toDateKey(new Date())
const viewDate = ref(fromDateKey(props.modelValue))

const visibleRange = computed(() => calendarRange(viewDate.value))
const monthPrefix = computed(
  () => `${viewDate.value.getFullYear()}-${String(viewDate.value.getMonth() + 1).padStart(2, '0')}`,
)
const monthTitle = computed(() => `${viewDate.value.getFullYear()} 年 ${viewDate.value.getMonth() + 1} 月`)

const itemsByDate = computed(() => {
  const map: Record<string, WorkLogItem[]> = {}
  for (const item of props.items) (map[item.work_date] ??= []).push(item)
  return map
})

const monthSummary = computed(() => {
  const rows = props.items.filter((item) => item.work_date.startsWith(monthPrefix.value))
  return {
    total: rows.length,
    pending: rows.filter((item) => item.status === 'pending').length,
    completed: rows.filter((item) => item.status === 'completed').length,
  }
})

watch(
  () => `${visibleRange.value.start}:${visibleRange.value.end}`,
  () => emit('range-change', visibleRange.value.start, visibleRange.value.end),
  { immediate: true },
)

watch(
  () => props.modelValue,
  (dateKey) => {
    const date = fromDateKey(dateKey)
    if (
      date.getFullYear() !== viewDate.value.getFullYear() ||
      date.getMonth() !== viewDate.value.getMonth()
    ) {
      viewDate.value = date
    }
  },
)

function counts(dateKey: string) {
  const rows = itemsByDate.value[dateKey] ?? []
  return {
    total: rows.length,
    pending: rows.filter((item) => item.status === 'pending').length,
    completed: rows.filter((item) => item.status === 'completed').length,
    cancelled: rows.filter((item) => item.status === 'cancelled').length,
  }
}

function selectDay(date: Date) {
  const dateKey = toDateKey(date)
  if (
    date.getFullYear() !== viewDate.value.getFullYear() ||
    date.getMonth() !== viewDate.value.getMonth()
  ) {
    viewDate.value = new Date(date.getFullYear(), date.getMonth(), 1)
  }
  emit('update:modelValue', dateKey)
}

function changeMonth(amount: number) {
  const selected = fromDateKey(props.modelValue)
  const targetMonth = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() + amount, 1)
  const lastDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate()
  const target = new Date(
    targetMonth.getFullYear(),
    targetMonth.getMonth(),
    Math.min(selected.getDate(), lastDay),
  )
  viewDate.value = targetMonth
  emit('update:modelValue', toDateKey(target))
}

function goToday() {
  const today = new Date()
  viewDate.value = new Date(today.getFullYear(), today.getMonth(), 1)
  emit('update:modelValue', toDateKey(today))
}

function refresh() {
  emit('range-change', visibleRange.value.start, visibleRange.value.end, true)
}
</script>

<template>
  <section class="flex h-full min-w-0 flex-col p-4 sm:p-6">
    <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div class="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="上个月" @click="changeMonth(-1)">
            <ChevronLeft class="h-4 w-4" />
          </Button>
          <h3 class="min-w-[9.5rem] text-center text-lg font-semibold tracking-tight">
            {{ monthTitle }}
          </h3>
          <Button variant="ghost" size="icon" aria-label="下个月" @click="changeMonth(1)">
            <ChevronRight class="h-4 w-4" />
          </Button>
        </div>
        <p class="mt-1 pl-1 text-xs text-muted-foreground sm:pl-11">
          本月 {{ monthSummary.total }} 项 · 已完成 {{ monthSummary.completed }} · 待办
          {{ monthSummary.pending }}
        </p>
      </div>
      <div class="flex items-center gap-2 self-end sm:self-auto">
        <Button variant="outline" size="sm" @click="goToday">今天</Button>
        <Button
          variant="ghost"
          size="icon"
          :disabled="loading"
          aria-label="刷新当前月份"
          @click="refresh"
        >
          <RotateCw class="h-4 w-4" :class="loading && 'animate-spin'" />
        </Button>
      </div>
    </div>

    <div class="mb-2 grid grid-cols-7 px-1">
      <div
        v-for="weekday in WEEKDAYS"
        :key="weekday"
        class="py-1 text-center text-xs font-medium text-muted-foreground"
      >
        {{ weekday }}
      </div>
    </div>

    <div
      class="grid flex-1 grid-cols-7 gap-px overflow-hidden rounded-2xl border bg-border shadow-[0_14px_40px_-34px_rgba(14,116,144,0.75)]"
      aria-label="工作日志月历"
    >
      <button
        v-for="date in visibleRange.days"
        :key="toDateKey(date)"
        type="button"
        :aria-label="`${toDateKey(date)}，${counts(toDateKey(date)).total} 项事项`"
        :aria-selected="toDateKey(date) === modelValue"
        :class="
          cn(
            'group relative flex min-h-14 flex-col bg-card p-1.5 text-left outline-none transition-all duration-200 focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500 sm:min-h-20 sm:p-2.5 lg:min-h-[5.75rem]',
            date.getMonth() !== viewDate.getMonth() && 'bg-muted/40 text-muted-foreground/55',
            toDateKey(date) === modelValue &&
              'z-10 bg-sky-50 ring-2 ring-inset ring-sky-500 dark:bg-sky-950/35',
            toDateKey(date) !== modelValue && 'hover:z-10 hover:bg-sky-50/70 dark:hover:bg-sky-950/20',
          )
        "
        @click="selectDay(date)"
      >
        <span
          :class="
            cn(
              'flex h-6 min-w-6 items-center justify-center self-start rounded-full px-1 text-xs font-semibold tabular-nums sm:text-sm',
              toDateKey(date) === todayKey &&
                'bg-sky-500 text-white shadow-sm shadow-sky-500/30',
              toDateKey(date) === modelValue && toDateKey(date) !== todayKey &&
                'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-100',
            )
          "
        >
          {{ date.getDate() }}
        </span>

        <div
          v-if="counts(toDateKey(date)).total"
          class="mt-auto flex min-w-0 items-center gap-1 sm:flex-wrap sm:gap-x-2 sm:gap-y-1"
        >
          <span
            v-if="counts(toDateKey(date)).pending"
            class="inline-flex min-w-0 items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400"
          >
            <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
            <span class="hidden truncate sm:inline">{{ counts(toDateKey(date)).pending }} 待办</span>
            <span
              v-if="toDateKey(date) < todayKey"
              class="hidden text-amber-700 dark:text-amber-300 lg:inline"
            >
              · 逾期
            </span>
          </span>
          <span
            v-if="counts(toDateKey(date)).completed"
            class="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"
          >
            <CircleCheck class="h-2.5 w-2.5" />
            <span class="hidden sm:inline">{{ counts(toDateKey(date)).completed }}</span>
          </span>
          <span
            v-if="counts(toDateKey(date)).cancelled && !counts(toDateKey(date)).pending && !counts(toDateKey(date)).completed"
            class="h-1.5 w-1.5 rounded-full bg-slate-400"
            title="有已取消事项"
          />
        </div>
      </button>
    </div>

    <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
      <span class="inline-flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-amber-500" />待办</span>
      <span class="inline-flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-emerald-500" />已完成</span>
      <span class="inline-flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-slate-400" />已取消</span>
    </div>
  </section>
</template>

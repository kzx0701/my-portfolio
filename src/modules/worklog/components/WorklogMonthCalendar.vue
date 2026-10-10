<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight, RotateCw } from '@lucide/vue'
import { Button } from '@/components/ui'
import { calendarRange, fromDateKey, toDateKey } from '@/modules/worklog/date'
import {
  WORK_LOG_STATUS_META,
  WORK_LOG_STATUS_ORDER,
  type WorkLogItem,
  type WorkLogStatus,
} from '@/modules/worklog/types'

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
/**
 * 状态条满格的单位数：条长 = min(事项数, MAX_BAR_UNITS) / MAX_BAR_UNITS。
 * 4 个单位在 80px 宽的格子里刚好能看清分段，再多就没意义了。
 */
const MAX_BAR_UNITS = 4

const todayKey = toDateKey(new Date())
const viewDate = ref(fromDateKey(props.modelValue))
/** 月份切换方向：1 向后（右→左滑入），-1 向前 */
const direction = ref(1)

const visibleRange = computed(() => calendarRange(viewDate.value))
const monthPrefix = computed(
  () => `${viewDate.value.getFullYear()}-${String(viewDate.value.getMonth() + 1).padStart(2, '0')}`,
)
const monthKey = computed(() => monthPrefix.value)
const monthTitle = computed(() => `${viewDate.value.getFullYear()} 年 ${viewDate.value.getMonth() + 1} 月`)
const viewMonthIndex = computed(
  () => viewDate.value.getFullYear() * 12 + viewDate.value.getMonth(),
)

const monthSummary = computed(() => {
  const rows = props.items.filter((item) => item.work_date.startsWith(monthPrefix.value))
  const countOf = (status: WorkLogStatus) => rows.filter((item) => item.status === status).length
  return {
    pending: countOf('pending'),
    completed: countOf('completed'),
    cancelled: countOf('cancelled'),
  }
})

/** 底部脚注：状态计数既是图例（说明圆点含义），也给出本月概览 */
const monthStats = computed(() =>
  WORK_LOG_STATUS_ORDER.map((status) => ({
    status,
    label: WORK_LOG_STATUS_META[status].label,
    dotClass: WORK_LOG_STATUS_META[status].dotClass,
    count: monthSummary.value[status],
  })),
)

interface BarSegment {
  status: WorkLogStatus
  count: number
  dotClass: string
}

interface DayMark {
  total: number
  /** 条长百分比：事项越多越接近满格，一眼看出当天的负载 */
  width: string
  /** 按状态聚合的分段，段宽按数量比例分配 */
  segments: BarSegment[]
}

/**
 * 单元格标记：格底一根细状态条 —— 长度表示事项数量、分段颜色表示状态分布。
 * 相比原来「最多 3 个圆点 + 溢出 +N 文字」，条状没有孤点、不混排文字，
 * 也能把「几个待办 / 已完成」的比例直接画出来。
 */
const dayMarks = computed(() => {
  const grouped: Record<string, WorkLogStatus[]> = {}
  for (const item of props.items) {
    ;(grouped[item.work_date] ??= []).push(item.status)
  }
  const marks: Record<string, DayMark> = {}
  for (const date of visibleRange.value.days) {
    const key = toDateKey(date)
    const statuses = grouped[key] ?? []
    marks[key] = {
      total: statuses.length,
      width: `${(Math.min(statuses.length, MAX_BAR_UNITS) / MAX_BAR_UNITS) * 100}%`,
      segments: WORK_LOG_STATUS_ORDER.filter((status) => statuses.includes(status)).map(
        (status) => ({
          status,
          count: statuses.filter((item) => item === status).length,
          dotClass: WORK_LOG_STATUS_META[status].dotClass,
        }),
      ),
    }
  }
  return marks
})

interface DayCell {
  date: Date
  key: string
  mark: DayMark | undefined
}

/** 渲染用的日期 + 标记合并结果（避免模板里反复查表） */
const dayCells = computed<DayCell[]>(() =>
  visibleRange.value.days.map((date) => {
    const key = toDateKey(date)
    return { date, key, mark: dayMarks.value[key] }
  }),
)

/** 单元格底色：非本月最淡、有事项的更实、选中最高优先 */
function cellClass(cell: DayCell) {
  const outside = cell.date.getMonth() !== viewDate.value.getMonth()
  const selected = cell.key === props.modelValue
  const isToday = cell.key === todayKey
  return [
    outside && 'text-muted-foreground/35 hover:bg-muted/40',
    !outside &&
      !selected &&
      !isToday &&
      (cell.mark?.total
        ? 'bg-muted text-foreground ring-1 ring-inset ring-border hover:shadow-[0_2px_8px_-6px_rgba(15,23,42,0.45)]'
        : 'bg-muted/50 text-foreground/80 hover:bg-muted/80'),
    isToday && !selected && 'bg-sky-500/[0.06] ring-1 ring-inset ring-sky-500/20',
    selected &&
      'bg-sky-500/10 text-sky-950 ring-1 ring-inset ring-sky-500/40 shadow-[0_2px_10px_-6px_rgba(14,165,233,0.6)] dark:text-sky-50',
  ]
}

/** 日期数字：今天=渐变胶囊，选中=海蓝加粗，其余按是否有事项区分字重 */
function numberClass(cell: DayCell) {
  if (cell.key === todayKey) {
    return 'bg-gradient-to-br from-sky-500 to-teal-500 font-semibold text-white shadow-sm shadow-sky-500/30'
  }
  if (cell.key === props.modelValue) return 'font-semibold text-sky-700 dark:text-sky-300'
  if (cell.date.getMonth() !== viewDate.value.getMonth()) return 'font-normal'
  return cell.mark?.total ? 'font-semibold' : 'font-medium'
}

watch(
  () => `${visibleRange.value.start}:${visibleRange.value.end}`,
  () => emit('range-change', visibleRange.value.start, visibleRange.value.end),
  { immediate: true },
)

watch(
  () => props.modelValue,
  (dateKey) => setView(fromDateKey(dateKey)),
)

/** 统一收口月份偏移：只有真正换月时才更新方向，避免同月内点击触发动画 */
function setView(target: Date) {
  const nextMonth = new Date(target.getFullYear(), target.getMonth(), 1)
  const nextIndex = nextMonth.getFullYear() * 12 + nextMonth.getMonth()
  if (nextIndex !== viewMonthIndex.value) direction.value = nextIndex > viewMonthIndex.value ? 1 : -1
  viewDate.value = nextMonth
}

function selectDay(date: Date) {
  setView(date)
  emit('update:modelValue', toDateKey(date))
}

function changeMonth(amount: number) {
  const selected = fromDateKey(props.modelValue)
  const targetMonth = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() + amount, 1)
  const lastDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate()
  setView(targetMonth)
  emit(
    'update:modelValue',
    toDateKey(
      new Date(targetMonth.getFullYear(), targetMonth.getMonth(), Math.min(selected.getDate(), lastDay)),
    ),
  )
}

function goToday() {
  const today = new Date()
  setView(today)
  emit('update:modelValue', toDateKey(today))
}

function refresh() {
  emit('range-change', visibleRange.value.start, visibleRange.value.end, true)
}
</script>

<template>
  <section class="flex h-full min-w-0 flex-col p-4 sm:p-5 lg:p-6">
    <div class="mb-3.5 flex items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
          aria-label="上个月"
          @click="changeMonth(-1)"
        >
          <ChevronLeft class="h-4 w-4" />
        </Button>
        <h3 class="min-w-[7.5rem] text-center text-base font-semibold tracking-tight tabular-nums sm:text-lg">
          {{ monthTitle }}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
          aria-label="下个月"
          @click="changeMonth(1)"
        >
          <ChevronRight class="h-4 w-4" />
        </Button>
      </div>
      <div class="flex shrink-0 items-center gap-1">
        <Button variant="outline" size="sm" class="h-8 rounded-lg" @click="goToday">今天</Button>
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
          :disabled="loading"
          aria-label="刷新当前月份"
          @click="refresh"
        >
          <RotateCw class="h-4 w-4" :class="loading && 'animate-spin'" />
        </Button>
      </div>
    </div>

    <div class="mb-1.5 grid grid-cols-7">
      <div
        v-for="(weekday, index) in WEEKDAYS"
        :key="weekday"
        class="py-1 text-center text-[11px] font-medium"
        :class="index >= 5 ? 'text-muted-foreground/55' : 'text-muted-foreground'"
      >
        {{ weekday }}
      </div>
    </div>

    <div class="relative mt-1 min-h-[24rem] flex-1">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        :enter-from-class="direction > 0 ? 'opacity-0 translate-x-5' : 'opacity-0 -translate-x-5'"
        enter-to-class="opacity-100 translate-x-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-x-0"
        :leave-to-class="direction > 0 ? 'opacity-0 -translate-x-5' : 'opacity-0 translate-x-5'"
      >
        <div
          :key="monthKey"
          class="absolute inset-0 grid grid-cols-7 grid-rows-6 gap-1.5"
          aria-label="工作日志月历"
        >
          <button
            v-for="cell in dayCells"
            :key="cell.key"
            type="button"
            :aria-label="`${cell.key}，${cell.mark?.total ?? 0} 项事项`"
            :aria-selected="cell.key === modelValue"
            :aria-current="cell.key === todayKey ? 'date' : undefined"
            class="group relative flex items-center justify-center rounded-xl outline-none transition-all duration-200 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500/60"
            :class="cellClass(cell)"
            @click="selectDay(cell.date)"
          >
            <span
              class="flex h-8 w-8 items-center justify-center rounded-full text-sm tabular-nums transition-all duration-200"
              :class="numberClass(cell)"
            >
              {{ cell.date.getDate() }}
            </span>

            <!-- 状态条：贴底一根细条，长度=当天事项量，分段颜色=状态分布（无孤点、无文字） -->
            <span
              v-if="cell.mark?.total"
              class="pointer-events-none absolute inset-x-2 bottom-1.5 flex h-[3px] overflow-hidden rounded-full bg-foreground/[0.06]"
              aria-hidden="true"
            >
              <span
                class="flex h-full overflow-hidden rounded-full transition-[width] duration-300 ease-out"
                :style="{ width: cell.mark.width }"
              >
                <span
                  v-for="segment in cell.mark.segments"
                  :key="segment.status"
                  class="h-full"
                  :class="segment.dotClass"
                  :style="{ flexGrow: segment.count }"
                />
              </span>
            </span>
          </button>
        </div>
      </Transition>
    </div>

    <!-- 底部脚注：状态计数（小短条与格内状态条同构，直接充当图例） -->
    <div class="mt-3.5 flex items-center gap-5 border-t pt-3.5">
      <span v-for="stat in monthStats" :key="stat.status" class="inline-flex items-center gap-2">
        <span class="h-[3px] w-4 rounded-full" :class="stat.dotClass" />
        <span class="text-[11px] text-muted-foreground">{{ stat.label }}</span>
        <span class="text-[13px] font-semibold tabular-nums">{{ stat.count }}</span>
      </span>
    </div>
  </section>
</template>

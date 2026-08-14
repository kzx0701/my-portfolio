<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { CalendarDate, DateFormatter, getLocalTimeZone, today, type DateValue } from '@internationalized/date'
import { CalendarIcon } from '@lucide/vue'
import { Calendar, Popover, PopoverContent, PopoverTrigger } from '@/components/ui'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    /** 日期字符串（YYYY-MM-DD），兼容数据库 date 列 */
    modelValue?: string | null
    placeholder?: string
    class?: string
  }>(),
  { placeholder: '请选择日期' },
)

const emit = defineEmits<{ 'update:modelValue': [value: string | null] }>()

const open = ref(false)

const df = new DateFormatter('zh-CN', { dateStyle: 'medium' })

/** 'YYYY-MM-DD' → CalendarDate */
function parseDate(value: string | null | undefined): CalendarDate | null {
  if (!value) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return null
  return new CalendarDate(Number(m[1]), Number(m[2]), Number(m[3]))
}

const date = computed<CalendarDate | null>({
  get: () => parseDate(props.modelValue),
  set: (d) => {
    emit(
      'update:modelValue',
      d ? `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}` : null,
    )
  },
})

const display = computed(() =>
  date.value ? df.format(date.value.toDate(getLocalTimeZone())) : props.placeholder,
)

// ---- 年月快速选择：通过受控 placeholder 驱动日历直接跳转到目标年月 ----
/**
 * 当前视图年月（Calendar 的 placeholder），初始定位到已选日期或今天。
 * 用 shallowRef 而非 ref：ref 的 UnwrapRef 会把 CalendarDate 类实例拆成无 #private
 * 的结构类型，与 reka-ui 的 DateValue 不兼容；shallowRef 保留完整类类型
 */
const placeholderDate = shallowRef<CalendarDate>(parseDate(props.modelValue) ?? today(getLocalTimeZone()))

/** 外部 modelValue 变化时同步视图（如编辑回填、清除后回到今天） */
watch(
  () => props.modelValue,
  (v) => {
    if (v) placeholderDate.value = parseDate(v) ?? placeholderDate.value
  },
)

/** Calendar 内部翻页会 emit 新的 DateValue（可能为 CalendarDateTime 等），统一转回 CalendarDate 同步视图 */
function onPlaceholderChange(d: DateValue) {
  placeholderDate.value = new CalendarDate(d.year, d.month, d.day)
}

/**
 * 通过函数返回 placeholder（而非模板 ref 解包）：
 * vue-tsc 对 ref 解包会推断出不含 #private 的结构类型，与 reka-ui 的 DateValue
 * 联合类型不兼容；函数返回保留 CalendarDate 类类型，可正常赋值
 */
function getPlaceholder(): CalendarDate {
  return placeholderDate.value
}

/** 年份选项：1950 ~ 当前年（覆盖出生日期等历史场景） */
const yearOptions = computed(() => {
  const current = today(getLocalTimeZone()).year
  const years: number[] = []
  for (let y = current; y >= 1950; y--) years.push(y)
  return years
})

const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)

/** 切换时把 day 置 1，避免 31 日落在小月产生非法日期 */
const viewYear = computed({
  get: () => placeholderDate.value.year,
  set: (y: number) => {
    placeholderDate.value = placeholderDate.value.set({ year: y, day: 1 })
  },
})

const viewMonth = computed({
  get: () => placeholderDate.value.month,
  set: (m: number) => {
    placeholderDate.value = placeholderDate.value.set({ month: m, day: 1 })
  },
})
</script>

<template>
  <Popover v-slot="{ close }" :open="open" @update:open="(v) => (open = v)">
    <!-- 与项目 Select 同模式：PopoverTrigger 直渲染（不用 asChild 包自定义组件，
         避免多层包装导致 reka-ui 锚点引用失效 → PopperRoot 更新时 parentNode 报错） -->
    <PopoverTrigger
      :class="
        cn(
          'inline-flex h-9 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
          'justify-start text-left font-normal',
          !date && 'text-muted-foreground',
          props.class,
        )
      "
    >
      <CalendarIcon class="h-4 w-4 shrink-0 opacity-70" />
      <span class="flex-1 truncate">{{ display }}</span>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0" align="start">
      <!-- 年月快速选择（原生 select：避免 reka-ui Select 嵌套 Popover 的锚点/关闭冲突） -->
      <div class="flex items-center gap-2 border-b px-3 py-2">
        <select
          v-model.number="viewYear"
          aria-label="选择年份"
          class="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option v-for="y in yearOptions" :key="y" :value="y">{{ y }} 年</option>
        </select>
        <select
          v-model.number="viewMonth"
          aria-label="选择月份"
          class="h-8 w-24 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option v-for="m in monthOptions" :key="m" :value="m">{{ m }} 月</option>
        </select>
      </div>
      <Calendar
        v-model="date"
        :placeholder="getPlaceholder()"
        hide-header
        locale="zh-CN"
        weekday-format="narrow"
        initial-focus
        @update:model-value="close"
        @update:placeholder="onPlaceholderChange"
      />
    </PopoverContent>
  </Popover>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { CalendarDate, DateFormatter, getLocalTimeZone, today } from '@internationalized/date'
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

const defaultPlaceholder = today(getLocalTimeZone())

const display = computed(() =>
  date.value ? df.format(date.value.toDate(getLocalTimeZone())) : props.placeholder,
)
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
      <!-- 必须显式传 placeholder（非受控初始值）：reka-ui useVModel 在未传 placeholder 时
           passive 模式直接读 props.placeholder.value → undefined → useCalendar 崩溃 -->
      <Calendar
        v-model="date"
        :placeholder="defaultPlaceholder"
        locale="zh-CN"
        weekday-format="narrow"
        initial-focus
        @update:model-value="close"
      />
    </PopoverContent>
  </Popover>
</template>

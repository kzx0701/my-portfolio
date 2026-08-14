<script setup lang="ts">
import { computed, type HTMLAttributes } from 'vue'
import {
  CalendarCell,
  CalendarCellTrigger,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHead,
  CalendarGridRow,
  CalendarHeadCell,
  CalendarHeader,
  CalendarHeading,
  CalendarNext,
  CalendarPrev,
  CalendarRoot,
  type CalendarRootEmits,
  type CalendarRootProps,
} from 'reka-ui'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from '@lucide/vue'

const props = defineProps<
  CalendarRootProps & {
    class?: HTMLAttributes['class']
    /** 隐藏默认头部（年月 + 翻页按钮），由外部提供自定义导航（如年月下拉） */
    hideHeader?: boolean
  }
>()
const emits = defineEmits<CalendarRootEmits>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props
  return delegated
})
</script>

<template>
  <CalendarRoot
    v-slot="{ grid, weekDays }"
    v-bind="delegatedProps"
    :class="cn('p-3', props.class)"
    @update:model-value="emits('update:modelValue', $event)"
    @update:placeholder="emits('update:placeholder', $event)"
  >
    <CalendarHeader v-if="!props.hideHeader" class="flex items-center justify-between pt-1">
      <CalendarPrev
        class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-input bg-transparent text-sm font-medium opacity-50 shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
      >
        <ChevronLeft class="h-4 w-4" />
      </CalendarPrev>
      <CalendarHeading class="text-sm font-medium" />
      <CalendarNext
        class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-input bg-transparent text-sm font-medium opacity-50 shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
      >
        <ChevronRight class="h-4 w-4" />
      </CalendarNext>
    </CalendarHeader>
    <div class="mt-4 flex flex-col gap-1">
      <CalendarGrid class="w-full border-collapse">
        <CalendarGridHead>
          <CalendarGridRow>
            <CalendarHeadCell
              v-for="(day, i) in weekDays"
              :key="i"
              class="h-7 w-8 text-[0.8rem] font-normal text-muted-foreground"
            >
              {{ day }}
            </CalendarHeadCell>
          </CalendarGridRow>
        </CalendarGridHead>
        <CalendarGridBody>
          <!-- reka-ui grid 结构：月对象数组 [{ value, cells, rows }]，rows 为 6 周 × 7 天 -->
          <template v-for="(month, monthIndex) in grid" :key="monthIndex">
            <CalendarGridRow
              v-for="(week, weekIndex) in month.rows"
              :key="`${monthIndex}-${weekIndex}`"
            >
              <CalendarCell
                v-for="(date, dateIndex) in week"
                :key="dateIndex"
                :date="date"
                class="relative h-7 w-8 p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([data-selected])]:bg-accent [&:has([data-selected][data-selected])]:rounded-md [&:has([data-selected][data-selected])]:bg-primary [&:has([data-selected][data-selected])]:text-primary-foreground"
              >
                <CalendarCellTrigger
                  :day="date"
                  :month="month.value"
                  class="relative h-7 w-8 rounded-md p-0 text-sm font-normal data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[outside-view]:text-muted-foreground data-[outside-view]:opacity-50 data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[selected]:opacity-100 data-[today]:bg-accent data-[today]:text-accent-foreground"
                />
              </CalendarCell>
            </CalendarGridRow>
          </template>
        </CalendarGridBody>
      </CalendarGrid>
    </div>
  </CalendarRoot>
</template>

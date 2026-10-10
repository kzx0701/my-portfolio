<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useRoute } from 'vue-router'
import { CalendarCheck2 } from '@lucide/vue'
import { WorklogDayPanel, WorklogMonthCalendar } from '@/modules/worklog/components'
import { calendarRange, fromDateKey, toDateKey } from '@/modules/worklog/date'
import { useWorklogStore } from '@/modules/worklog/store'

const route = useRoute()
const store = useWorklogStore()
const queryDate = typeof route.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(route.query.date)
  ? route.query.date
  : null
const selectedDate = ref(queryDate ?? toDateKey(new Date()))
const initialRange = calendarRange(fromDateKey(selectedDate.value))
const currentRange = ref({ start: initialRange.start, end: initialRange.end })
const dayPanel = ref<HTMLElement | null>(null)

const selectedItems = computed(() => store.itemsForDate(selectedDate.value))

async function handleRangeChange(start: string, end: string, force = false) {
  currentRange.value = { start, end }
  await store.fetchRange(start, end, force)
}

async function handleSelected(date: string) {
  selectedDate.value = date
  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
    await nextTick()
    dayPanel.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-5">
    <div class="flex items-center gap-3">
      <div
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-md shadow-sky-500/25"
        :style="{ viewTransitionName: 'vt-worklog' }"
      >
        <CalendarCheck2 class="h-5 w-5" />
      </div>
      <div>
        <h2 class="text-lg font-semibold">工作日志</h2>
        <p class="text-xs text-muted-foreground">点选左侧日期，右边记录这一天做了什么。</p>
      </div>
    </div>

    <div
      v-if="store.error"
      class="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
    >
      加载失败：{{ store.error }}。可点击日历右上角刷新重试。
    </div>

    <div
      class="grid min-h-[36rem] overflow-hidden rounded-2xl border bg-card shadow-[0_16px_50px_-40px_rgba(15,23,42,0.45)] lg:h-[clamp(36rem,calc(100dvh-12rem),40rem)] lg:grid-cols-[minmax(0,1.6fr)_minmax(22rem,0.9fr)]"
    >
      <WorklogMonthCalendar
        :model-value="selectedDate"
        :items="store.items"
        :loading="store.loading"
        @update:model-value="handleSelected"
        @range-change="handleRangeChange"
      />
      <div ref="dayPanel" class="h-full min-h-0 scroll-mt-4 overflow-hidden border-t lg:border-l lg:border-t-0">
        <WorklogDayPanel
          :work-date="selectedDate"
          :items="selectedItems"
          :loading="store.loading"
        />
      </div>
    </div>
  </div>
</template>

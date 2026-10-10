<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  ArrowRight,
  CalendarCheck2,
  Check,
  Circle,
  Clock3,
  RotateCw,
} from '@lucide/vue'
import { Badge, Button, Skeleton } from '@/components/ui'
import { toast } from '@/lib/toast'
import { WorklogStatsCards } from '@/modules/worklog/components'
import { formatMonthDay, toDateKey } from '@/modules/worklog/date'
import { useWorklogStore } from '@/modules/worklog/store'
import type { WorkLogItem } from '@/modules/worklog/types'

const store = useWorklogStore()
const refreshing = ref(false)
const busyIds = ref<Set<string>>(new Set())
const today = toDateKey(new Date())

onMounted(() => {
  store.fetchDashboard()
})

function setBusy(id: string, busy: boolean) {
  const next = new Set(busyIds.value)
  if (busy) next.add(id)
  else next.delete(id)
  busyIds.value = next
}

async function handleRefresh(showToast = true) {
  refreshing.value = true
  try {
    const ok = await store.fetchDashboard(true)
    if (showToast) toast(ok ? '数据已刷新' : '刷新失败，请重试', ok ? 'success' : 'error')
  } finally {
    refreshing.value = false
  }
}

async function complete(item: WorkLogItem) {
  setBusy(item.id, true)
  try {
    await store.changeStatus(item.id, 'completed')
    await handleRefresh(false)
    toast('已完成一项工作', 'success')
  } catch (caught: any) {
    toast(caught?.message ?? '更新失败', 'error')
  } finally {
    setBusy(item.id, false)
  }
}

function dateLabel(date: string): string {
  if (date === today) return '今天'
  return formatMonthDay(date)
}

function completedTime(item: WorkLogItem): string {
  if (!item.completed_at) return dateLabel(item.work_date)
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(item.completed_at))
}
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-6">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-md shadow-sky-500/25"
          :style="{ viewTransitionName: 'vt-worklog' }"
        >
          <CalendarCheck2 class="h-5 w-5" />
        </div>
        <div>
          <h2 class="text-lg font-semibold">仪表盘</h2>
          <p class="text-xs text-muted-foreground">聚焦尚未完成的工作，回看最近的进展。</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="outline" :disabled="refreshing || store.dashboardLoading" @click="handleRefresh()">
          <RotateCw class="h-4 w-4" :class="refreshing && 'animate-spin'" />
          <span class="hidden sm:inline">刷新</span>
        </Button>
        <RouterLink :to="{ path: '/worklog/list', query: { date: today } }">
          <Button>
            打开日历
            <ArrowRight class="h-4 w-4" />
          </Button>
        </RouterLink>
      </div>
    </div>

    <WorklogStatsCards />

    <div
      v-if="store.dashboardError"
      class="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
    >
      加载失败：{{ store.dashboardError }}
    </div>

    <div class="grid items-start gap-4 lg:grid-cols-[1.25fr_0.75fr]">
      <section class="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div class="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h3 class="text-sm font-semibold">待处理事项</h3>
            <p class="mt-0.5 text-xs text-muted-foreground">尚未完成的事项，按安排日期从早到晚</p>
          </div>
          <RouterLink
            to="/worklog/list"
            class="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-sky-600"
          >
            日历视图<ArrowRight class="h-3.5 w-3.5" />
          </RouterLink>
        </div>

        <div v-if="store.dashboardLoading" class="space-y-3 p-5">
          <Skeleton v-for="i in 5" :key="i" class="h-14 rounded-lg" />
        </div>
        <ul v-else-if="store.dashboardPending.length" class="divide-y px-5">
          <li v-for="item in store.dashboardPending" :key="item.id" class="flex items-center gap-3 py-3.5">
            <button
              type="button"
              class="shrink-0 rounded-full text-amber-500 outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-50"
              :disabled="busyIds.has(item.id)"
              aria-label="标记完成"
              @click="complete(item)"
            >
              <Circle class="h-5 w-5" />
            </button>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">{{ item.title }}</p>
              <p v-if="item.description" class="mt-0.5 truncate text-xs text-muted-foreground">{{ item.description }}</p>
            </div>
            <Badge
              variant="outline"
              :class="item.work_date === today
                ? 'border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300'
                : 'border-border text-muted-foreground'"
            >
              {{ dateLabel(item.work_date) }}
            </Badge>
          </li>
        </ul>
        <div v-else class="flex min-h-64 flex-col items-center justify-center px-5 text-center">
          <Check class="h-8 w-8 text-emerald-500" />
          <p class="mt-3 text-sm font-medium">当前没有待处理事项</p>
          <p class="mt-1 text-xs text-muted-foreground">很好，去日历里安排下一件值得完成的事。</p>
        </div>
      </section>

      <section class="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div class="border-b px-5 py-4">
          <h3 class="text-sm font-semibold">最近完成</h3>
          <p class="mt-0.5 text-xs text-muted-foreground">最近留下的工作足迹</p>
        </div>
        <div v-if="store.dashboardLoading" class="space-y-3 p-5">
          <Skeleton v-for="i in 5" :key="i" class="h-11 rounded-lg" />
        </div>
        <ul v-else-if="store.recentCompleted.length" class="divide-y px-5">
          <li v-for="item in store.recentCompleted" :key="item.id" class="flex items-start gap-3 py-3.5">
            <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Check class="h-3 w-3" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">{{ item.title }}</p>
              <p class="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock3 class="h-3 w-3" />{{ completedTime(item) }}
              </p>
            </div>
          </li>
        </ul>
        <div v-else class="flex min-h-64 flex-col items-center justify-center px-5 text-center text-muted-foreground">
          <Clock3 class="h-8 w-8 opacity-60" />
          <p class="mt-3 text-sm">完成事项后，工作足迹会出现在这里。</p>
        </div>
      </section>
    </div>
  </div>
</template>

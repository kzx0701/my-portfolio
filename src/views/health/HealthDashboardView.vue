<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowRight, HeartPulse, Plus, Target } from '@lucide/vue'
import { Button, Card, Progress, Skeleton } from '@/components/ui'
import { useHealthStore } from '@/modules/health/store'
import { HealthCharts, HealthStatsCards } from '@/modules/health/components'
import {
  GOAL_TYPE_META,
  calcGoalProgress,
  goalDaysLeftLabel,
  goalProgressStyle,
  resolveBMI,
  type HealthGoal,
  type HealthRecord,
} from '@/modules/health/types'

const store = useHealthStore()

/** 仪表盘数据是否加载完成（加载完成前显示骨架，避免误闪空态） */
const loaded = ref(false)

onMounted(async () => {
  await Promise.all([store.fetchRecords(), store.fetchProfile(), store.fetchGoals()])
  loaded.value = true
})

/** 最近一次体重（目标进度与最近记录用） */
const latestWeight = computed<number | null>(() => {
  for (const r of store.records) {
    if (r.weight_kg !== null) return r.weight_kg
  }
  return null
})

/** 进行中目标（最多展示 3 个） */
const inProgressGoals = computed(() =>
  store.goals.filter((g) => g.status === 'in_progress').slice(0, 3),
)

/** 最近健康记录（多展示一些，撑起右侧高度） */
const recentRecords = computed(() => store.records.slice(0, 10))

/** 是否完全无数据（引导建档） */
const isEmpty = computed(() => store.records.length === 0 && store.goals.length === 0)

/** 最近记录 BMI 展示（手动优先，留空自动计算） */
function recordBMI(record: HealthRecord): string {
  const bmi = resolveBMI(record.bmi, record.weight_kg, store.profile?.height_cm ?? null)
  return bmi === null ? '—' : bmi.toFixed(2)
}

function goalTypeLabel(g: HealthGoal): string {
  return g.goal_type ? GOAL_TYPE_META[g.goal_type].label : '目标'
}
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-6">
    <!-- 标题区（logo 与首页卡片同 viewTransitionName，实现 VT 共享元素 morphing） -->
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-teal-500 text-white shadow-md shadow-sky-500/25"
          :style="{ viewTransitionName: 'vt-health' }"
        >
          <HeartPulse class="h-5 w-5" />
        </div>
        <div>
          <h2 class="text-lg font-semibold">仪表盘</h2>
        </div>
      </div>
    </div>

    <!-- 加载中：骨架屏（统计卡 + 图表区 + 右侧卡） -->
    <template v-if="!loaded">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton v-for="i in 4" :key="i" class="h-[104px] rounded-xl" />
      </div>
      <div class="grid items-start gap-4 lg:grid-cols-3">
        <div class="space-y-4 lg:col-span-2">
          <Skeleton class="h-[360px] rounded-lg" />
          <Skeleton class="h-[310px] rounded-lg" />
        </div>
        <div class="space-y-4">
          <Skeleton class="h-[180px] rounded-lg" />
          <Skeleton class="h-[440px] rounded-lg" />
        </div>
      </div>
    </template>

    <!-- 加载完成：淡入出场 -->
    <template v-else>
      <!-- 完全无数据：引导 -->
      <Card
        v-if="isEmpty"
        class="flex animate-in flex-col items-center justify-center gap-4 border-dashed py-20 text-center fade-in [animation-duration:400ms]"
      >
        <HeartPulse class="h-12 w-12 text-muted-foreground/60" />
        <div class="space-y-1">
          <p class="font-medium">还没有健康数据</p>
          <p class="text-sm text-muted-foreground">先记录体重、设定目标，这里将展示你的健康趋势</p>
        </div>
        <div class="flex gap-3">
          <RouterLink to="/health/records">
            <Button>
              <Plus class="h-4 w-4" />
              去记录
            </Button>
          </RouterLink>
          <RouterLink to="/health/goal">
            <Button variant="outline">
              <Target class="h-4 w-4" />
              设定目标
            </Button>
          </RouterLink>
        </div>
      </Card>

      <template v-else>
        <!-- 统计卡（首块先入场） -->
        <div class="animate-in fade-in slide-in-from-bottom-2 [animation-duration:400ms]">
          <HealthStatsCards />
        </div>

        <!-- 主区：左图表 + 右概览（左右等高，延迟入场） -->
        <div class="grid animate-in gap-4 fade-in slide-in-from-bottom-2 [animation-duration:400ms] [animation-delay:80ms] lg:grid-cols-3">
          <!-- 左：体重 / BMI 趋势 -->
          <div class="space-y-4 lg:col-span-2">
            <HealthCharts />
          </div>

        <!-- 右：进行中目标 + 最近记录（最近记录拉伸填满，与左侧等高） -->
        <div class="flex flex-col gap-4">
          <div class="rounded-lg border p-4">
            <div class="mb-3 flex items-center justify-between">
              <h3 class="text-sm font-semibold">进行中目标</h3>
              <RouterLink
                to="/health/goal"
                class="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
              >
                查看全部
                <ArrowRight class="h-3.5 w-3.5" />
              </RouterLink>
            </div>
            <ul v-if="inProgressGoals.length > 0" class="space-y-3.5">
              <li v-for="g in inProgressGoals" :key="g.id">
                <div class="flex items-center justify-between text-sm">
                  <span class="font-medium">{{ goalTypeLabel(g) }}</span>
                  <span class="text-xs text-muted-foreground">
                    {{ goalDaysLeftLabel(calcGoalProgress(g, latestWeight).daysLeft) }}
                  </span>
                </div>
                <Progress
                  :model-value="calcGoalProgress(g, latestWeight).progress ?? 0"
                  :indicator-style="goalProgressStyle(calcGoalProgress(g, latestWeight).progress)"
                  class="mt-1.5 h-1.5"
                />
                <p class="mt-1 text-xs text-muted-foreground tabular-nums">
                  {{
                    calcGoalProgress(g, latestWeight).current !== null
                      ? `${calcGoalProgress(g, latestWeight).current} → ${g.target_weight_kg} kg`
                      : `目标 ${g.target_weight_kg ?? '—'} kg`
                  }}
                </p>
              </li>
            </ul>
            <p v-else class="text-sm text-muted-foreground">暂无进行中的目标</p>
          </div>

          <!-- 最近记录（10 条自然行高填充；flex-1 仅作等高兜底） -->
          <div class="flex flex-1 flex-col rounded-lg border p-4">
            <div class="mb-2 flex items-center justify-between">
              <h3 class="text-sm font-semibold">最近记录</h3>
              <RouterLink
                to="/health/records"
                class="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
              >
                查看全部
                <ArrowRight class="h-3.5 w-3.5" />
              </RouterLink>
            </div>
            <ul v-if="recentRecords.length > 0" class="divide-y">
              <li
                v-for="r in recentRecords"
                :key="r.id"
                class="flex items-center justify-between gap-2 py-2 text-sm"
              >
                <span class="whitespace-nowrap text-muted-foreground tabular-nums">{{ r.record_date }}</span>
                <span class="font-medium tabular-nums">{{ r.weight_kg?.toFixed(2) ?? '—' }} kg</span>
                <span class="whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                  BMI {{ recordBMI(r) }}
                </span>
              </li>
            </ul>
            <p v-else class="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              暂无健康记录
            </p>
          </div>
        </div>
      </div>
      </template>
    </template>
  </div>
</template>

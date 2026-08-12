<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowLeft, Activity, Briefcase, CheckCircle2, Wallet } from '@lucide/vue'
import type { EChartsCoreOption } from 'echarts/core'
import EChart from '@/components/EChart.vue'
import { Skeleton } from '@/components/ui'
import { StatCard } from '@/modules/orders/components'
import { useOrdersStore } from '@/modules/orders/store'
import { ORDER_STATUS_META, type OrderStatus } from '@/modules/orders/types'

const store = useOrdersStore()

onMounted(() => {
  store.fetchOrders()
})

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(value)
}

/** 状态 → 图表配色（与 ORDER_STATUS_META 的 key 对应） */
const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: '#a1a1aa', // 待报价
  negotiating: '#f59e0b', // 洽谈中
  in_progress: '#6366f1', // 进行中
  completed: '#22d3ee', // 已完成
  paid: '#16a34a', // 已回款
  cancelled: '#ef4444', // 已取消
}

const AXIS_COLOR = '#71717a'
const AXIS_LINE = 'rgba(128, 128, 128, 0.35)'
const SPLIT_LINE = 'rgba(128, 128, 128, 0.18)'

/** 状态分布（环形图数据） */
const statusData = computed(() => {
  const counts = new Map<OrderStatus, number>()
  for (const key of Object.keys(ORDER_STATUS_META) as OrderStatus[]) counts.set(key, 0)
  for (const o of store.orders) counts.set(o.status, (counts.get(o.status) ?? 0) + 1)
  return (Object.keys(ORDER_STATUS_META) as OrderStatus[]).map((key) => ({
    name: ORDER_STATUS_META[key].label,
    value: counts.get(key) ?? 0,
    itemStyle: { color: STATUS_COLORS[key] },
  }))
})

/** 月度金额趋势（按 created_at 月份聚合：订单总额 / 已回款） */
const monthlyData = computed(() => {
  const byMonth: Record<string, { total: number; paid: number }> = {}
  for (const o of store.orders) {
    const month = (o.created_at ?? o.start_date ?? '').slice(0, 7)
    if (!month) continue
    byMonth[month] ??= { total: 0, paid: 0 }
    byMonth[month].total += o.amount ?? 0
    if (o.status === 'paid') byMonth[month].paid += o.amount ?? 0
  }
  const months = Object.keys(byMonth).sort()
  return {
    months,
    total: months.map((m) => byMonth[m].total),
    paid: months.map((m) => byMonth[m].paid),
  }
})

/** 进行中订单的进度（横向条形图数据，最多展示 8 条） */
const progressData = computed(() =>
  store.orders
    .filter((o) => o.status === 'in_progress')
    .slice(0, 8)
    .map((o) => ({ name: o.project_name, value: o.progress }))
    .reverse(),
)

const statusOption = computed<EChartsCoreOption>(() => ({
  tooltip: { trigger: 'item' },
  legend: {
    bottom: 0,
    icon: 'circle',
    textStyle: { color: AXIS_COLOR, fontSize: 12 },
  },
  series: [
    {
      name: '订单状态',
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6 },
      label: { show: false },
      emphasis: { label: { show: true, fontWeight: 500 } },
      data: statusData.value,
    },
  ],
}))

const monthlyOption = computed<EChartsCoreOption>(() => ({
  tooltip: {
    trigger: 'axis',
    valueFormatter: (v: unknown) => formatCurrency(Number(v)),
  },
  legend: {
    bottom: 0,
    icon: 'circle',
    textStyle: { color: AXIS_COLOR, fontSize: 12 },
  },
  grid: { left: 16, right: 16, top: 24, bottom: 48, containLabel: true },
  xAxis: {
    type: 'category',
    data: monthlyData.value.months,
    axisLine: { lineStyle: { color: AXIS_LINE } },
    axisLabel: { color: AXIS_COLOR },
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: SPLIT_LINE } },
    axisLabel: { color: AXIS_COLOR },
  },
  series: [
    {
      name: '订单总额',
      type: 'bar',
      data: monthlyData.value.total,
      barMaxWidth: 26,
      itemStyle: { color: '#6366f1', borderRadius: [4, 4, 0, 0] },
    },
    {
      name: '已回款',
      type: 'bar',
      data: monthlyData.value.paid,
      barMaxWidth: 26,
      itemStyle: { color: '#16a34a', borderRadius: [4, 4, 0, 0] },
    },
  ],
}))

const progressOption = computed<EChartsCoreOption>(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    valueFormatter: (v: unknown) => `${v}%`,
  },
  grid: { left: 16, right: 40, top: 8, bottom: 8, containLabel: true },
  xAxis: {
    type: 'value',
    min: 0,
    max: 100,
    splitLine: { lineStyle: { color: SPLIT_LINE } },
    axisLabel: { color: AXIS_COLOR },
  },
  yAxis: {
    type: 'category',
    data: progressData.value.map((d) => d.name),
    axisLine: { lineStyle: { color: AXIS_LINE } },
    axisLabel: { color: AXIS_COLOR, width: 120, overflow: 'truncate' },
  },
  series: [
    {
      name: '进度',
      type: 'bar',
      data: progressData.value.map((d) => d.value),
      barMaxWidth: 18,
      itemStyle: { color: '#6366f1', borderRadius: [0, 4, 4, 0] },
      label: {
        show: true,
        position: 'right',
        formatter: '{c}%',
        color: AXIS_COLOR,
        fontSize: 12,
      },
    },
  ],
}))
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6">
    <!-- 工具栏 -->
    <div class="flex items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold">数据统计</h2>
        <p class="text-sm text-muted-foreground">订单状态、金额与进度的可视化总览</p>
      </div>
      <RouterLink
        to="/orders"
        class="inline-flex shrink-0 items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <ArrowLeft class="h-4 w-4" />
        返回接单列表
      </RouterLink>
    </div>

    <!-- 统计卡片 -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard title="进行中" :value="store.stats.active" :icon="Activity" hint="未完成 / 未取消" />
      <StatCard title="总订单" :value="store.stats.total" :icon="Briefcase" />
      <StatCard title="已完成" :value="store.stats.completed" :icon="CheckCircle2" />
      <StatCard title="累计回款" :value="formatCurrency(store.stats.paidTotal)" :icon="Wallet" />
    </div>

    <!-- 图表区 -->
    <div v-if="store.loading" class="space-y-2">
      <Skeleton v-for="i in 3" :key="i" class="h-64 w-full" />
    </div>
    <div
      v-else-if="store.error"
      class="rounded-lg border border-destructive/50 p-6 text-center text-sm text-destructive"
    >
      加载失败：{{ store.error }}
    </div>
    <div
      v-else-if="store.orders.length === 0"
      class="rounded-lg border border-dashed p-12 text-center text-muted-foreground"
    >
      暂无订单数据，先去「接单列表」新建一笔订单吧。
    </div>
    <div v-else class="grid gap-4 lg:grid-cols-2">
      <div class="rounded-lg border p-4">
        <h3 class="mb-2 text-sm font-semibold">订单状态分布</h3>
        <EChart :option="statusOption" height="280px" />
      </div>
      <div class="rounded-lg border p-4">
        <h3 class="mb-2 text-sm font-semibold">月度金额趋势</h3>
        <EChart :option="monthlyOption" height="280px" />
      </div>
      <div class="rounded-lg border p-4 lg:col-span-2">
        <h3 class="mb-2 text-sm font-semibold">进行中订单进度</h3>
        <EChart v-if="progressData.length > 0" :option="progressOption" height="240px" />
        <p v-else class="py-16 text-center text-sm text-muted-foreground">
          当前没有进行中的订单。
        </p>
      </div>
    </div>
  </div>
</template>

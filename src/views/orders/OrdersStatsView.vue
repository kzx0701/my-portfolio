<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowLeft, ClipboardList } from '@lucide/vue'
import type { EChartsCoreOption } from 'echarts/core'
import EChart from '@/components/EChart.vue'
import { Skeleton } from '@/components/ui'
import { StatsCards } from '@/modules/orders/components'
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
  negotiating: '#f59e0b', // 洽谈中
  quoted: '#14b8a6', // 已报价
  in_progress: '#6366f1', // 进行中
  completed: '#22d3ee', // 已完成
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

/** 月度金额趋势（按 created_at 月份聚合：订单总额 / 已完成金额） */
const monthlyData = computed(() => {
  const byMonth: Record<string, { total: number; completed: number }> = {}
  for (const o of store.orders) {
    const month = (o.created_at ?? o.start_date ?? '').slice(0, 7)
    if (!month) continue
    byMonth[month] ??= { total: 0, completed: 0 }
    byMonth[month].total += o.amount ?? 0
    if (o.status === 'completed') byMonth[month].completed += o.amount ?? 0
  }
  const months = Object.keys(byMonth).sort()
  return {
    months,
    total: months.map((m) => byMonth[m].total),
    completed: months.map((m) => byMonth[m].completed),
  }
})

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
      name: '已完成金额',
      type: 'bar',
      data: monthlyData.value.completed,
      barMaxWidth: 26,
      itemStyle: { color: '#22d3ee', borderRadius: [4, 4, 0, 0] },
    },
  ],
}))
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-6">
    <!-- 工具栏 -->
    <div class="flex items-center justify-between gap-3">
      <!-- 标题区（logo 与首页卡片同 viewTransitionName，实现 VT 共享元素 morphing） -->
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-teal-500 text-white shadow-md shadow-sky-500/25"
          :style="{ viewTransitionName: 'vt-orders' }"
        >
          <ClipboardList class="h-5 w-5" />
        </div>
        <div>
          <h2 class="text-lg font-semibold">数据统计</h2>
        </div>
      </div>
      <RouterLink
        to="/orders/list"
        class="inline-flex shrink-0 items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <ArrowLeft class="h-4 w-4" />
        返回订单列表
      </RouterLink>
    </div>

    <!-- 统计卡片（三页共用组件） -->
    <StatsCards />

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
    </div>
  </div>
</template>

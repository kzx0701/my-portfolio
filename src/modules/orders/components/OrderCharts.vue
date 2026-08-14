<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsCoreOption } from 'echarts/core'
import EChart from '@/components/EChart.vue'
import { useOrdersStore } from '@/modules/orders/store'
import {
  ORDER_CHANNEL_META,
  ORDER_STATUS_META,
  PROJECT_TYPE_META,
  type OrderStatus,
  type ProjectType,
} from '@/modules/orders/types'

const store = useOrdersStore()

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(value)
}

/** '2026-08' → '2026年8月'（月度趋势 x 轴中文格式） */
function formatMonth(month: string): string {
  const [y, m] = month.split('-')
  return `${y}年${Number(m)}月`
}

/** 状态 → 图表配色（与 ORDER_STATUS_META 的 key 对应） */
const STATUS_COLORS: Record<OrderStatus, string> = {
  negotiating: '#f59e0b', // 洽谈中
  quoted: '#14b8a6', // 已报价
  in_progress: '#6366f1', // 进行中
  completed: '#22d3ee', // 已完成
  cancelled: '#ef4444', // 已取消
}

/** 项目类型 → 图表配色（与列表 tag 语义一致） */
const TYPE_COLORS: Record<ProjectType, string> = {
  web: '#0ea5e9', // sky
  app: '#8b5cf6', // violet
  miniapp: '#10b981', // emerald
  other: '#9ca3af', // gray
}

/** 渠道 → 图表配色 */
const CHANNEL_COLORS: Record<string, string> = {
  xianyu: '#fbbf24',
  wechat: '#22c55e',
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

/** 月度金额趋势：订单金额（按 created_at 月份）+ 回款金额（按 paid_at 月份） */
const monthlyData = computed(() => {
  const byMonth: Record<string, { orders: number; paid: number }> = {}
  for (const o of store.orders) {
    const month = (o.created_at ?? '').slice(0, 7)
    if (!month) continue
    byMonth[month] ??= { orders: 0, paid: 0 }
    byMonth[month].orders += o.amount ?? 0
  }
  for (const list of Object.values(store.paymentsMap)) {
    for (const p of list) {
      const month = (p.paid_at ?? '').slice(0, 7)
      if (!month) continue
      byMonth[month] ??= { orders: 0, paid: 0 }
      byMonth[month].paid += p.amount ?? 0
    }
  }
  const months = Object.keys(byMonth).sort()
  return {
    months,
    orders: months.map((m) => byMonth[m].orders),
    paid: months.map((m) => byMonth[m].paid),
  }
})

/** 项目类型分布（各类型订单数量，横向条形图） */
const typeData = computed(() => {
  const count: Record<ProjectType, number> = { web: 0, app: 0, miniapp: 0, other: 0 }
  for (const o of store.orders) count[o.project_type ?? 'other'] += 1
  return (Object.keys(PROJECT_TYPE_META) as ProjectType[]).map((key) => ({
    name: PROJECT_TYPE_META[key].label,
    value: count[key],
    itemStyle: { color: TYPE_COLORS[key] },
  }))
})

/** 渠道分布（各渠道订单数量，环形图） */
const channelData = computed(() => {
  const count: Record<string, number> = {}
  for (const o of store.orders) {
    const c = o.channel ?? 'none'
    count[c] = (count[c] ?? 0) + 1
  }
  const labels: Record<string, string> = {
    xianyu: ORDER_CHANNEL_META.xianyu.label,
    wechat: ORDER_CHANNEL_META.wechat.label,
    none: '未标注',
  }
  return Object.entries(count).map(([k, v]) => ({
    name: labels[k] ?? k,
    value: v,
    itemStyle: { color: CHANNEL_COLORS[k] ?? '#a1a1aa' },
  }))
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
    data: monthlyData.value.months.map(formatMonth),
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
      name: '订单金额',
      type: 'bar',
      data: monthlyData.value.orders,
      barMaxWidth: 22,
      itemStyle: { color: '#6366f1', borderRadius: [4, 4, 0, 0] },
    },
    {
      name: '回款金额',
      type: 'bar',
      data: monthlyData.value.paid,
      barMaxWidth: 22,
      itemStyle: { color: '#14b8a6', borderRadius: [4, 4, 0, 0] },
    },
  ],
}))

const typeOption = computed<EChartsCoreOption>(() => ({
  tooltip: {
    trigger: 'axis',
    valueFormatter: (v: unknown) => `${Number(v)} 单`,
  },
  grid: { left: 16, right: 16, top: 12, bottom: 16, containLabel: true },
  xAxis: {
    type: 'value',
    minInterval: 1,
    splitLine: { lineStyle: { color: SPLIT_LINE } },
    axisLabel: { color: AXIS_COLOR },
  },
  yAxis: {
    type: 'category',
    data: typeData.value.map((d) => d.name),
    axisLine: { lineStyle: { color: AXIS_LINE } },
    axisLabel: { color: AXIS_COLOR },
  },
  series: [
    {
      name: '订单数',
      type: 'bar',
      data: typeData.value.map((d) => ({ value: d.value, itemStyle: d.itemStyle })),
      barMaxWidth: 18,
      itemStyle: { borderRadius: [0, 4, 4, 0] },
    },
  ],
}))

const channelOption = computed<EChartsCoreOption>(() => ({
  tooltip: { trigger: 'item' },
  legend: {
    bottom: 0,
    icon: 'circle',
    textStyle: { color: AXIS_COLOR, fontSize: 12 },
  },
  series: [
    {
      name: '渠道来源',
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6 },
      label: { show: false },
      emphasis: { label: { show: true, fontWeight: 500 } },
      data: channelData.value,
    },
  ],
}))
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2">
    <div class="rounded-lg border p-4">
      <h3 class="mb-2 text-sm font-semibold">订单状态分布</h3>
      <EChart :option="statusOption" height="260px" />
    </div>
    <div class="rounded-lg border p-4">
      <h3 class="mb-2 text-sm font-semibold">月度金额趋势</h3>
      <EChart :option="monthlyOption" height="260px" />
    </div>
    <div class="rounded-lg border p-4">
      <h3 class="mb-2 text-sm font-semibold">项目类型分布</h3>
      <EChart :option="typeOption" height="260px" />
    </div>
    <div class="rounded-lg border p-4">
      <h3 class="mb-2 text-sm font-semibold">渠道来源分布</h3>
      <EChart :option="channelOption" height="260px" />
    </div>
  </div>
</template>

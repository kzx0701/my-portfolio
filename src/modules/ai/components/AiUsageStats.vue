<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsCoreOption } from 'echarts/core'
import EChart from '@/components/EChart.vue'
import { useAiStore } from '@/modules/ai/store'
import { currentMonth } from '@/modules/ai/types'

const store = useAiStore()

/** 工具固定配色（轮转） */
const TOOL_COLORS = ['#0ea5e9', '#14b8a6', '#f59e0b', '#6366f1', '#10b981', '#f43f5e']

const AXIS_COLOR = '#71717a'
const AXIS_LINE = 'rgba(128, 128, 128, 0.35)'
const SPLIT_LINE = 'rgba(128, 128, 128, 0.18)'

/** 数字千分位（消费单位不统一：积分/金额，不做货币符号） */
function formatNum(v: number): string {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(v)
}

/** '2026-08' → '8月' */
function shortMonth(month: string): string {
  const [, m] = month.split('-')
  return `${Number(m)}月`
}

/** 近 6 个月（含当月）消费金额合计（按消费日期聚合到月份） */
const trendData = computed(() => {
  const months: string[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const amounts = months.map((m) =>
    store.usage.filter((u) => u.usage_date.slice(0, 7) === m).reduce((sum, u) => sum + u.amount, 0),
  )
  return { months, amounts }
})

/** 本月各工具消费分布（按 amount 聚合，环形图） */
const monthDistData = computed(() => {
  const current = currentMonth()
  const byService: Record<string, number> = {}
  for (const u of store.usage) {
    if (u.usage_date.slice(0, 7) !== current) continue
    byService[u.service_id] = (byService[u.service_id] ?? 0) + u.amount
  }
  const ids = Object.keys(byService)
  return ids.map((id, i) => ({
    name: store.services.find((s) => s.id === id)?.name ?? '未知工具',
    value: byService[id],
    itemStyle: { color: TOOL_COLORS[i % TOOL_COLORS.length] },
  }))
})

const trendOption = computed<EChartsCoreOption>(() => ({
  tooltip: {
    trigger: 'axis',
    valueFormatter: (v: unknown) => formatNum(Number(v)),
  },
  grid: { left: 16, right: 16, top: 24, bottom: 20, containLabel: true },
  xAxis: {
    type: 'category',
    data: trendData.value.months.map(shortMonth),
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
      name: '消费金额',
      type: 'bar',
      data: trendData.value.amounts,
      barMaxWidth: 26,
      itemStyle: { color: '#0ea5e9', borderRadius: [4, 4, 0, 0] },
    },
  ],
}))

const monthDistOption = computed<EChartsCoreOption>(() => ({
  tooltip: { trigger: 'item', valueFormatter: (v: unknown) => formatNum(Number(v)) },
  legend: {
    bottom: 0,
    icon: 'circle',
    textStyle: { color: AXIS_COLOR, fontSize: 12 },
  },
  series: [
    {
      name: '本月消费',
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6 },
      label: { show: false },
      emphasis: { label: { show: true, fontWeight: 500 } },
      data: monthDistData.value,
    },
  ],
}))
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2">
    <div class="rounded-lg border p-4">
      <h3 class="mb-2 text-sm font-semibold">近 6 月消费趋势</h3>
      <EChart :option="trendOption" height="260px" />
    </div>
    <div class="rounded-lg border p-4">
      <h3 class="mb-2 text-sm font-semibold">本月消费分布</h3>
      <EChart :option="monthDistOption" height="260px" />
    </div>
  </div>
</template>

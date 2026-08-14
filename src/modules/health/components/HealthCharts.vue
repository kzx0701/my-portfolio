<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsCoreOption } from 'echarts/core'
import EChart from '@/components/EChart.vue'
import { useHealthStore } from '@/modules/health/store'
import { resolveBMI } from '@/modules/health/types'

const store = useHealthStore()

const AXIS_COLOR = '#71717a'
const AXIS_LINE = 'rgba(128, 128, 128, 0.35)'
const SPLIT_LINE = 'rgba(128, 128, 128, 0.18)'

/** 档案身高（BMI 自动计算用） */
const profileHeight = computed(() => store.profile?.height_cm ?? null)

/** 全部记录（日期升序）：趋势从第一条数据到最新一条，展示完整变化过程 */
const trendRecords = computed(() => [...store.records].reverse())

/** 日期标签（MM-DD，简洁） */
function dateLabel(date: string): string {
  return date.length >= 10 ? date.slice(5) : date
}

/** 体重趋势：最近 N 条有效体重 */
const weightTrend = computed(() => {
  const points = trendRecords.value
    .map((r) => ({ label: dateLabel(r.record_date), value: r.weight_kg }))
    .filter((p) => p.value !== null)
  return {
    labels: points.map((p) => p.label),
    values: points.map((p) => p.value as number),
  }
})

/** BMI 趋势：手动优先，留空自动计算 */
const bmiTrend = computed(() => {
  const points = trendRecords.value
    .map((r) => ({
      label: dateLabel(r.record_date),
      value: resolveBMI(r.bmi, r.weight_kg, profileHeight.value),
    }))
    .filter((p) => p.value !== null)
  return {
    labels: points.map((p) => p.label),
    values: points.map((p) => p.value as number),
  }
})

const weightOption = computed<EChartsCoreOption>(() => ({
  tooltip: {
    trigger: 'axis',
    valueFormatter: (v: unknown) => `${Number(v)} kg`,
  },
  grid: { left: 16, right: 16, top: 24, bottom: 16, containLabel: true },
  xAxis: {
    type: 'category',
    data: weightTrend.value.labels,
    boundaryGap: false,
    axisLine: { lineStyle: { color: AXIS_LINE } },
    axisLabel: { color: AXIS_COLOR },
  },
  yAxis: {
    type: 'value',
    scale: true,
    splitLine: { lineStyle: { color: SPLIT_LINE } },
    axisLabel: { color: AXIS_COLOR },
  },
  series: [
    {
      name: '体重',
      type: 'line',
      data: weightTrend.value.values,
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { width: 2.5, color: '#0ea5e9' },
      itemStyle: { color: '#0ea5e9' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(14, 165, 233, 0.25)' },
            { offset: 1, color: 'rgba(14, 165, 233, 0.02)' },
          ],
        },
      },
    },
  ],
}))

const bmiOption = computed<EChartsCoreOption>(() => ({
  tooltip: {
    trigger: 'axis',
    valueFormatter: (v: unknown) => Number(v).toFixed(2),
  },
  grid: { left: 16, right: 16, top: 24, bottom: 16, containLabel: true },
  xAxis: {
    type: 'category',
    data: bmiTrend.value.labels,
    boundaryGap: false,
    axisLine: { lineStyle: { color: AXIS_LINE } },
    axisLabel: { color: AXIS_COLOR },
  },
  yAxis: {
    type: 'value',
    scale: true,
    splitLine: { lineStyle: { color: SPLIT_LINE } },
    axisLabel: { color: AXIS_COLOR },
  },
  series: [
    {
      name: 'BMI',
      type: 'line',
      data: bmiTrend.value.values,
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { width: 2.5, color: '#14b8a6' },
      itemStyle: { color: '#14b8a6' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(20, 184, 166, 0.22)' },
            { offset: 1, color: 'rgba(20, 184, 166, 0.02)' },
          ],
        },
      },
    },
  ],
}))
</script>

<template>
  <!-- 体重趋势（大图） -->
  <div class="rounded-lg border p-4">
    <h3 class="mb-2 text-sm font-semibold">体重趋势</h3>
    <EChart :option="weightOption" height="280px" />
  </div>

  <!-- BMI 趋势 -->
  <div class="rounded-lg border p-4">
    <h3 class="mb-2 text-sm font-semibold">BMI 趋势</h3>
    <EChart :option="bmiOption" height="240px" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ECharts, EChartsCoreOption } from 'echarts/core'
import { loadECharts } from '@/lib/echarts-loader'

const props = withDefaults(
  defineProps<{
    option: EChartsCoreOption
    height?: string
  }>(),
  { height: '320px' },
)

const el = ref<HTMLDivElement>()
let chart: ECharts | null = null
let resizeObserver: ResizeObserver | null = null
let disposed = false

async function render() {
  if (!el.value) return
  const echarts = await loadECharts()
  if (disposed || !el.value) return
  if (!chart) chart = echarts.init(el.value)
  chart.setOption(props.option, true)
}

function resize() {
  chart?.resize()
}

onMounted(() => {
  void render()
  if (el.value) {
    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(el.value)
  }
})

watch(() => props.option, () => void render(), { deep: true })

onBeforeUnmount(() => {
  disposed = true
  resizeObserver?.disconnect()
  resizeObserver = null
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div ref="el" class="w-full" :style="{ height }" />
</template>

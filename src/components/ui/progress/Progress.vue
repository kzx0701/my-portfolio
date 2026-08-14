<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: number
    max?: number
    class?: string
    /** 填充层样式类（如渐变），提供后替换默认 bg-primary */
    indicatorClass?: string
    /** 填充层内联样式（与宽度合并，用于颜色随进度滑动等动态场景） */
    indicatorStyle?: CSSProperties
  }>(),
  {
    modelValue: 0,
    max: 100,
  },
)

const percentage = computed(() => {
  if (props.max <= 0) return 0
  const pct = (props.modelValue / props.max) * 100
  return Math.min(100, Math.max(0, pct))
})
</script>

<template>
  <div
    role="progressbar"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="Math.round(percentage)"
    class="relative h-2 w-full overflow-hidden rounded-full bg-primary/20"
    :class="props.class"
  >
    <div
      class="h-full transition-all"
      :class="props.indicatorClass || 'bg-primary'"
      :style="[{ width: `${percentage}%` }, props.indicatorStyle]"
    />
  </div>
</template>
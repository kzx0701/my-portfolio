<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: number
    max?: number
    class?: string
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
      class="h-full bg-primary transition-all"
      :style="{ width: `${percentage}%` }"
    />
  </div>
</template>
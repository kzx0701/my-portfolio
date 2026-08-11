<script setup lang="ts">
import { cn } from '@/lib/utils'
import { computed } from 'vue'

const props = defineProps<{ class?: string }>()
const cls = computed(() =>
  cn('w-full caption-bottom text-sm [&_thead]:border-b [&_tbody]:divide-y [&_tbody]:divide-border', props.class),
)
</script>

<template>
  <div class="relative w-full overflow-auto">
    <table :class="cls">
      <slot />
    </table>
  </div>
</template>
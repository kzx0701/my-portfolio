<script setup lang="ts">
import { cn } from '@/lib/utils'
import { computed } from 'vue'

const props = defineProps<{ class?: string }>()
const cls = computed(() => cn('h-12 px-2 text-left align-middle font-medium text-muted-foreground', props.class))
</script>

<template>
  <th :class="cls">
    <slot />
  </th>
</template>
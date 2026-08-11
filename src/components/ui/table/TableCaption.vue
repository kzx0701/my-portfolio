<script setup lang="ts">
import { cn } from '@/lib/utils'
import { computed } from 'vue'

const props = defineProps<{ class?: string }>()
const cls = computed(() => cn('mt-4 text-sm text-muted-foreground', props.class))
</script>

<template>
  <caption :class="cls">
    <slot />
  </caption>
</template>
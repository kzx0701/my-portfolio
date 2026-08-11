<script setup lang="ts">
import { cn } from '@/lib/utils'
import { computed } from 'vue'

const props = defineProps<{ class?: string }>()
const cls = computed(() => cn('bg-muted/50', props.class))
</script>

<template>
  <thead :class="cls">
    <slot />
  </thead>
</template>
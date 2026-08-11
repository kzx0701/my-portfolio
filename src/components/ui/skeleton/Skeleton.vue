<script setup lang="ts">
import { cn } from '@/lib/utils'
import { computed } from 'vue'

const props = defineProps<{ class?: string }>()
const cls = computed(() => cn('animate-pulse rounded-md bg-muted', props.class))
</script>

<template>
  <div :class="cls" />
</template>
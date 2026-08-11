<script setup lang="ts">
import { cn } from '@/lib/utils'
import { computed } from 'vue'

const props = defineProps<{ class?: string }>()
const cls = computed(() => cn('border-b transition-colors hover:bg-muted/50', props.class))
</script>

<template>
  <tr :class="cls">
    <slot />
  </tr>
</template>
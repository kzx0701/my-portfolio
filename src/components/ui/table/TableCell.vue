<script setup lang="ts">
import { cn } from '@/lib/utils'
import { computed } from 'vue'

const props = defineProps<{ class?: string }>()
const cls = computed(() => cn('p-2 align-middle', props.class))
</script>

<template>
  <td :class="cls">
    <slot />
  </td>
</template>
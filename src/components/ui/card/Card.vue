<script setup lang="ts">
import { cn } from '@/lib/utils'
import { computed } from 'vue'

const props = defineProps<{
  class?: string
}>()

const cls = computed(() =>
  cn('rounded-xl border bg-card text-card-foreground shadow', props.class),
)
</script>

<template>
  <div :class="cls">
    <slot />
  </div>
</template>
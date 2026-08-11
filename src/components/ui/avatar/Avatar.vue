<script setup lang="ts">
import { cn } from '@/lib/utils'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    src?: string
    alt?: string
    fallback?: string
    class?: string
  }>(),
  { alt: '', fallback: '' },
)

const cls = computed(() =>
  cn('relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full', props.class),
)
</script>

<template>
  <div :class="cls">
    <img v-if="src" :src="src" :alt="alt" class="aspect-square h-full w-full object-cover" />
    <span
      v-else
      class="flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground"
    >
      {{ fallback }}
    </span>
  </div>
</template>
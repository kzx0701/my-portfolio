<script setup lang="ts">
import { cn } from '@/lib/utils'
import { computed } from 'vue'
import { TabsTrigger } from 'reka-ui'

const props = withDefaults(
  defineProps<{
    value: string
    class?: string
    disabled?: boolean
  }>(),
  { disabled: false },
)

const cls = computed(() =>
  cn(
    'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow hover:bg-muted-foreground/10 hover:text-foreground',
    props.class,
  ),
)
</script>

<template>
  <TabsTrigger :value="value" :disabled="disabled" :class="cls">
    <slot />
  </TabsTrigger>
</template>

<script setup lang="ts">
import { cn } from '@/lib/utils'
import { computed } from 'vue'
import { TabsContent } from 'reka-ui'

const props = defineProps<{
  value: string
  class?: string
}>()

const cls = computed(() =>
  cn(
    'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    props.class,
  ),
)
</script>

<template>
  <TabsContent :value="value" :class="cls">
    <slot />
  </TabsContent>
</template>

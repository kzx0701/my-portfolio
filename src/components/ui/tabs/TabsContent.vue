<script setup lang="ts">
import { cn } from '@/lib/utils'
import { computed, inject } from 'vue'

interface TabsContext {
  active: { value: string }
}

const props = defineProps<{
  value: string
  class?: string
}>()

const ctx = inject<TabsContext>('tabsActive')
const isActive = computed(() => ctx?.active.value === props.value)
const cls = computed(() =>
  cn(
    'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    props.class,
  ),
)
</script>

<template>
  <div v-if="isActive" role="tabpanel" :class="cls">
    <slot />
  </div>
</template>
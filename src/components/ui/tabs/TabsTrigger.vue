<script setup lang="ts">
import { cn } from '@/lib/utils'
import { computed, inject } from 'vue'

interface TabsContext {
  active: { value: string }
  setActive: (value: string) => void
}

const props = defineProps<{
  value: string
  class?: string
  disabled?: boolean
}>()

const ctx = inject<TabsContext>('tabsActive')

const isActive = computed(() => ctx?.active.value === props.value)

const cls = computed(() =>
  cn(
    'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
    isActive.value
      ? 'bg-background text-foreground shadow'
      : 'hover:bg-muted-foreground/10 hover:text-foreground',
    props.class,
  ),
)

function onClick() {
  if (props.disabled) return
  ctx?.setActive(props.value)
}
</script>

<template>
  <button
    type="button"
    role="tab"
    :aria-selected="isActive"
    :disabled="disabled"
    :class="cls"
    @click="onClick"
  >
    <slot />
  </button>
</template>
<script setup lang="ts">
import { cn } from '@/lib/utils'
import { X } from '@lucide/vue'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    open?: boolean
    title?: string
    description?: string
    class?: string
    hideClose?: boolean
  }>(),
  {
    open: false,
    hideClose: false,
  },
)

const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const dialogClass = computed(() => cn('fixed inset-0 z-50', props.class))
</script>

<template>
  <Teleport to="body">
    <div v-if="open" :class="dialogClass">
      <div
        class="fixed inset-0 z-50 bg-black/80"
        @click="emit('update:open', false)"
      />
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          class="relative w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg"
          role="dialog"
          aria-modal="true"
        >
          <div v-if="title || description" class="mb-4">
            <h2 v-if="title" class="text-lg font-semibold">{{ title }}</h2>
            <p v-if="description" class="mt-1 text-sm text-muted-foreground">{{ description }}</p>
          </div>
          <button
            v-if="!hideClose"
            class="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none"
            @click="emit('update:open', false)"
          >
            <X class="h-4 w-4" />
            <span class="sr-only">Close</span>
          </button>
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>
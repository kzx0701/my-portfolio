<script setup lang="ts">
import { cn } from '@/lib/utils'
import { X } from '@lucide/vue'
import { computed } from 'vue'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'

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

const contentClass = computed(() =>
  cn(
    'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-lg',
    props.class,
  ),
)
</script>

<template>
  <DialogRoot :open="open" @update:open="emit('update:open', $event)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/80" />
      <DialogContent :class="contentClass">
        <div v-if="title || description" class="mb-4">
          <DialogTitle v-if="title" class="text-lg font-semibold">{{ title }}</DialogTitle>
          <DialogDescription
            v-if="description"
            class="mt-1 text-sm text-muted-foreground"
          >
            {{ description }}
          </DialogDescription>
        </div>
        <slot />
        <DialogClose
          v-if="!hideClose"
          class="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="关闭"
        >
          <X class="h-4 w-4" />
        </DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

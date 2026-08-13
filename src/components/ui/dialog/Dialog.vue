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

// 官方 shadcn v4 模板类：translate-x-[-50%]（v4 原生 translate 属性）
// + tw-animate-css 的 fade/zoom 进出动画（zoom 仅动 scale，与定位不冲突）
const contentClass = computed(() =>
  cn(
    'fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-lg border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
    props.class,
  ),
)
</script>

<template>
  <DialogRoot :open="open" @update:open="emit('update:open', $event)">
    <DialogPortal>
      <DialogOverlay
        class="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
      />
      <DialogContent
        :class="contentClass"
        v-bind="description ? {} : { 'aria-describedby': undefined }"
      >
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

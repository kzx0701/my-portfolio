<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import {
  PopoverContent,
  PopoverPortal,
  type PopoverContentEmits,
  type PopoverContentProps,
} from 'reka-ui'
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<PopoverContentProps & { class?: HTMLAttributes['class'] }>(), {
  align: 'center',
  sideOffset: 4,
})

const emits = defineEmits<PopoverContentEmits>()

/** 透传给 reka-ui 的 props（排除 class，class 单独合并） */
const { class: _, ...contentProps } = props
</script>

<template>
  <PopoverPortal>
    <PopoverContent
      v-bind="contentProps"
      :class="
        cn(
          'z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          props.class,
        )
      "
      @escape-key-down="emits('escapeKeyDown', $event)"
      @pointer-down-outside="emits('pointerDownOutside', $event)"
      @focus-outside="emits('focusOutside', $event)"
      @interact-outside="emits('interactOutside', $event)"
      @open-auto-focus="emits('openAutoFocus', $event)"
      @close-auto-focus="emits('closeAutoFocus', $event)"
    >
      <slot />
    </PopoverContent>
  </PopoverPortal>
</template>

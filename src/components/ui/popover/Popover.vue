<script setup lang="ts">
import type { PopoverRootEmits, PopoverRootProps } from 'reka-ui'
import { PopoverRoot } from 'reka-ui'

const props = defineProps<PopoverRootProps>()
const emits = defineEmits<PopoverRootEmits>()

/** 转发 reka-ui PopoverRoot 的插槽作用域（open / close），供 DatePicker 等消费 */
defineSlots<{
  default: (props: { open: boolean; close: () => void }) => unknown
}>()
</script>

<template>
  <PopoverRoot v-bind="props" @update:open="emits('update:open', $event)">
    <template #default="slotProps">
      <slot v-bind="slotProps" />
    </template>
  </PopoverRoot>
</template>

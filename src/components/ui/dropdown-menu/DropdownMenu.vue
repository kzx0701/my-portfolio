<script setup lang="ts">
import type { DropdownMenuRootEmits, DropdownMenuRootProps } from 'reka-ui'
import { DropdownMenuRoot } from 'reka-ui'

const props = defineProps<DropdownMenuRootProps>()
const emits = defineEmits<DropdownMenuRootEmits>()
</script>

<template>
  <DropdownMenuRoot v-bind="props" @update:open="emits('update:open', $event)">
    <slot />
  </DropdownMenuRoot>
</template>

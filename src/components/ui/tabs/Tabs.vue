<script setup lang="ts">
import { cn } from '@/lib/utils'
import { computed } from 'vue'
import { TabsRoot } from 'reka-ui'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    defaultValue?: string
    class?: string
  }>(),
  { modelValue: undefined, defaultValue: '' },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string]
}>()

function onValueChange(value: string | undefined) {
  if (value === undefined) return
  emit('update:modelValue', value)
  emit('change', value)
}

const tabsClass = computed(() => cn(props.class))
</script>

<template>
  <TabsRoot
    :model-value="modelValue ?? undefined"
    :default-value="defaultValue || undefined"
    :class="tabsClass"
    @update:model-value="onValueChange"
  >
    <slot />
  </TabsRoot>
</template>

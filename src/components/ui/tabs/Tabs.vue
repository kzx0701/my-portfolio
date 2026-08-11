<script setup lang="ts">
import { cn } from '@/lib/utils'
import { computed, provide, ref, watch } from 'vue'

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

// 内部活动值：优先使用外部 v-model，否则用内部状态
const internalActive = ref(props.defaultValue)

const active = computed(() => props.modelValue ?? internalActive.value)

function setActive(value: string) {
  internalActive.value = value
  emit('update:modelValue', value)
  emit('change', value)
}

provide('tabsActive', { active, setActive })

watch(
  () => props.defaultValue,
  (v) => {
    if (v) internalActive.value = v
  },
)

const tabsClass = computed(() => cn(props.class))
</script>

<template>
  <div :class="tabsClass">
    <slot />
  </div>
</template>
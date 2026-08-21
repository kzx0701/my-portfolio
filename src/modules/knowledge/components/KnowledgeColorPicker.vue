<script setup lang="ts">
import { computed } from 'vue'
import { Check } from '@lucide/vue'
import { CATEGORY_COLOR_OPTIONS, categoryDotClass } from '@/modules/knowledge/types'

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    compact?: boolean
  }>(),
  { modelValue: null, compact: false },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const selectedLabel = computed(
  () => CATEGORY_COLOR_OPTIONS.find((option) => option.value === props.modelValue)?.label ?? '选择颜色',
)
</script>

<template>
  <div class="flex min-h-9 items-center gap-2">
    <div class="flex items-center gap-2" role="radiogroup" aria-label="标记颜色">
      <button
        v-for="option in CATEGORY_COLOR_OPTIONS"
        :key="option.value"
        type="button"
        class="group flex h-7 w-7 items-center justify-center rounded-full outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        :aria-label="`标记颜色：${option.label}`"
        :aria-checked="modelValue === option.value"
        role="radio"
        @click="emit('update:modelValue', option.value)"
      >
        <span
          class="flex h-4 w-4 items-center justify-center rounded-full shadow-sm transition-all"
          :class="[
            categoryDotClass(option.value),
            modelValue === option.value && 'ring-2 ring-foreground/25 ring-offset-2',
          ]"
        >
          <Check v-if="modelValue === option.value" class="h-3 w-3 text-white drop-shadow-sm" />
        </span>
      </button>
    </div>
    <span v-if="!compact" class="min-w-14 text-xs text-muted-foreground">{{ selectedLabel }}</span>
  </div>
</template>

<script setup lang="ts">
import { cn } from '@/lib/utils'
import { Check, ChevronDown } from '@lucide/vue'
import { computed } from 'vue'
import {
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'reka-ui'

export interface SelectOption {
  value: string
  label: string
  /** 选项图标（图片 URL），为 true 时该项不渲染图标 */
  icon?: string
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    modelValue?: string
    options?: SelectOption[]
    placeholder?: string
    disabled?: boolean
    class?: string
  }>(),
  { placeholder: '请选择' },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

function onValueChange(value: string) {
  emit('update:modelValue', value)
}

/** 当前选中项（用于 trigger 中显示选中状态的图标） */
const selectedOption = computed(() => props.options?.find((o) => o.value === props.modelValue))

const triggerClass = computed(() =>
  cn(
    'flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
    props.class,
  ),
)
</script>

<template>
  <SelectRoot
    :model-value="modelValue"
    :disabled="disabled"
    @update:model-value="onValueChange"
  >
    <SelectTrigger :class="triggerClass">
      <SelectValue :placeholder="placeholder">
        <template #default>
          <span v-if="selectedOption" class="flex items-center gap-2">
            <img
              v-if="selectedOption.icon"
              :src="selectedOption.icon"
              alt=""
              class="h-5 w-5 shrink-0 rounded-sm object-contain"
            />
            <span class="truncate">{{ selectedOption.label }}</span>
          </span>
        </template>
      </SelectValue>
      <ChevronDown class="h-4 w-4 shrink-0 opacity-50" />
    </SelectTrigger>
    <SelectPortal>
      <SelectContent
        position="popper"
        :side-offset="4"
        class="z-50 max-h-96 min-w-[var(--reka-select-trigger-width)] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
      >
        <SelectViewport class="p-1">
          <SelectItem
            v-for="opt in options"
            :key="opt.value"
            :value="opt.value"
            :disabled="opt.disabled"
            class="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
          >
            <span class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
              <SelectItemIndicator>
                <Check class="h-4 w-4" />
              </SelectItemIndicator>
            </span>
            <img
              v-if="opt.icon"
              :src="opt.icon"
              alt=""
              class="mr-2 h-5 w-5 shrink-0 rounded-sm object-contain"
            />
            <SelectItemText>{{ opt.label }}</SelectItemText>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>

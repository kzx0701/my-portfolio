<script setup lang="ts">
import type { Component } from 'vue'
import { Card, CardContent } from '@/components/ui'
import { cn } from '@/lib/utils'

defineProps<{
  title: string
  value: string | number
  icon: Component
  hint?: string
  /** 图标块渐变背景（如 bg-gradient-to-br from-sky-400 to-blue-500） */
  iconClass?: string
  /** 顶部强调色条（如 bg-gradient-to-r from-sky-400 to-blue-500） */
  accentClass?: string
}>()
</script>

<template>
  <Card class="relative overflow-hidden transition-shadow duration-200 hover:shadow-md">
    <div v-if="accentClass" :class="cn('absolute inset-x-0 top-0 h-0.5', accentClass)" />
    <CardContent class="flex items-center gap-4 px-6 py-7">
      <div
        :class="
          cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-md',
            iconClass,
          )
        "
      >
        <component :is="icon" class="h-5 w-5" />
      </div>
      <div class="min-w-0">
        <p class="text-sm font-medium text-muted-foreground">{{ title }}</p>
        <p class="mt-0.5 truncate text-2xl font-bold tabular-nums tracking-tight">{{ value }}</p>
        <p v-if="hint" class="mt-0.5 text-xs text-muted-foreground">{{ hint }}</p>
      </div>
    </CardContent>
  </Card>
</template>

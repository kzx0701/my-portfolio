<script setup lang="ts">
import type { Component } from 'vue'
import { Card, CardContent } from '@/components/ui'

defineProps<{
  title: string
  value: string | number
  icon: Component
  hint?: string
}>()
</script>

<template>
  <Card>
    <CardContent class="flex items-center gap-4 p-5">
      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        <component :is="icon" class="h-5 w-5" />
      </div>
      <div class="min-w-0">
        <p class="text-sm text-muted-foreground">{{ title }}</p>
        <p class="text-xl font-bold tabular-nums">{{ value }}</p>
        <p v-if="hint" class="text-xs text-muted-foreground">{{ hint }}</p>
      </div>
    </CardContent>
  </Card>
</template>
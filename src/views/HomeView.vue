<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ArrowRight } from '@lucide/vue'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui'
import { activeModules } from '@/modules/registry'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const userName = auth.user?.email ?? '轩屿'
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <div class="mb-8">
      <h2 class="text-2xl font-bold tracking-tight">你好，{{ userName }}</h2>
      <p class="mt-1 text-muted-foreground">选择要进入的工作台模块。</p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <RouterLink
        v-for="mod in activeModules"
        :key="mod.key"
        :to="mod.path"
        class="group block transition-transform hover:-translate-y-0.5"
      >
        <Card class="h-full transition-shadow hover:shadow-md">
          <CardHeader>
            <div class="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <component :is="mod.icon" class="h-5 w-5" />
            </div>
            <CardTitle>{{ mod.title }}</CardTitle>
            <CardDescription>{{ mod.description }}</CardDescription>
          </CardHeader>
          <CardFooter>
            <span class="inline-flex items-center gap-1 text-sm font-medium text-primary">
              进入模块
              <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </CardFooter>
        </Card>
      </RouterLink>
    </div>

    <div
      v-if="activeModules.length === 0"
      class="rounded-lg border border-dashed p-8 text-center text-muted-foreground"
    >
      暂无可用模块，请在 <code class="text-xs">src/modules/registry.ts</code> 中开启。
    </div>
  </div>
</template>
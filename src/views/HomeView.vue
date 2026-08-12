<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { computed } from 'vue'
import { ArrowRight } from '@lucide/vue'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui'
import { activeModules } from '@/modules/registry'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

/** 用户名：优先取用户自定义用户名，回退邮箱前缀 */
const userName = computed(() => auth.username)

/** 按时段问候 */
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 5) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 18) return '下午好'
  return '晚上好'
})

/** 今天的日期文案 */
const today = computed(() =>
  new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(
    new Date(),
  ),
)
</script>

<template>
  <!-- 内容容器：居中略偏上（pb-[12vh] 上移约 6vh）；背景装饰已上移至 MainLayout 布局层 -->
  <div class="mx-auto flex min-h-[calc(100vh-6.5rem)] w-full max-w-5xl flex-col items-center justify-center pb-[12vh]">
    <div>
      <!-- 欢迎区（水平居中） -->
      <div class="mb-10 text-center">
        <h2 class="text-3xl font-bold tracking-tight sm:text-4xl">
          {{ greeting }}，
          <span
            class="bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text text-transparent"
          >
            {{ userName }}
          </span>
        </h2>
        <p class="mt-2 text-sm text-muted-foreground sm:text-base">
          今天是 {{ today }}，选择要进入的工作台模块。
        </p>
      </div>

      <!-- 模块入口卡片（w-full 保证在居中容器下撑满宽度，卡片列居中分布） -->
      <div class="grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <RouterLink
          v-for="mod in activeModules"
          :key="mod.key"
          :to="mod.path"
          class="group block h-full"
        >
          <Card
            class="relative h-full overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
          >
            <!-- 顶部渐变线（悬停显现） -->
            <div
              class="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-indigo-500 to-violet-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            />
            <!-- 角落水印图标（悬停：放大/旋转回旋/滑入/提亮/染品牌色，弹性缓动） -->
            <component
              :is="mod.icon"
              class="pointer-events-none absolute -right-4 -top-4 h-24 w-24 origin-top-right rotate-12 text-foreground opacity-[0.04] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-1.5 group-hover:translate-y-1.5 group-hover:rotate-[-6deg] group-hover:scale-125 group-hover:opacity-[0.16] group-hover:text-indigo-500/40"
            />

            <CardHeader class="p-6">
              <div
                class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25 transition-transform duration-300 group-hover:scale-105"
              >
                <component :is="mod.icon" class="h-6 w-6" />
              </div>
              <CardTitle class="text-base font-semibold">{{ mod.title }}</CardTitle>
              <CardDescription class="mt-1.5 text-sm leading-relaxed">
                {{ mod.description }}
              </CardDescription>
            </CardHeader>
            <CardFooter class="px-6 pb-6">
              <span class="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                进入模块
                <ArrowRight
                  class="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                />
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
  </div>
</template>

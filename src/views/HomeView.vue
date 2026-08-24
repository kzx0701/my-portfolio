<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { computed } from 'vue'
import { ArrowRight } from '@lucide/vue'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui'
import { activeModules } from '@/modules/registry'
import { useAuthStore } from '@/stores/auth'
import logoImgUrl from '@/assets/images/logo_img.png'

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
</script>

<template>
  <!-- 内容容器：居中略偏上（pb-[12vh] 上移约 6vh）；背景装饰已上移至 MainLayout 布局层 -->
  <div class="mx-auto flex min-h-[calc(100vh-6.5rem)] w-full max-w-5xl flex-col items-center justify-center pb-[12vh]">
    <div>
      <!-- 欢迎区（水平居中） -->
      <div class="mb-10 text-center">
        <h2 class="flex items-center justify-center gap-3 text-3xl font-bold tracking-tight sm:text-4xl">
          <img
            :src="logoImgUrl"
            alt=""
            class="h-20 w-auto shrink-0 object-contain drop-shadow-sm sm:h-24"
            style="aspect-ratio: 3 / 2"
          />
          <span>
            {{ greeting }}，
            <span
              class="bg-gradient-to-r from-sky-500 to-teal-400 bg-clip-text text-transparent"
            >
              {{ userName }}
            </span>
          </span>
        </h2>
      </div>

      <!-- 模块入口卡片：轻透水色表面，与首页天空 / 海面背景自然融合 -->
      <div class="grid w-full gap-5 sm:grid-cols-2">
        <RouterLink
          v-for="mod in activeModules"
          :key="mod.key"
          :to="mod.path"
          class="group block h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
        >
          <Card
            class="relative h-full overflow-hidden border-0 bg-gradient-to-br from-white/90 via-white/78 to-sky-50/72 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_12px_30px_-20px_rgba(14,116,144,0.34)] ring-1 ring-inset ring-sky-950/[0.09] backdrop-blur-[2px] transition-shadow duration-200 group-hover:shadow-[0_1px_2px_rgba(15,23,42,0.07),0_14px_34px_-20px_rgba(14,116,144,0.42)] dark:from-card/95 dark:via-card/90 dark:to-teal-950/70 dark:ring-white/12"
          >
            <div
              class="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-400/[0.07] via-transparent to-teal-500/[0.09] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            />
            <component
              :is="mod.icon"
              class="pointer-events-none absolute -right-4 -top-4 h-24 w-24 origin-top-right rotate-12 text-foreground opacity-[0.04] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-1.5 group-hover:translate-y-1.5 group-hover:rotate-[-6deg] group-hover:scale-125 group-hover:opacity-[0.16] group-hover:text-sky-500/40"
            />

            <CardHeader class="relative z-10 p-6 pb-5">
              <div class="flex items-start gap-4">
                <div
                  class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400/90 to-teal-500/90 text-white shadow-sm shadow-sky-500/15"
                  :style="{ viewTransitionName: `vt-${mod.key}` }"
                >
                  <component :is="mod.icon" class="h-5 w-5" />
                </div>
                <div class="min-w-0">
                  <CardTitle class="text-base font-semibold">{{ mod.title }}</CardTitle>
                  <CardDescription class="mt-1 text-sm leading-relaxed">
                    {{ mod.description }}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardFooter class="relative z-10 justify-end px-6 pb-6">
              <span
                class="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors duration-200 group-hover:text-sky-700 dark:group-hover:text-sky-300"
              >
                进入模块
                <ArrowRight class="h-3.5 w-3.5" />
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

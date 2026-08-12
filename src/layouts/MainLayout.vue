<script setup lang="ts">
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { computed } from 'vue'
import { ArrowLeft, ChevronRight, LogOut } from '@lucide/vue'
import { Avatar, Button, Separator } from '@/components/ui'
import { activeModules } from '@/modules/registry'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const currentTitle = computed(() => (route.meta.title as string) ?? '工作台')

/** 是否处于首页（工作台总览，此时不显示侧边栏） */
const isHome = computed(() => route.path === '/')

/** 当前所在模块（进入模块页后侧边栏显示该模块的菜单） */
const currentModule = computed(() =>
  activeModules.find(
    (m) => route.path === m.path || route.path.startsWith(`${m.path}/`),
  ),
)

const userInitial = computed(() => {
  const email = auth.user?.email ?? ''
  return email ? email.charAt(0).toUpperCase() : '客'
})

const userEmail = computed(() => auth.user?.email ?? '')

async function handleLogout() {
  try {
    await auth.signOut()
    router.push({ name: 'login' })
  } catch (e) {
    console.error('退出登录失败', e)
  }
}
</script>

<template>
  <div class="flex min-h-screen w-full flex-col bg-background">
    <!-- 顶栏（全宽） -->
    <header class="flex h-14 shrink-0 items-center justify-between border-b px-4 sm:px-6">
      <div class="flex min-w-0 items-center gap-3">
        <span class="text-lg font-bold tracking-tight">轩屿工作台</span>
        <Separator orientation="vertical" class="h-5 hidden sm:block" />
        <h1 class="truncate text-base font-semibold">{{ currentTitle }}</h1>
      </div>

      <!-- 用户区：右上角 -->
      <div class="flex shrink-0 items-center gap-2 sm:gap-3">
        <Avatar :fallback="userInitial" />
        <span class="hidden max-w-[180px] truncate text-sm font-medium md:block">
          {{ userEmail }}
        </span>
        <Button variant="ghost" size="icon" title="退出登录" @click="handleLogout">
          <LogOut class="h-4 w-4" />
        </Button>
      </div>
    </header>

    <div class="flex min-h-0 flex-1">
      <!-- 侧边栏：仅进入模块后显示（渲染当前模块的菜单） -->
      <aside
        v-if="!isHome && currentModule"
        class="hidden w-56 shrink-0 border-r bg-card md:flex md:flex-col"
      >
        <div class="flex h-14 items-center gap-2 border-b px-4">
          <component :is="currentModule.icon" class="h-5 w-5 text-muted-foreground" />
          <span class="text-sm font-semibold">{{ currentModule.title }}</span>
        </div>

        <nav class="flex-1 space-y-1 p-3">
          <template v-if="currentModule.children && currentModule.children.length">
            <RouterLink
              v-for="item in currentModule.children"
              :key="item.key"
              :to="item.path"
              class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
              :class="
                route.path === item.path
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              "
            >
              <ChevronRight class="h-4 w-4" />
              {{ item.title }}
            </RouterLink>
          </template>
        </nav>

        <div class="border-t p-3">
          <RouterLink
            to="/"
            class="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft class="h-4 w-4" />
            返回工作台
          </RouterLink>
        </div>
      </aside>

      <!-- 主内容区 -->
      <main class="min-w-0 flex-1 overflow-auto p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>

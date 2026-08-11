<script setup lang="ts">
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { computed } from 'vue'
import { LogOut, ChevronRight } from '@lucide/vue'
import { Button } from '@/components/ui'
import { Avatar } from '@/components/ui'
import { Separator } from '@/components/ui'
import { activeModules } from '@/modules/registry'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const currentTitle = computed(() => (route.meta.title as string) ?? '工作台')

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
  <div class="flex min-h-screen w-full bg-background">
    <!-- 侧边栏 -->
    <aside class="hidden w-64 shrink-0 border-r bg-card md:flex md:flex-col">
      <div class="flex h-14 items-center gap-2 border-b px-6">
        <span class="text-lg font-bold tracking-tight">轩屿工作台</span>
      </div>

      <nav class="flex-1 space-y-1 p-4">
        <RouterLink
          to="/"
          class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
          :class="
            route.path === '/'
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          "
        >
          <ChevronRight class="h-4 w-4" />
          工作台
        </RouterLink>

        <Separator class="my-3" />

        <template v-for="mod in activeModules" :key="mod.key">
          <RouterLink
            :to="mod.path"
            class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
            :class="
              route.path.startsWith(mod.path)
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            "
          >
            <component :is="mod.icon" class="h-4 w-4" />
            {{ mod.title }}
          </RouterLink>
        </template>
      </nav>

      <div class="border-t p-4">
        <div class="flex items-center gap-3">
          <Avatar :fallback="userInitial" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium">{{ userEmail }}</p>
          </div>
          <Button variant="ghost" size="icon" @click="handleLogout" title="退出登录">
            <LogOut class="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <div class="flex min-w-0 flex-1 flex-col">
      <header class="flex h-14 items-center justify-between border-b px-6">
        <h1 class="text-base font-semibold">{{ currentTitle }}</h1>
        <div class="flex items-center gap-2 md:hidden">
          <Button variant="ghost" size="icon" @click="handleLogout">
            <LogOut class="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main class="flex-1 overflow-auto p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
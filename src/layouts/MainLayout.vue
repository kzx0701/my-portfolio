<script setup lang="ts">
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import { computed, ref } from "vue";
import { ArrowLeft, ChevronDown, ChevronRight, LogOut, UserRound } from "@lucide/vue";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "reka-ui";
import { Avatar, Separator } from "@/components/ui";
import ProfileDialog from "@/components/ProfileDialog.vue";
import { activeModules } from "@/modules/registry";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const profileOpen = ref(false);

const currentTitle = computed(() => (route.meta.title as string) ?? "工作台");

/** 是否处于首页（工作台总览，此时不显示侧边栏） */
const isHome = computed(() => route.path === "/");

/** 当前所在模块（进入模块页后侧边栏显示该模块的菜单） */
const currentModule = computed(() => activeModules.find((m) => route.path === m.path || route.path.startsWith(`${m.path}/`)));

const userInitial = computed(() => auth.username.charAt(0).toUpperCase() || "客");

const userEmail = computed(() => auth.user?.email ?? "");

async function handleLogout() {
  try {
    await auth.signOut();
    router.push({ name: "login" });
  } catch (e) {
    console.error("退出登录失败", e);
  }
}
</script>

<template>
  <!-- relative isolate：创建层叠上下文，保证 -z-10 装饰层在 bg-background 之上、内容之下 -->
  <div class="relative isolate flex min-h-screen w-full flex-col bg-background">
    <!-- 首页全屏背景装饰（仅首页显示，布局层职责；覆盖全宽无白边） -->
    <div v-if="isHome" class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <!-- 主光晕：顶部中央（品牌靛蓝） -->
      <div class="absolute -top-40 left-1/2 h-96 w-[46rem] -translate-x-1/2 rounded-full bg-indigo-500/25 blur-3xl" />
      <!-- 辅助光晕：左下（紫罗兰） -->
      <div class="absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-violet-500/15 blur-3xl" />
      <!-- 辅助光晕：右上（天蓝，点缀冷暖层次） -->
      <div class="absolute -right-20 top-1/3 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
      <!-- 细网格纹理：顶部可见、向下渐隐，避免生硬 -->
      <div
        class="absolute inset-0 bg-[linear-gradient(to_right,rgba(120,120,135,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,120,135,0.07)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_65%_55%_at_50%_0%,black,transparent)]"
      />
    </div>

    <!-- 顶栏（全宽） -->
    <header class="flex h-14 shrink-0 items-center justify-between border-b px-4 sm:px-6">
      <div class="flex min-w-0 items-center gap-3">
        <span class="text-lg font-bold tracking-tight">轩屿</span>
        <Separator orientation="vertical" class="h-5 hidden sm:block" />
        <h1 class="truncate text-base font-semibold">{{ currentTitle }}</h1>
      </div>

      <!-- 用户区：右上角（头像独立展示，仅用户名可点击下拉） -->
      <div class="flex shrink-0 items-center gap-2">
        <Avatar :src="auth.avatarUrl || undefined" :fallback="userInitial" />
        <DropdownMenuRoot>
          <DropdownMenuTrigger
            class="flex items-center gap-1.5 rounded-md px-2 py-1.5 outline-none transition-colors hover:bg-accent data-[state=open]:bg-accent"
          >
            <span class="max-w-[120px] truncate text-sm font-medium">
              {{ auth.username }}
            </span>
            <ChevronDown class="h-4 w-4 shrink-0 text-muted-foreground" />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            :side-offset="6"
            class="z-50 min-w-[11rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2"
          >
            <DropdownMenuLabel class="px-2 py-1.5">
              <div class="flex flex-col gap-0.5">
                <span class="text-sm font-medium">{{ auth.username }}</span>
                <span class="text-xs font-normal text-muted-foreground">{{ userEmail }}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator class="-mx-1 my-1 h-px bg-muted" />
            <DropdownMenuItem
              class="flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground"
              @select="profileOpen = true"
            >
              <UserRound class="h-4 w-4" />
              编辑资料
            </DropdownMenuItem>
            <DropdownMenuSeparator class="-mx-1 my-1 h-px bg-muted" />
            <DropdownMenuItem
              class="flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive outline-none transition-colors focus:bg-destructive/10 focus:text-destructive"
              @select="handleLogout"
            >
              <LogOut class="h-4 w-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuRoot>
      </div>
    </header>

    <div class="flex min-h-0 flex-1">
      <!-- 侧边栏：仅进入模块后显示（渲染当前模块的菜单） -->
      <aside v-if="!isHome && currentModule" class="hidden w-56 shrink-0 border-r bg-card md:flex md:flex-col">
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
              :class="route.path === item.path ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'"
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

      <!-- 主内容区（路由页面过渡：淡入+上移 / 淡出） -->
      <main class="min-w-0 flex-1 overflow-auto p-6">
        <RouterView v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>
    </div>

    <!-- 编辑资料弹窗 -->
    <ProfileDialog v-model:open="profileOpen" />
  </div>
</template>

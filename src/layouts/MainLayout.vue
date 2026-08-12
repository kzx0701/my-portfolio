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
import logoUrl from "@/assets/images/logo.png";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const profileOpen = ref(false);

/** 浏览器是否支持 View Transitions API（支持时由它负责页面过渡，避免与 Vue Transition 双重动画） */
const supportsViewTransition =
  typeof document !== "undefined" && !!document.startViewTransition;

/** 是否处于首页（工作台总览，此时不显示侧边栏） */
const isHome = computed(() => route.path === "/");

/** 当前所在模块（进入模块页后侧边栏显示该模块的菜单） */
const currentModule = computed(() => activeModules.find((m) => route.path === m.path || route.path.startsWith(`${m.path}/`)));

/** 顶栏标题：首页显示"工作台"，模块内固定显示模块名（不随子菜单标题变化） */
const currentTitle = computed(() =>
  isHome.value ? "工作台" : (currentModule.value?.title ?? "工作台"),
);

/** 面包屑：模块页显示「工作台 / 模块名 / 当前页」，首页不显示 */
const moduleCrumbs = computed(() => {
  if (!currentModule.value) return [];
  const crumbs = [{ title: currentModule.value.title, path: currentModule.value.path }];
  const title = route.meta.title as string | undefined;
  if (title && title !== currentModule.value.title) {
    crumbs.push({ title, path: route.path });
  }
  return crumbs;
});

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
    <!-- 海岛风格：天空→海面纵向渐变 + 暖阳 + 白云 + 底部海浪，替代原紫色光晕 -->
    <div v-if="isHome" class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <!-- 天空→海面纵向渐变（海岛氛围基底，低透明度） -->
      <div class="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(125,211,252,0.16),rgba(125,211,252,0.05)_40%,rgba(45,212,191,0.06)_70%,rgba(45,212,191,0.12))]" />
      <!-- 暖阳：右上（amber 阳光色） -->
      <div class="absolute -right-24 -top-16 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />
      <!-- 主光晕：顶部中央（天空蓝） -->
      <div class="absolute -top-40 left-1/2 h-96 w-[46rem] -translate-x-1/2 rounded-full bg-sky-400/20 blur-3xl" />
      <!-- 辅助光晕：左下（海绿） -->
      <div class="absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-teal-400/15 blur-3xl" />
      <!-- 白云（轻量 SVG，天蓝色云朵，明暗主题均可见） -->
      <svg class="absolute left-[10%] top-16 h-10 w-28 text-sky-100/80" viewBox="0 0 200 60" fill="currentColor" aria-hidden="true">
        <ellipse cx="70" cy="45" rx="60" ry="18" />
        <ellipse cx="100" cy="30" rx="45" ry="20" />
        <ellipse cx="135" cy="45" rx="55" ry="16" />
      </svg>
      <svg class="absolute right-[16%] top-28 h-7 w-20 text-sky-100/60" viewBox="0 0 200 60" fill="currentColor" aria-hidden="true">
        <ellipse cx="70" cy="45" rx="60" ry="18" />
        <ellipse cx="100" cy="30" rx="45" ry="20" />
        <ellipse cx="135" cy="45" rx="55" ry="16" />
      </svg>
      <!-- 底部海浪（低透明青色波浪线，呼应海岛插画） -->
      <svg class="absolute inset-x-0 bottom-0 h-16 w-full" viewBox="0 0 1440 64" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,40 C160,64 320,8 480,24 C640,40 800,0 960,16 C1120,32 1280,8 1440,28 L1440,64 L0,64 Z" fill="rgba(45,212,191,0.14)" />
      </svg>
      <!-- 细网格纹理：顶部可见、向下渐隐（中性灰，比原 0.07 更淡） -->
      <div
        class="absolute inset-0 bg-[linear-gradient(to_right,rgba(120,120,135,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,120,135,0.05)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_65%_55%_at_50%_0%,black,transparent)]"
      />
    </div>

    <!-- 顶栏（全宽） -->
    <header class="flex h-14 shrink-0 items-center justify-between border-b px-4 sm:px-6">
      <div class="flex min-w-0 items-center gap-3">
        <RouterLink
          to="/"
          class="shrink-0 transition-opacity hover:opacity-80"
          aria-label="返回工作台"
        >
          <img
            :src="logoUrl"
            alt="轩屿"
            class="h-11 w-auto shrink-0 object-contain"
          />
        </RouterLink>
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
              <component :is="item.icon" class="h-4 w-4 shrink-0" />
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

      <!-- 主内容区：VT 支持时由 View Transitions API 过渡，否则用 Vue Transition（fade）降级 -->
      <main class="min-w-0 flex-1 overflow-auto p-6">
        <!-- 面包屑（仅模块页显示，与页面内容容器同宽对齐） -->
        <nav v-if="!isHome" class="mx-auto mb-4 flex max-w-6xl items-center gap-1.5 text-sm" aria-label="面包屑">
          <RouterLink to="/" class="text-muted-foreground transition-colors hover:text-foreground">
            工作台
          </RouterLink>
          <template v-for="(crumb, i) in moduleCrumbs" :key="crumb.title">
            <ChevronRight class="h-3.5 w-3.5 text-muted-foreground/50" />
            <RouterLink
              v-if="i < moduleCrumbs.length - 1"
              :to="crumb.path"
              class="text-muted-foreground transition-colors hover:text-foreground"
            >
              {{ crumb.title }}
            </RouterLink>
            <span v-else class="font-medium text-foreground" aria-current="page">
              {{ crumb.title }}
            </span>
          </template>
        </nav>

        <RouterView v-slot="{ Component }">
          <Transition v-if="!supportsViewTransition" name="page" mode="out-in">
            <component :is="Component" />
          </Transition>
          <component v-else :is="Component" />
        </RouterView>
      </main>
    </div>

    <!-- 编辑资料弹窗 -->
    <ProfileDialog v-model:open="profileOpen" />
  </div>
</template>

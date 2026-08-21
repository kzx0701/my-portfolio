import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { requiresAuth: false, title: '登录' },
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/views/HomeView.vue'),
        meta: { title: '工作台' },
      },
      {
        path: 'orders',
        name: 'orders',
        component: () => import('@/views/orders/OrdersDashboardView.vue'),
        meta: { title: '仪表盘' },
      },
      {
        path: 'orders/list',
        name: 'orders-list',
        component: () => import('@/views/orders/OrdersView.vue'),
        meta: { title: '订单列表' },
      },
      {
        path: 'health',
        name: 'health',
        component: () => import('@/views/health/HealthDashboardView.vue'),
        meta: { title: '仪表盘' },
      },
      {
        path: 'health/records',
        name: 'health-records',
        component: () => import('@/views/health/HealthRecordsView.vue'),
        meta: { title: '健康记录' },
      },
      {
        path: 'health/profile',
        name: 'health-profile',
        component: () => import('@/views/health/HealthProfileView.vue'),
        meta: { title: '个人档案' },
      },
      {
        path: 'health/goal',
        name: 'health-goal',
        component: () => import('@/views/health/HealthGoalView.vue'),
        meta: { title: '健康目标' },
      },
      {
        path: 'knowledge',
        name: 'knowledge',
        component: () => import('@/views/knowledge/KnowledgeDashboardView.vue'),
        meta: { title: '仪表盘' },
      },
      {
        path: 'knowledge/articles',
        name: 'knowledge-articles',
        component: () => import('@/views/knowledge/KnowledgeArticlesView.vue'),
        meta: { title: '知识文件' },
      },
      {
        path: 'ai',
        name: 'ai',
        component: () => import('@/views/ai/AiDashboardView.vue'),
        meta: { title: '仪表盘' },
      },
      {
        path: 'ai/usage',
        name: 'ai-usage',
        component: () => import('@/views/ai/AiUsageView.vue'),
        meta: { title: '消费记录' },
      },
      {
        path: 'ai/tools',
        name: 'ai-tools',
        component: () => import('@/views/ai/AiToolsView.vue'),
        meta: { title: '工具管理' },
      },
      // ---- 预留模块路由：后续确定后在 modules/registry.ts 开启并在此挂载 ----
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// ---- View Transitions API：包装 push，使所有导航（含 RouterLink）自动带上页面过渡 ----
// 原理：startViewTransition(() => router.push(to)) —— push 的 promise 作为回调返回值，
// 浏览器等待导航完成（DOM 更新）后捕获新状态做快照过渡；
// 不支持的浏览器静默降级为直接导航（无动画，优雅降级）。
const originalPush = router.push.bind(router)

/** 导航完成后重置主滚动容器（页面切换回到顶部，规范 SPA 行为） */
function resetMainScroll() {
  document.querySelector('main')?.scrollTo(0, 0)
}

router.push = ((to: Parameters<typeof router.push>[0]) => {
  if (typeof document !== 'undefined' && document.startViewTransition) {
    const transition = document.startViewTransition(async () => {
      await originalPush(to)
      resetMainScroll()
    })
    // startViewTransition 返回的是 ViewTransition 对象（非 Promise，无 .catch/.then），
    // 而 RouterLink 内部会对 router.push 的返回值调用 .catch —— 必须返回其 Promise 形态。
    // updateCallbackDone：回调（导航 + DOM 更新）完成时 resolve，语义与原生 push 一致。
    return transition.updateCallbackDone as unknown as ReturnType<typeof router.push>
  }
  return originalPush(to).then((result) => {
    resetMainScroll()
    return result
  })
}) as typeof router.push

// 全局路由守卫：需要登录的页面未登录则跳转登录页
router.beforeEach(async (to, from) => {
  const auth = useAuthStore()

  // 同一模块内切换菜单（如 仪表盘→接单列表）：禁用整页 VT root 动画，避免整页缩放位移造成的视觉抖动
  // （仅对 root 快照生效，共享元素 vt-* 的 morphing 不受影响；首页↔模块间仍保留原过渡）
  const fromSeg = from.path.split('/')[1]
  const toSeg = to.path.split('/')[1]
  const sameModule =
    from.path !== '/' &&
    to.path !== '/' &&
    fromSeg !== undefined &&
    toSeg !== undefined &&
    fromSeg === toSeg
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('no-page-vt', sameModule)
  }

  // 首次进入时确保会话已初始化
  if (!auth.initialized) {
    auth.init()
    await auth.fetchSession()
  }

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)

  if (requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // 已登录用户访问登录页 → 重定向到首页
  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'home' }
  }

  return true
})

router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  document.title = title ? `${title} · 轩屿工作台` : '轩屿工作台'
})

export default router

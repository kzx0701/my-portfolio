import type { Component } from 'vue'
import {
  Activity,
  BookOpen,
  ClipboardList,
  FileText,
  FolderKanban,
  HeartPulse,
  LayoutDashboard,
  ListChecks,
  Receipt,
  Sparkles,
  Target,
  UserRound,
  Wrench,
} from '@lucide/vue'

/**
 * 模块注册表（配置驱动）
 *
 * 工作台所有模块统一在这里登记：
 * - 模块总入口页（首页）会遍历这里渲染入口卡片
 * - 进入模块后，侧边栏会遍历当前模块的 children 渲染模块内菜单
 * - 后续新增模块：只需在此增加一项 + 在 router 中挂载对应路由，其余自动生效
 */
export interface ModuleMenuItem {
  /** 菜单项唯一标识 */
  key: string
  /** 菜单项名称 */
  title: string
  /** 子页面路径（必须以 / 开头） */
  path: string
  /** 菜单项图标 */
  icon: Component
}

export interface ModuleMeta {
  /** 模块唯一标识（用于路由与 key） */
  key: string
  /** 模块名称 */
  title: string
  /** 模块描述 */
  description: string
  /** 入口路由路径（必须以 / 开头） */
  path: string
  /** 图标组件 */
  icon: Component
  /** 模块内菜单（子页面），进入模块后显示在侧边栏 */
  children?: ModuleMenuItem[]
  /** 是否显示在入口页 / 侧边栏 */
  enabled?: boolean
  /** 排序权重，越小越靠前 */
  order?: number
  /** 当前模块内路由的 basename（用于登录后跳回） */
  active?: boolean
}

export const modules: ModuleMeta[] = [
  {
    key: 'orders',
    title: '接单中心',
    description: '管理个人接单项目，跟踪渠道、阶段与交付。',
    path: '/orders',
    icon: ClipboardList,
    order: 1,
    active: true,
    children: [
      { key: 'orders-dashboard', title: '仪表盘', path: '/orders', icon: LayoutDashboard },
      { key: 'orders-list', title: '订单列表', path: '/orders/list', icon: ListChecks },
    ],
  },
  {
    key: 'health',
    title: '健康中心',
    description: '记录个人健康指标，跟踪体重、BMI 等数据变化。',
    path: '/health',
    icon: HeartPulse,
    order: 2,
    active: true,
    children: [
      { key: 'health-dashboard', title: '仪表盘', path: '/health', icon: LayoutDashboard },
      { key: 'health-records', title: '健康记录', path: '/health/records', icon: Activity },
      { key: 'health-profile', title: '个人档案', path: '/health/profile', icon: UserRound },
      { key: 'health-goal', title: '健康目标', path: '/health/goal', icon: Target },
    ],
  },
  // ---- 以下为预留模块，后续确定后开启（enabled: true）即可 ----
  {
    key: 'knowledge',
    title: '知识库',
    description: '记录与检索知识文件，用分类和标签组织内容。',
    path: '/knowledge',
    icon: BookOpen,
    order: 3,
    active: true,
    children: [
      { key: 'knowledge-dashboard', title: '仪表盘', path: '/knowledge', icon: LayoutDashboard },
      { key: 'knowledge-articles', title: '知识文件', path: '/knowledge/articles', icon: FileText },
    ],
  },
  {
    key: 'ai',
    title: 'AI 中心',
    description: '管理 AI 工具、控制台和密钥记录。',
    path: '/ai',
    icon: Sparkles,
    order: 4,
    active: true,
    children: [
      { key: 'ai-dashboard', title: '仪表盘', path: '/ai', icon: LayoutDashboard },
      { key: 'ai-usage', title: '消费记录', path: '/ai/usage', icon: Receipt },
      { key: 'ai-tools', title: '工具管理', path: '/ai/tools', icon: Wrench },
    ],
  },
  {
    key: 'journals',
    title: '个人日志',
    description: '记录日常与思考，沉淀知识。（预留模块）',
    path: '/journals',
    icon: FileText,
    order: 5,
    enabled: false,
  },
  {
    key: 'projects',
    title: '个人项目',
    description: '展示与管理自己做过的项目。（预留模块）',
    path: '/projects',
    icon: FolderKanban,
    order: 6,
    enabled: false,
  },
  {
    key: 'dashboard',
    title: '数据看板',
    description: '各模块数据聚合总览。（预留模块）',
    path: '/dashboard',
    icon: LayoutDashboard,
    order: 7,
    enabled: false,
  },
]

/** 已启用的模块（入口页与侧边栏只显示这些） */
export const activeModules = modules
  .filter((m) => m.enabled !== false)
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

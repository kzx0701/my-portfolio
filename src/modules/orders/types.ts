import type { Database } from '@/lib/database.types'
import xianyuLogo from '@/assets/images/channels/xianyu.png'
import wechatLogo from '@/assets/images/channels/wechat.svg'

/** 接单订单的进度阶段 */
export type OrderStatus = Database['public']['Tables']['orders']['Row']['status']

/** 订单状态元数据（badgeClass 为各阶段专属配色，Badge 以 variant="outline" + class 使用） */
export const ORDER_STATUS_META: Record<OrderStatus, { label: string; badgeClass: string }> = {
  negotiating: {
    label: '洽谈中',
    badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  },
  quoted: {
    label: '已报价',
    badgeClass: 'border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-400',
  },
  in_progress: {
    label: '进行中',
    badgeClass: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  },
  completed: {
    label: '已完成',
    badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  cancelled: {
    label: '已取消',
    badgeClass: 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400',
  },
}

export const ORDER_STATUS_OPTIONS = (Object.keys(ORDER_STATUS_META) as OrderStatus[]).map(
  (key) => ({ value: key, label: ORDER_STATUS_META[key].label }),
)

/** 渠道来源 */
export type OrderChannel = NonNullable<Database['public']['Tables']['orders']['Row']['channel']>

/** 渠道元数据（logo 与展示名，用于列表与下拉选项） */
export const ORDER_CHANNEL_META: Record<OrderChannel, { label: string; logo: string }> = {
  xianyu: { label: '闲鱼', logo: xianyuLogo },
  wechat: { label: '微信', logo: wechatLogo },
}

export const ORDER_CHANNEL_OPTIONS = (Object.keys(ORDER_CHANNEL_META) as OrderChannel[]).map(
  (key) => ({
    value: key,
    label: ORDER_CHANNEL_META[key].label,
    icon: ORDER_CHANNEL_META[key].logo,
  }),
)

/** 项目类型 */
export type ProjectType = NonNullable<Database['public']['Tables']['orders']['Row']['project_type']>

/** 项目类型元数据（展示名 + tag 配色，用于列表与下拉选项） */
export const PROJECT_TYPE_META: Record<ProjectType, { label: string; badgeClass: string }> = {
  web: {
    label: 'Web',
    badgeClass: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400',
  },
  app: {
    label: 'App',
    badgeClass: 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400',
  },
  miniapp: {
    label: '小程序',
    badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  other: {
    label: '其他',
    badgeClass: 'border-gray-400/40 bg-gray-400/10 text-gray-600 dark:text-gray-400',
  },
}

export const PROJECT_TYPE_OPTIONS = (Object.keys(PROJECT_TYPE_META) as ProjectType[]).map(
  (key) => ({ value: key, label: PROJECT_TYPE_META[key].label }),
)

/** 接单订单（对应 Supabase 表 orders） */
export type Order = Database['public']['Tables']['orders']['Row']

/** 新建 / 编辑订单的入参 */
export type OrderInput = Omit<Order, 'id' | 'user_id' | 'created_at' | 'updated_at'>

/** 回款记录（对应 Supabase 表 payments） */
export type Payment = Database['public']['Tables']['payments']['Row']

/** 新增回款入参 */
export type PaymentInput = Omit<Payment, 'id' | 'order_id' | 'user_id' | 'created_at' | 'updated_at'>

/**
 * 回款阶段（可扩展：未来新增阶段只需在 PAYMENT_STAGE_META 增加一项即可，
 * 数据库 stage 列无 check 约束，无需迁移）
 */
export const PAYMENT_STAGE_META: Record<string, { label: string }> = {
  deposit: { label: '定金' },
  final: { label: '尾款' },
}

export const PAYMENT_STAGE_OPTIONS = Object.keys(PAYMENT_STAGE_META).map((value) => ({
  value,
  label: PAYMENT_STAGE_META[value].label,
}))
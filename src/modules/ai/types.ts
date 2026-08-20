import type { Database } from '@/lib/database.types'
import alipayLogo from '@/assets/images/channels/alipay.svg'
import wechatLogo from '@/assets/images/channels/wechat.svg'

/** AI 工具账号（对应 Supabase 表 ai_services） */
export type AiService = Database['public']['Tables']['ai_services']['Row']

/** 新建 / 编辑工具的入参 */
export type AiServiceInput = Omit<AiService, 'id' | 'user_id' | 'created_at' | 'updated_at'>

/** AI 消费记录（对应 Supabase 表 ai_usage_records） */
export type AiUsageRecord = Database['public']['Tables']['ai_usage_records']['Row']

/** 新建消费记录的入参 */
export type AiUsageRecordInput = Omit<AiUsageRecord, 'id' | 'user_id' | 'created_at' | 'updated_at'>

/** AI 密钥（对应 Supabase 表 ai_secrets） */
export type AiSecret = Database['public']['Tables']['ai_secrets']['Row']

/** 新建 / 编辑密钥的入参 */
export type AiSecretInput = Omit<AiSecret, 'id' | 'user_id' | 'created_at' | 'updated_at'>

/** AI 工具形态（kind：model_api 官方模型 API / agent Agent 工具 / relay 中转站；表单据此切换添加流程） */
export const TOOL_KIND_META: Record<string, { label: string; badgeClass: string }> = {
  model_api: { label: '模型 API', badgeClass: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400' },
  agent: { label: 'Agent 工具', badgeClass: 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400' },
  relay: { label: '中转站', badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400' },
}

export const TOOL_KIND_OPTIONS = Object.keys(TOOL_KIND_META).map((value) => ({
  value,
  label: TOOL_KIND_META[value].label,
}))

/** AI 工具类型（service_type：对应 SERVICE_TYPE_META 中的预设平台；无 check 可扩展） */
export const SERVICE_TYPE_META: Record<string, { label: string; badgeClass: string }> = {
  deepseek: {
    label: 'DeepSeek',
    badgeClass: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400',
  },
  chatgpt: {
    label: 'Chat GPT',
    badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  zhipu: {
    label: '智谱 GLM',
    badgeClass: 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400',
  },
  kimi: {
    label: 'Kimi',
    badgeClass: 'border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400',
  },
  xiaomi: {
    label: '小米 MiMo',
    badgeClass: 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400',
  },
  rightcode: {
    label: 'Right Code',
    badgeClass: 'border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-400',
  },
  pixelapi: {
    label: 'Pixel API',
    badgeClass: 'border-pink-500/30 bg-pink-500/10 text-pink-700 dark:text-pink-400',
  },
  shareapi: {
    label: 'Share API',
    badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  },
  minimax: {
    label: 'MiniMax',
    badgeClass: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400',
  },
  aliyun: {
    label: '阿里云百炼',
    badgeClass: 'border-lime-500/30 bg-lime-500/10 text-lime-700 dark:text-lime-400',
  },
}

export const SERVICE_TYPE_OPTIONS = Object.keys(SERVICE_TYPE_META).map((value) => ({
  value,
  label: SERVICE_TYPE_META[value].label,
}))

/** 工具类型标签文案与徽章样式；未选择返回「其他」 */
export function serviceTypeMeta(type: string | null): { label: string; badgeClass: string } {
  if (type && SERVICE_TYPE_META[type]) return SERVICE_TYPE_META[type]
  return { label: '其他', badgeClass: 'border-gray-500/30 bg-gray-500/10 text-gray-700 dark:text-gray-400' }
}

/** 余额新鲜度判定结果 */
export interface BalanceFresh {
  /** 是否已过期（超过 7 天未更新） */
  stale: boolean
  label: string
  badgeClass: string
}

/** 余额新鲜度提示：记录余额但超过 7 天未更新 → 弱提示可能过期；未记录更新时间 → 提示补录 */
export function balanceFresh(service: Pick<AiService, 'balance' | 'balance_updated_at'>): BalanceFresh | null {
  if (service.balance === null || service.balance === undefined) return null
  if (!service.balance_updated_at) {
    return {
      stale: false,
      label: '未记录更新时间',
      badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    }
  }
  const updated = new Date(service.balance_updated_at)
  if (Number.isNaN(updated.getTime())) return null
  const days = Math.floor((Date.now() - updated.getTime()) / 86400000)
  if (days > 7) {
    return {
      stale: true,
      label: `余额已 ${days} 天未更新`,
      badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    }
  }
  return {
    stale: false,
    label: days === 0 ? '今天更新' : `${days} 天前更新`,
    badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  }
}

/** 支付方式（ai_usage_records.payment_method，仅微信/支付宝；logo 本地素材，列表与下拉同构于订单渠道） */
export const PAYMENT_METHOD_META: Record<string, { label: string; logo: string }> = {
  alipay: { label: '支付宝', logo: alipayLogo },
  wechat: { label: '微信', logo: wechatLogo },
}

export const PAYMENT_METHOD_OPTIONS = Object.keys(PAYMENT_METHOD_META).map((value) => ({
  value,
  label: PAYMENT_METHOD_META[value].label,
  icon: PAYMENT_METHOD_META[value].logo,
}))

/** 支付方式标签与 logo；未选择返回 null */
export function paymentMethodMeta(method: string | null): { label: string; logo: string } | null {
  if (method && PAYMENT_METHOD_META[method]) return PAYMENT_METHOD_META[method]
  return null
}

/** 当前日期 YYYY-MM-DD（消费记录默认值） */
export function currentDate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 当前月份 YYYY-MM（消费统计按此聚合过滤） */
export function currentMonth(): string {
  return currentDate().slice(0, 7)
}

/**
 * 密钥打码：长度 ≤ 8 全打码；否则保留前 4 后 4（如 sk-a1b2****wxyz）
 * 列表与详情展示用，复制时才取明文（复制后组件不保留明文）
 */
export function maskKey(value: string | null): string {
  if (!value) return '—'
  if (value.length <= 8) return '****'
  return `${value.slice(0, 4)}****${value.slice(-4)}`
}

/** 消费类型（ai_usage_records.consumption_type） */
export const CONSUMPTION_TYPE_META: Record<string, { label: string; badgeClass: string }> = {
  recharge: {
    label: '充值',
    badgeClass: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400',
  },
  subscription: {
    label: '订阅',
    badgeClass: 'border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400',
  },
}

export const CONSUMPTION_TYPE_OPTIONS = Object.keys(CONSUMPTION_TYPE_META).map((value) => ({
  value,
  label: CONSUMPTION_TYPE_META[value].label,
}))

/** 消费类型标签与样式；未选择返回 null */
export function consumptionTypeMeta(type: string | null): { label: string; badgeClass: string } | null {
  if (type && CONSUMPTION_TYPE_META[type]) return CONSUMPTION_TYPE_META[type]
  return null
}

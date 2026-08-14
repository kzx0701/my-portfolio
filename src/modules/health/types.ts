import type { Database } from '@/lib/database.types'
import type { CSSProperties } from 'vue'

/** 健康记录（对应 Supabase 表 health_records） */
export type HealthRecord = Database['public']['Tables']['health_records']['Row']

/** 新建 / 编辑健康记录的入参 */
export type HealthRecordInput = Omit<HealthRecord, 'id' | 'user_id' | 'created_at' | 'updated_at'>

/** 个人健康档案（对应 Supabase 表 health_profile，每用户一条；仅存固定生理属性） */
export type HealthProfile = Database['public']['Tables']['health_profile']['Row']

/** 新建 / 编辑健康档案的入参 */
export type HealthProfileInput = Omit<HealthProfile, 'user_id' | 'created_at' | 'updated_at'>

/** 健康目标（对应 Supabase 表 health_goal，每用户可多个目标：不同阶段/并行计划） */
export type HealthGoal = Database['public']['Tables']['health_goal']['Row']

/** 健康目标状态 */
export type HealthGoalStatus = HealthGoal['status']

/** 新建 / 编辑健康目标的表单入参（不含状态，新建默认进行中） */
export type HealthGoalInput = Omit<HealthGoal, 'id' | 'user_id' | 'status' | 'created_at' | 'updated_at'>

/** 更新健康目标的补丁（含状态变更，如标记完成/取消） */
export type HealthGoalPatch = Partial<HealthGoalInput> & { status?: HealthGoalStatus }

/** 健康目标类型 */
export const GOAL_TYPE_META: Record<NonNullable<HealthGoal['goal_type']>, { label: string }> = {
  fat_loss: { label: '减脂' },
  muscle_gain: { label: '增肌' },
  maintain: { label: '维持现状' },
}

export const GOAL_TYPE_OPTIONS = Object.keys(GOAL_TYPE_META).map((value) => ({
  value,
  label: GOAL_TYPE_META[value as keyof typeof GOAL_TYPE_META].label,
}))

/** 健康目标状态元数据（badgeClass 语义色：进行中 indigo / 已完成 emerald / 已取消 red，与订单模块一致） */
export const GOAL_STATUS_META: Record<HealthGoalStatus, { label: string; badgeClass: string }> = {
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

export const GOAL_STATUS_OPTIONS = (Object.keys(GOAL_STATUS_META) as HealthGoalStatus[]).map(
  (value) => ({ value, label: GOAL_STATUS_META[value].label }),
)

/** 性别选项 */
export const GENDER_META: Record<NonNullable<HealthProfile['gender']>, { label: string }> = {
  male: { label: '男' },
  female: { label: '女' },
}

export const GENDER_OPTIONS = Object.keys(GENDER_META).map((value) => ({
  value,
  label: GENDER_META[value as keyof typeof GENDER_META].label,
}))

/** 血型选项 */
export const BLOOD_TYPE_META: Record<NonNullable<HealthProfile['blood_type']>, { label: string }> = {
  A: { label: 'A 型' },
  B: { label: 'B 型' },
  AB: { label: 'AB 型' },
  O: { label: 'O 型' },
}

export const BLOOD_TYPE_OPTIONS = Object.keys(BLOOD_TYPE_META).map((value) => ({
  value,
  label: BLOOD_TYPE_META[value as keyof typeof BLOOD_TYPE_META].label,
}))

/** 目标进度派生结果 */
export interface GoalProgress {
  start: number | null
  current: number | null
  target: number | null
  /** 已变化量（当前 - 起始，负=减重） */
  changed: number | null
  /** 进度百分比 0-100（(当前-起始)/(目标-起始)，clamp；无当前记录按起始计 0） */
  progress: number | null
  /** 距离目标日剩余天数（已过期为负数） */
  daysLeft: number | null
}

/** 计算单个健康目标的进度（起始基线 → 当前 → 目标 + 差值 + 进度 + 剩余天数） */
export function calcGoalProgress(
  goal: Pick<HealthGoal, 'start_weight_kg' | 'target_weight_kg' | 'target_date'>,
  currentWeight: number | null,
): GoalProgress {
  const start = goal.start_weight_kg ?? null
  const target = goal.target_weight_kg ?? null
  const current = currentWeight
  const changed = start !== null && current !== null ? Math.round((current - start) * 10) / 10 : null
  let progress: number | null = null
  if (start !== null && target !== null && start !== target) {
    const cur = current ?? start
    progress = Math.min(100, Math.max(0, Math.round(((cur - start) / (target - start)) * 100)))
  }
  let daysLeft: number | null = null
  if (goal.target_date) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(goal.target_date)
    if (m) {
      const targetDate = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      daysLeft = Math.round((targetDate.getTime() - todayStart.getTime()) / 86400000)
    }
  }
  return { start, current, target, changed, progress, daysLeft }
}

/**
 * 进度条渐变样式：颜色由进度值决定（红 → 橙 → 黄 → 绿），而非条内完整渐变。
 * 原理：4 色长渐变铺成 400% 宽度，background-position 随进度平移，
 * 可见窗口滑到对应色段 —— 0% 红、50% 黄、100% 绿
 */
export function goalProgressStyle(progress: number | null): CSSProperties {
  const p = Math.min(100, Math.max(0, progress ?? 0))
  return {
    backgroundImage:
      'linear-gradient(90deg, #ef4444 0%, #f97316 25%, #f59e0b 50%, #84cc16 75%, #22c55e 100%)',
    backgroundSize: '400% 100%',
    backgroundPosition: `${p}% 0%`,
  }
}

/** 目标剩余天数文案：目标日前「剩余 N 天」/ 当天「今天到期」/ 超期「超出 N 天」 */
export function goalDaysLeftLabel(daysLeft: number | null): string {
  if (daysLeft === null) return ''
  if (daysLeft > 0) return `剩余 ${daysLeft} 天`
  if (daysLeft === 0) return '今天到期'
  return `超出 ${Math.abs(daysLeft)} 天`
}

/** 由出生日期计算当前年龄（不足一岁按 0 处理；无效日期返回 null） */
export function calcAge(birthDate: string | null): number | null {
  if (!birthDate) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate)
  if (!m) return null
  const birth = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  if (beforeBirthday) age -= 1
  return age >= 0 ? age : null
}

/**
 * BMI 计算：weight_kg ÷ (height_cm / 100)²
 * 任一指标缺失返回 null（BMI 为派生值，不落库，由前端计算）
 */
export function calcBMI(weightKg: number | null, heightCm: number | null): number | null {
  if (weightKg === null || heightCm === null || heightCm <= 0) return null
  const h = heightCm / 100
  return Math.round((weightKg / (h * h)) * 100) / 100
}

/**
 * 有效 BMI：手动录入优先（bmi 列），留空时按体重 + 档案身高自动计算
 */
export function resolveBMI(
  bmi: number | null,
  weightKg: number | null,
  heightCm: number | null,
): number | null {
  return bmi ?? calcBMI(weightKg, heightCm)
}

/**
 * BMI 分类（中国标准）与展示配色
 * <18.5 偏瘦（amber）/ 18.5-23.9 正常（emerald）/ 24-27.9 超重（amber）/ ≥28 肥胖（red）
 */
export function bmiMeta(bmi: number | null): { label: string; badgeClass: string } {
  if (bmi === null) return { label: '—', badgeClass: '' }
  if (bmi < 18.5) {
    return { label: '偏瘦', badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400' }
  }
  if (bmi < 24) {
    return { label: '正常', badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' }
  }
  if (bmi < 28) {
    return { label: '超重', badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400' }
  }
  return { label: '肥胖', badgeClass: 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400' }
}

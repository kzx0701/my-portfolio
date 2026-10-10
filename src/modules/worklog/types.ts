import type { Database } from '@/lib/database.types'

export type WorkLogItem = Database['public']['Tables']['work_log_items']['Row']
export type WorkLogStatus = WorkLogItem['status']
export type WorkLogItemInput = Pick<WorkLogItem, 'work_date' | 'title' | 'description'>

/**
 * 工作日志统计（无「逾期」概念：日志只记录哪天安排了什么，不产生欠账）
 */
export interface WorkLogDashboardStats {
  /** 全部未完成事项 */
  pendingTotal: number
  /** 今日完成（按完成时间统计） */
  todayCompleted: number
  /** 近 7 日完成数 */
  last7Completed: number
  /** 近 7 日完成率（已取消不参与计算） */
  last7CompletionRate: number
}

export interface WorkLogStatusMeta {
  /** 状态中文名 */
  label: string
  /** 圆点/强调色 */
  dotClass: string
  /** 文字色 */
  textClass: string
  /** 浅底徽章 */
  badgeClass: string
}

export const WORK_LOG_STATUS_META: Record<WorkLogStatus, WorkLogStatusMeta> = {
  pending: {
    label: '待办',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-600 dark:text-amber-400',
    badgeClass: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  },
  completed: {
    label: '已完成',
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    badgeClass: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  cancelled: {
    label: '已取消',
    dotClass: 'bg-slate-400',
    textClass: 'text-muted-foreground',
    badgeClass: 'border-slate-400/25 bg-slate-400/10 text-slate-600 dark:text-slate-400',
  },
}

/** 列表分组顺序：待办 → 已完成 → 已取消 */
export const WORK_LOG_STATUS_ORDER: WorkLogStatus[] = ['pending', 'completed', 'cancelled']

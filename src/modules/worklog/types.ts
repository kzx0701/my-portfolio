import type { Database } from '@/lib/database.types'

export type WorkLogItem = Database['public']['Tables']['work_log_items']['Row']
export type WorkLogStatus = WorkLogItem['status']
export type WorkLogItemInput = Pick<WorkLogItem, 'work_date' | 'title' | 'description'>

export interface WorkLogDashboardStats {
  currentPending: number
  todayCompleted: number
  overdue: number
  last7CompletionRate: number
}

export const WORK_LOG_STATUS_META: Record<
  WorkLogStatus,
  { label: string; badgeClass: string }
> = {
  pending: {
    label: '待办',
    badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  },
  completed: {
    label: '已完成',
    badgeClass:
      'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  cancelled: {
    label: '已取消',
    badgeClass: 'border-slate-400/30 bg-slate-400/10 text-slate-600 dark:text-slate-400',
  },
}

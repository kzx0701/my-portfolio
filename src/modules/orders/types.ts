import type { Database } from '@/lib/database.types'

/** 接单订单的进度阶段 */
export type OrderStatus = Database['public']['Tables']['orders']['Row']['status']

/** 订单状态元数据（用于渲染 badge 颜色与下拉选项） */
export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  pending: { label: '待报价', variant: 'secondary' },
  negotiating: { label: '洽谈中', variant: 'outline' },
  in_progress: { label: '进行中', variant: 'default' },
  completed: { label: '已完成', variant: 'secondary' },
  paid: { label: '已回款', variant: 'default' },
  cancelled: { label: '已取消', variant: 'destructive' },
}

export const ORDER_STATUS_OPTIONS = (Object.keys(ORDER_STATUS_META) as OrderStatus[]).map(
  (key) => ({ value: key, label: ORDER_STATUS_META[key].label }),
)

/** 接单订单（对应 Supabase 表 orders） */
export type Order = Database['public']['Tables']['orders']['Row']

/** 新建 / 编辑订单的入参 */
export type OrderInput = Omit<Order, 'id' | 'user_id' | 'created_at' | 'updated_at'>
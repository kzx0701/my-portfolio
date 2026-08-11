/** 接单订单的进度阶段 */
export type OrderStatus =
  | 'pending' // 待报价
  | 'negotiating' // 洽谈中
  | 'in_progress' // 进行中
  | 'completed' // 已完成
  | 'paid' // 已回款
  | 'cancelled' // 已取消

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
export interface Order {
  id: string
  user_id: string
  /** 项目名称 */
  project_name: string
  /** 客户名称（可空） */
  client_name: string | null
  /** 项目金额（单位：元，可空） */
  amount: number | null
  /** 当前阶段 */
  status: OrderStatus
  /** 进度百分比 0-100 */
  progress: number
  /** 项目描述 / 备注 */
  description: string | null
  /** 开始日期 */
  start_date: string | null
  /** 交付/截止日期 */
  due_date: string | null
  created_at: string
  updated_at: string
}

/** 新建 / 编辑订单的入参 */
export type OrderInput = Omit<Order, 'id' | 'user_id' | 'created_at' | 'updated_at'>
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type { Order, OrderInput, Payment, PaymentInput } from './types'

export const useOrdersStore = defineStore('orders', () => {
  const orders = ref<Order[]>([])
  /** 回款记录：orderId → Payment[] */
  const paymentsMap = ref<Record<string, Payment[]>>({})
  const loading = ref(false)
  const error = ref<string | null>(null)
  /** 是否已成功加载过数据（首次加载显示骨架屏，之后切换菜单静默刷新，避免骨架屏反复闪现） */
  const hasLoaded = ref(false)
  /** 已加载数据的用户 id：同一用户页面切换不重复全量拉取（避免每次进入都等 5-6 秒） */
  let loadedUserId: string | undefined

  const stats = computed(() => {
    const active = orders.value.filter(
      (o) => o.status !== 'completed' && o.status !== 'cancelled',
    ).length
    const total = orders.value.length
    const completed = orders.value.filter((o) => o.status === 'completed').length
    // 全部订单已收款总额（所有回款记录金额合计）
    const paidTotal = Object.values(paymentsMap.value).reduce(
      (sum, list) => sum + list.reduce((s, p) => s + (p.amount ?? 0), 0),
      0,
    )
    return { active, total, completed, paidTotal }
  })

  /** 拉取订单与回款数据；返回是否成功（供调用方做刷新提示等） */
  async function fetchOrders(force = false): Promise<boolean> {
    const auth = useAuthStore()
    if (!auth.user) return false
    // 同一用户已加载过 → 直接复用本地数据（切页零请求；换账号或刷新页面会重新加载；force 可强制刷新）
    if (!force && hasLoaded.value && loadedUserId === auth.user.id) return true
    loadedUserId = auth.user.id
    if (!hasLoaded.value) loading.value = true
    error.value = null
    try {
      // 单次嵌套查询：orders 连同各自 payments 一次取回（外键关系 payments_order_id_fkey）
      const { data, error: err } = await supabase
        .from('orders')
        .select('*, payments(id, order_id, user_id, stage, amount, paid_at, note, created_at, updated_at)')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false })
      if (err) throw err
      const raw = (data ?? []) as unknown as (Order & { payments?: Payment[] | null })[]
      // 剥离嵌套 payments 字段，保证 orders.value 与 Order 类型一致
      orders.value = raw.map(({ payments: _p, ...order }) => order)
      const map: Record<string, Payment[]> = {}
      for (const o of raw) {
        if (o.payments?.length) {
          map[o.id] = [...o.payments].sort((a, b) =>
            (b.paid_at ?? '').localeCompare(a.paid_at ?? ''),
          )
        }
      }
      paymentsMap.value = map
      hasLoaded.value = true
      return true
    } catch (e: any) {
      error.value = e?.message ?? '加载订单失败'
      console.error('fetchOrders error:', e)
      return false
    } finally {
      loading.value = false
    }
  }

  async function createOrder(input: OrderInput) {
    const auth = useAuthStore()
    if (!auth.user) throw new Error('未登录')
    const { data, error: err } = await supabase
      .from('orders')
      .insert({ ...input, user_id: auth.user.id })
      .select()
      .single()
    if (err) throw err
    orders.value.unshift(data)
    return data
  }

  async function updateOrder(id: string, input: Partial<OrderInput>) {
    const { data, error: err } = await supabase
      .from('orders')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (err) throw err
    const idx = orders.value.findIndex((o) => o.id === id)
    if (idx !== -1) orders.value[idx] = data
    return data
  }

  async function deleteOrder(id: string) {
    const { error: err } = await supabase.from('orders').delete().eq('id', id)
    if (err) throw err
    orders.value = orders.value.filter((o) => o.id !== id)
    delete paymentsMap.value[id]
  }

  /** 某订单的回款记录（按 paid_at 倒序） */
  function paymentsOf(orderId: string): Payment[] {
    return paymentsMap.value[orderId] ?? []
  }

  /** 某订单已回款金额合计 */
  function paidTotalOf(orderId: string): number {
    return paymentsOf(orderId).reduce((sum, p) => sum + (p.amount ?? 0), 0)
  }

  async function addPayment(orderId: string, input: PaymentInput) {
    const auth = useAuthStore()
    if (!auth.user) throw new Error('未登录')
    const { data, error: err } = await supabase
      .from('payments')
      .insert({ ...input, order_id: orderId, user_id: auth.user.id })
      .select()
      .single()
    if (err) throw err
    ;(paymentsMap.value[orderId] ??= []).unshift(data)
    return data
  }

  async function deletePayment(orderId: string, paymentId: string) {
    const { error: err } = await supabase.from('payments').delete().eq('id', paymentId)
    if (err) throw err
    paymentsMap.value[orderId] = (paymentsMap.value[orderId] ?? []).filter((p) => p.id !== paymentId)
  }

  return {
    orders,
    paymentsMap,
    loading,
    error,
    stats,
    fetchOrders,
    createOrder,
    updateOrder,
    deleteOrder,
    paymentsOf,
    paidTotalOf,
    addPayment,
    deletePayment,
  }
})
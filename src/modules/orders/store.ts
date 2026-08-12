import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type { Order, OrderInput } from './types'

export const useOrdersStore = defineStore('orders', () => {
  const orders = ref<Order[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  /** 是否已成功加载过数据（首次加载显示骨架屏，之后切换菜单静默刷新，避免骨架屏反复闪现） */
  const hasLoaded = ref(false)

  const stats = computed(() => {
    const active = orders.value.filter(
      (o) => o.status !== 'completed' && o.status !== 'cancelled',
    ).length
    const total = orders.value.length
    const completed = orders.value.filter((o) => o.status === 'completed').length
    const paidTotal = orders.value
      .filter((o) => o.status === 'paid')
      .reduce((sum, o) => sum + (o.amount ?? 0), 0)
    return { active, total, completed, paidTotal }
  })

  async function fetchOrders() {
    const auth = useAuthStore()
    if (!auth.user) return
    if (!hasLoaded.value) loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false })
      if (err) throw err
      orders.value = data ?? []
      hasLoaded.value = true
    } catch (e: any) {
      error.value = e?.message ?? '加载订单失败'
      console.error('fetchOrders error:', e)
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
  }

  return {
    orders,
    loading,
    error,
    stats,
    fetchOrders,
    createOrder,
    updateOrder,
    deleteOrder,
  }
})
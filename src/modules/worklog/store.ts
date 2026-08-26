import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import { createRequestDeduper } from '@/lib/request-deduper'
import { useAuthStore } from '@/stores/auth'
import { addDaysToKey, localDayIsoBounds, toDateKey } from './date'
import type {
  WorkLogDashboardStats,
  WorkLogItem,
  WorkLogItemInput,
  WorkLogStatus,
} from './types'

const EMPTY_STATS: WorkLogDashboardStats = {
  currentPending: 0,
  todayCompleted: 0,
  overdue: 0,
  last7CompletionRate: 0,
}

export const useWorklogStore = defineStore('worklog', () => {
  const authStore = useAuthStore()
  const itemMap = ref<Record<string, WorkLogItem>>({})
  const loadedRanges = new Set<string>()
  const rangeRequests = new Map<string, Promise<boolean>>()
  const loading = ref(false)
  const error = ref<string | null>(null)

  const dashboardStats = ref<WorkLogDashboardStats>({ ...EMPTY_STATS })
  const dashboardPending = ref<WorkLogItem[]>([])
  const recentCompleted = ref<WorkLogItem[]>([])
  const dashboardLoading = ref(false)
  const dashboardError = ref<string | null>(null)
  const dashboardRequest = createRequestDeduper<boolean>()
  let dashboardLoaded = false
  let loadedUserId: string | undefined

  const items = computed(() => Object.values(itemMap.value))

  function reset() {
    itemMap.value = {}
    loadedRanges.clear()
    rangeRequests.clear()
    loading.value = false
    error.value = null
    dashboardStats.value = { ...EMPTY_STATS }
    dashboardPending.value = []
    recentCompleted.value = []
    dashboardLoading.value = false
    dashboardError.value = null
    dashboardLoaded = false
    loadedUserId = undefined
    dashboardRequest.clear()
  }

  watch(
    () => authStore.user?.id,
    (userId, previousUserId) => {
      if (userId !== previousUserId) reset()
    },
  )

  function itemsForDate(date: string): WorkLogItem[] {
    const statusOrder: Record<WorkLogStatus, number> = { pending: 0, completed: 1, cancelled: 2 }
    return items.value
      .filter((item) => item.work_date === date)
      .sort(
        (a, b) =>
          statusOrder[a.status] - statusOrder[b.status] ||
          a.created_at.localeCompare(b.created_at),
      )
  }

  async function loadRange(start: string, end: string, force = false): Promise<boolean> {
    const auth = useAuthStore()
    if (!auth.user) return false
    const rangeKey = `${auth.user.id}:${start}:${end}`
    if (!force && loadedRanges.has(rangeKey)) return true
    loadedUserId = auth.user.id
    error.value = null
    try {
      const { data, error: queryError } = await supabase
        .from('work_log_items')
        .select('*')
        .eq('user_id', auth.user.id)
        .gte('work_date', start)
        .lte('work_date', end)
        .order('created_at', { ascending: true })
      if (queryError) throw queryError
      if (auth.user?.id !== loadedUserId) return false

      const next = { ...itemMap.value }
      for (const [id, item] of Object.entries(next)) {
        if (item.work_date >= start && item.work_date <= end) delete next[id]
      }
      for (const item of data ?? []) next[item.id] = item
      itemMap.value = next
      loadedRanges.add(rangeKey)
      return true
    } catch (caught: any) {
      error.value = caught?.message ?? '加载工作日志失败'
      console.error('fetchWorkLogRange error:', caught)
      return false
    }
  }

  function fetchRange(start: string, end: string, force = false): Promise<boolean> {
    const userId = authStore.user?.id ?? 'anonymous'
    const key = `${userId}:${start}:${end}`
    if (!force && loadedRanges.has(key)) return Promise.resolve(true)
    const existing = rangeRequests.get(key)
    if (existing) return existing
    const request = loadRange(start, end, force).finally(() => {
      if (rangeRequests.get(key) === request) rangeRequests.delete(key)
      loading.value = rangeRequests.size > 0
    })
    rangeRequests.set(key, request)
    loading.value = true
    return request
  }

  function markDashboardDirty() {
    dashboardLoaded = false
  }

  async function createItem(input: WorkLogItemInput): Promise<WorkLogItem> {
    const auth = useAuthStore()
    if (!auth.user) throw new Error('未登录')
    const payload = { ...input, title: input.title.trim(), user_id: auth.user.id }
    const { data, error: insertError } = await supabase
      .from('work_log_items')
      .insert(payload)
      .select()
      .single()
    if (insertError) throw insertError
    itemMap.value = { ...itemMap.value, [data.id]: data }
    markDashboardDirty()
    return data
  }

  async function updateItem(id: string, input: WorkLogItemInput): Promise<WorkLogItem> {
    const auth = useAuthStore()
    if (!auth.user) throw new Error('未登录')
    const { data, error: updateError } = await supabase
      .from('work_log_items')
      .update({ ...input, title: input.title.trim() })
      .eq('id', id)
      .eq('user_id', auth.user.id)
      .select()
      .single()
    if (updateError) throw updateError
    itemMap.value = { ...itemMap.value, [data.id]: data }
    markDashboardDirty()
    return data
  }

  async function changeStatus(id: string, status: WorkLogStatus): Promise<WorkLogItem> {
    const auth = useAuthStore()
    if (!auth.user) throw new Error('未登录')
    const now = new Date().toISOString()
    const { data, error: updateError } = await supabase
      .from('work_log_items')
      .update({
        status,
        completed_at: status === 'completed' ? now : null,
        cancelled_at: status === 'cancelled' ? now : null,
      })
      .eq('id', id)
      .eq('user_id', auth.user.id)
      .select()
      .single()
    if (updateError) throw updateError
    itemMap.value = { ...itemMap.value, [data.id]: data }
    dashboardPending.value = dashboardPending.value
      .map((item) => (item.id === data.id ? data : item))
      .filter((item) => item.status === 'pending')
    markDashboardDirty()
    return data
  }

  async function deleteItem(id: string): Promise<void> {
    const auth = useAuthStore()
    if (!auth.user) throw new Error('未登录')
    const { error: deleteError } = await supabase
      .from('work_log_items')
      .delete()
      .eq('id', id)
      .eq('user_id', auth.user.id)
    if (deleteError) throw deleteError
    const next = { ...itemMap.value }
    delete next[id]
    itemMap.value = next
    dashboardPending.value = dashboardPending.value.filter((item) => item.id !== id)
    recentCompleted.value = recentCompleted.value.filter((item) => item.id !== id)
    markDashboardDirty()
  }

  async function loadDashboard(force = false): Promise<boolean> {
    const auth = useAuthStore()
    if (!auth.user) return false
    if (!force && dashboardLoaded) return true
    const userId = auth.user.id
    const today = toDateKey(new Date())
    const sevenDaysAgo = addDaysToKey(today, -6)
    const todayBounds = localDayIsoBounds(today)
    dashboardLoading.value = true
    dashboardError.value = null

    try {
      const results = await Promise.all([
        supabase
          .from('work_log_items')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'pending')
          .lte('work_date', today),
        supabase
          .from('work_log_items')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'completed')
          .gte('completed_at', todayBounds.start)
          .lt('completed_at', todayBounds.end),
        supabase
          .from('work_log_items')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'pending')
          .lt('work_date', today),
        supabase
          .from('work_log_items')
          .select('status')
          .eq('user_id', userId)
          .gte('work_date', sevenDaysAgo)
          .lte('work_date', today)
          .neq('status', 'cancelled'),
        supabase
          .from('work_log_items')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'pending')
          .lte('work_date', today)
          .order('work_date', { ascending: true })
          .order('created_at', { ascending: true })
          .limit(8),
        supabase
          .from('work_log_items')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(6),
      ])
      const [pendingCount, completedTodayCount, overdueCount, recentWeek, pendingPreview, completedPreview] =
        results

      const firstError = results.map((result) => result.error).find(Boolean)
      if (firstError) throw firstError
      if (auth.user?.id !== userId) return false

      const weeklyItems = recentWeek.data ?? []
      const completed = weeklyItems.filter((item) => item.status === 'completed').length
      dashboardStats.value = {
        currentPending: pendingCount.count ?? 0,
        todayCompleted: completedTodayCount.count ?? 0,
        overdue: overdueCount.count ?? 0,
        last7CompletionRate:
          weeklyItems.length === 0 ? 0 : Math.round((completed / weeklyItems.length) * 100),
      }
      dashboardPending.value = pendingPreview.data ?? []
      recentCompleted.value = completedPreview.data ?? []
      const next = { ...itemMap.value }
      for (const item of [...dashboardPending.value, ...recentCompleted.value]) next[item.id] = item
      itemMap.value = next
      dashboardLoaded = true
      return true
    } catch (caught: any) {
      dashboardError.value = caught?.message ?? '加载工作日志统计失败'
      console.error('fetchWorklogDashboard error:', caught)
      return false
    } finally {
      dashboardLoading.value = false
    }
  }

  function fetchDashboard(force = false): Promise<boolean> {
    return dashboardRequest.run(() => loadDashboard(force), force)
  }

  return {
    items,
    loading,
    error,
    dashboardStats,
    dashboardPending,
    recentCompleted,
    dashboardLoading,
    dashboardError,
    itemsForDate,
    fetchRange,
    fetchDashboard,
    createItem,
    updateItem,
    changeStatus,
    deleteItem,
    reset,
  }
})

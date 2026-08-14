import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type {
  HealthGoal,
  HealthGoalInput,
  HealthGoalPatch,
  HealthProfile,
  HealthProfileInput,
  HealthRecord,
  HealthRecordInput,
} from './types'

export const useHealthStore = defineStore('health', () => {
  /** 健康记录（按 record_date 倒序） */
  const records = ref<HealthRecord[]>([])
  /** 个人健康档案（每用户一条，未建档为 null） */
  const profile = ref<HealthProfile | null>(null)
  /** 健康目标列表（多目标，按 created_at 倒序） */
  const goals = ref<HealthGoal[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  /** 是否已成功加载过数据（首次加载显示骨架屏，之后切换菜单静默刷新，避免骨架屏反复闪现） */
  const hasLoaded = ref(false)
  /** 已加载数据的用户 id：同一用户页面切换不重复全量拉取 */
  let loadedUserId: string | undefined
  /** 目标已加载的用户 id（与 records 分开跟踪） */
  let goalsLoadedUserId: string | undefined

  /** 按 record_date 倒序（最新在前）重排；ISO 日期字符串字典序即时间序 */
  function sortByDate(list: HealthRecord[]): HealthRecord[] {
    return [...list].sort((a, b) => b.record_date.localeCompare(a.record_date))
  }

  /** 拉取健康目标列表（按 created_at 倒序，最新在前） */
  async function fetchGoals(force = false): Promise<boolean> {
    const auth = useAuthStore()
    if (!auth.user) return false
    if (!force && goals.value.length > 0 && goalsLoadedUserId === auth.user.id) return true
    goalsLoadedUserId = auth.user.id
    try {
      const { data, error: err } = await supabase
        .from('health_goal')
        .select('*')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false })
      if (err) throw err
      goals.value = (data ?? []) as HealthGoal[]
      return true
    } catch (e: any) {
      console.error('fetchGoals error:', e)
      return false
    }
  }

  /** 新建健康目标（默认进行中） */
  async function createGoal(input: HealthGoalInput) {
    const auth = useAuthStore()
    if (!auth.user) throw new Error('未登录')
    const { data, error: err } = await supabase
      .from('health_goal')
      .insert({ ...input, user_id: auth.user.id, status: 'in_progress' })
      .select()
      .single()
    if (err) throw err
    goals.value.unshift(data)
    return data
  }

  /** 更新健康目标（支持局部字段 + 状态变更，如标记完成/取消） */
  async function updateGoal(id: string, patch: HealthGoalPatch) {
    const { data, error: err } = await supabase
      .from('health_goal')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (err) throw err
    const idx = goals.value.findIndex((g) => g.id === id)
    if (idx !== -1) goals.value[idx] = data
    return data
  }

  async function deleteGoal(id: string) {
    const { error: err } = await supabase.from('health_goal').delete().eq('id', id)
    if (err) throw err
    goals.value = goals.value.filter((g) => g.id !== id)
  }

  /** 拉取个人档案（每用户一条，未建档返回 null） */
  async function fetchProfile(force = false): Promise<boolean> {
    const auth = useAuthStore()
    if (!auth.user) return false
    if (!force && profile.value !== null) return true
    try {
      const { data, error: err } = await supabase
        .from('health_profile')
        .select('*')
        .eq('user_id', auth.user.id)
        .maybeSingle()
      if (err) throw err
      profile.value = (data ?? null) as HealthProfile | null
      return true
    } catch (e: any) {
      console.error('fetchProfile error:', e)
      return false
    }
  }

  /** 保存个人档案（有则更新，无则插入，upsert 保持每用户一条） */
  async function saveProfile(input: HealthProfileInput) {
    const auth = useAuthStore()
    if (!auth.user) throw new Error('未登录')
    const { data, error: err } = await supabase
      .from('health_profile')
      .upsert({ ...input, user_id: auth.user.id })
      .select()
      .single()
    if (err) throw err
    profile.value = data as HealthProfile
    return data
  }

  /** 拉取健康记录；返回是否成功（供调用方做刷新提示等） */
  async function fetchRecords(force = false): Promise<boolean> {
    const auth = useAuthStore()
    if (!auth.user) return false
    // 同一用户已加载过 → 直接复用本地数据（切页零请求；换账号或刷新页面会重新加载；force 可强制刷新）
    if (!force && hasLoaded.value && loadedUserId === auth.user.id) return true
    loadedUserId = auth.user.id
    if (!hasLoaded.value) loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('health_records')
        .select('*')
        .eq('user_id', auth.user.id)
        .order('record_date', { ascending: false })
      if (err) throw err
      records.value = (data ?? []) as HealthRecord[]
      hasLoaded.value = true
      return true
    } catch (e: any) {
      error.value = e?.message ?? '加载健康记录失败'
      console.error('fetchRecords error:', e)
      return false
    } finally {
      loading.value = false
    }
  }

  async function createRecord(input: HealthRecordInput) {
    const auth = useAuthStore()
    if (!auth.user) throw new Error('未登录')
    const { data, error: err } = await supabase
      .from('health_records')
      .insert({ ...input, user_id: auth.user.id })
      .select()
      .single()
    if (err) throw err
    // 保持 record_date 倒序（新建记录插入正确位置）
    records.value = sortByDate([data, ...records.value])
    return data
  }

  async function updateRecord(id: string, input: Partial<HealthRecordInput>) {
    const { data, error: err } = await supabase
      .from('health_records')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (err) throw err
    const idx = records.value.findIndex((r) => r.id === id)
    if (idx !== -1) {
      records.value[idx] = data
      // 编辑可能修改了 record_date，替换后重排以维持倒序
      records.value = sortByDate(records.value)
    }
    return data
  }

  async function deleteRecord(id: string) {
    const { error: err } = await supabase.from('health_records').delete().eq('id', id)
    if (err) throw err
    records.value = records.value.filter((r) => r.id !== id)
  }

  return {
    records,
    profile,
    goals,
    loading,
    error,
    fetchRecords,
    fetchProfile,
    saveProfile,
    fetchGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    createRecord,
    updateRecord,
    deleteRecord,
  }
})

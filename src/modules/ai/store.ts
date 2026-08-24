import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import { createRequestDeduper } from '@/lib/request-deduper'
import { useAuthStore } from '@/stores/auth'
import type {
  AiSecret,
  AiSecretInput,
  AiService,
  AiServiceInput,
  AiUsageRecord,
  AiUsageRecordInput,
} from './types'

export const useAiStore = defineStore('ai', () => {
  const authStore = useAuthStore()
  /** AI 工具列表（按 created_at 倒序，最新在前） */
  const services = ref<AiService[]>([])
  /** 消费记录（按 usage_month 倒序，再按 created_at 倒序） */
  const usage = ref<AiUsageRecord[]>([])
  /** 密钥列表（按 updated_at 倒序） */
  const secrets = ref<AiSecret[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  /** 已加载数据的用户 id：同一用户页面切换不重复全量拉取 */
  let servicesLoadedUserId: string | undefined
  let usageLoadedUserId: string | undefined
  let secretsLoadedUserId: string | undefined
  const secretPublicColumns = 'id, user_id, service_id, name, service, note, created_at, updated_at'
  const servicesRequest = createRequestDeduper<boolean>()
  const usageRequest = createRequestDeduper<boolean>()
  const secretsRequest = createRequestDeduper<boolean>()

  function reset() {
    services.value = []
    usage.value = []
    secrets.value = []
    loading.value = false
    error.value = null
    servicesLoadedUserId = undefined
    usageLoadedUserId = undefined
    secretsLoadedUserId = undefined
    servicesRequest.clear()
    usageRequest.clear()
    secretsRequest.clear()
  }

  watch(
    () => authStore.user?.id,
    (userId, previousUserId) => {
      if (userId !== previousUserId) reset()
    },
  )

  /** 工具排序：按 created_at 倒序 */
  function sortServices(list: AiService[]): AiService[] {
    return [...list].sort((a, b) => b.created_at.localeCompare(a.created_at))
  }

  /** 消费记录排序：日期倒序 → 创建时间倒序 */
  function sortUsage(list: AiUsageRecord[]): AiUsageRecord[] {
    return [...list].sort((a, b) => {
      const m = b.usage_date.localeCompare(a.usage_date)
      if (m !== 0) return m
      return b.created_at.localeCompare(a.created_at)
    })
  }

  /** 拉取工具列表；返回是否成功（供调用方做刷新提示等） */
  async function loadServices(force = false): Promise<boolean> {
    const auth = useAuthStore()
    if (!auth.user) return false
    if (!force && servicesLoadedUserId === auth.user.id) return true
    const userId = auth.user.id
    if (services.value.length === 0) loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('ai_services')
        .select('*')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false })
      if (err) throw err
      if (auth.user?.id !== userId) return false
      services.value = sortServices((data ?? []) as AiService[])
      servicesLoadedUserId = userId
      return true
    } catch (e: any) {
      error.value = e?.message ?? '加载 AI 工具失败'
      console.error('fetchServices error:', e)
      return false
    } finally {
      loading.value = false
    }
  }

  function fetchServices(force = false): Promise<boolean> {
    return servicesRequest.run(() => loadServices(force), force)
  }

  async function createService(input: AiServiceInput) {
    const auth = useAuthStore()
    if (!auth.user) throw new Error('未登录')
    const { data, error: err } = await supabase
      .from('ai_services')
      .insert({ ...input, user_id: auth.user.id })
      .select()
      .single()
    if (err) throw err
    services.value = sortServices([data, ...services.value])
    return data
  }

  async function updateService(id: string, input: Partial<AiServiceInput>) {
    const { data, error: err } = await supabase
      .from('ai_services')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (err) throw err
    const idx = services.value.findIndex((s) => s.id === id)
    if (idx !== -1) services.value[idx] = data
    return data
  }

  async function deleteService(id: string) {
    // 消费记录随工具级联删除；密钥 set null 保留
    const { error: err } = await supabase.from('ai_services').delete().eq('id', id)
    if (err) throw err
    services.value = services.value.filter((s) => s.id !== id)
    usage.value = usage.value.filter((u) => u.service_id !== id)
  }

  /** 拉取消费记录 */
  async function loadUsage(force = false): Promise<boolean> {
    const auth = useAuthStore()
    if (!auth.user) return false
    if (!force && usageLoadedUserId === auth.user.id) return true
    const userId = auth.user.id
    try {
      const { data, error: err } = await supabase
        .from('ai_usage_records')
        .select('*')
        .eq('user_id', auth.user.id)
        .order('usage_date', { ascending: false })
        .order('created_at', { ascending: false })
      if (err) throw err
      if (auth.user?.id !== userId) return false
      usage.value = (data ?? []) as AiUsageRecord[]
      usageLoadedUserId = userId
      return true
    } catch (e: any) {
      console.error('fetchUsage error:', e)
      return false
    }
  }

  function fetchUsage(force = false): Promise<boolean> {
    return usageRequest.run(() => loadUsage(force), force)
  }

  async function createUsage(input: AiUsageRecordInput) {
    const auth = useAuthStore()
    if (!auth.user) throw new Error('未登录')
    const { data, error: err } = await supabase
      .from('ai_usage_records')
      .insert({ ...input, user_id: auth.user.id })
      .select()
      .single()
    if (err) throw err
    usage.value = sortUsage([data, ...usage.value])
    return data
  }

  async function updateUsage(id: string, input: Partial<AiUsageRecordInput>) {
    const { data, error: err } = await supabase
      .from('ai_usage_records')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (err) throw err
    const idx = usage.value.findIndex((u) => u.id === id)
    if (idx !== -1) {
      usage.value[idx] = data
      usage.value = sortUsage(usage.value)
    }
    return data
  }

  async function deleteUsage(id: string) {
    const { error: err } = await supabase.from('ai_usage_records').delete().eq('id', id)
    if (err) throw err
    usage.value = usage.value.filter((u) => u.id !== id)
  }

  /** 拉取密钥列表 */
  async function loadSecrets(force = false): Promise<boolean> {
    const auth = useAuthStore()
    if (!auth.user) return false
    if (!force && secretsLoadedUserId === auth.user.id) return true
    const userId = auth.user.id
    try {
      const { data, error: err } = await supabase
        .from('ai_secrets')
        .select(secretPublicColumns)
        .eq('user_id', auth.user.id)
        .order('updated_at', { ascending: false })
      if (err) throw err
      if (auth.user?.id !== userId) return false
      secrets.value = (data ?? []).map((secret) => ({ ...secret, key_value: null })) as AiSecret[]
      secretsLoadedUserId = userId
      return true
    } catch (e: any) {
      console.error('fetchSecrets error:', e)
      return false
    }
  }

  function fetchSecrets(force = false): Promise<boolean> {
    return secretsRequest.run(() => loadSecrets(force), force)
  }

  async function createSecret(input: AiSecretInput) {
    const auth = useAuthStore()
    if (!auth.user) throw new Error('未登录')
    const { data, error: err } = await supabase
      .from('ai_secrets')
      .insert({ ...input, user_id: auth.user.id })
      .select(secretPublicColumns)
      .single()
    if (err) throw err
    const secret = { ...data, key_value: null } as AiSecret
    secrets.value.unshift(secret)
    return secret
  }

  async function updateSecret(id: string, input: Partial<AiSecretInput>) {
    const patch = { ...input }
    if (!patch.key_value) delete patch.key_value
    const { data, error: err } = await supabase
      .from('ai_secrets')
      .update(patch)
      .eq('id', id)
      .select(secretPublicColumns)
      .single()
    if (err) throw err
    const secret = { ...data, key_value: null } as AiSecret
    const idx = secrets.value.findIndex((s) => s.id === id)
    if (idx !== -1) secrets.value[idx] = secret
    return secret
  }

  async function deleteSecret(id: string) {
    const { error: err } = await supabase.from('ai_secrets').delete().eq('id', id)
    if (err) throw err
    secrets.value = secrets.value.filter((s) => s.id !== id)
  }

  /** 某工具的密钥（详情弹窗内展示与管理） */
  function secretsOf(serviceId: string): AiSecret[] {
    return secrets.value.filter((s) => s.service_id === serviceId)
  }

  return {
    services,
    usage,
    secrets,
    loading,
    error,
    fetchServices,
    createService,
    updateService,
    deleteService,
    fetchUsage,
    createUsage,
    updateUsage,
    deleteUsage,
    fetchSecrets,
    createSecret,
    updateSecret,
    deleteSecret,
    secretsOf,
    reset,
  }
})

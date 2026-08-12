import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const loading = ref(true)
  const initialized = ref(false)

  const isAuthenticated = computed(() => !!user.value)

  /** 用户名：优先取 user_metadata.username，回退为邮箱前缀 */
  const username = computed(
    () =>
      (user.value?.user_metadata?.username as string | undefined) ||
      user.value?.email?.split('@')[0] ||
      '轩屿',
  )

  /** 头像 URL：来自 user_metadata.avatar_url */
  const avatarUrl = computed(
    () => (user.value?.user_metadata?.avatar_url as string | undefined) || '',
  )

  /** 更新用户资料（用户名 + 头像），写入 user_metadata */
  async function updateProfile(profile: { username: string; avatarUrl?: string | null }) {
    const { data, error } = await supabase.auth.updateUser({
      data: {
        username: profile.username.trim() || username.value,
        avatar_url: profile.avatarUrl ?? null,
      },
    })
    if (error) throw error
    user.value = data.user
    return data
  }

  async function fetchSession() {
    loading.value = true
    try {
      const { data } = await supabase.auth.getSession()
      session.value = data.session
      user.value = data.session?.user ?? null
    } finally {
      loading.value = false
    }
  }

  async function signInWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    session.value = data.session
    user.value = data.user
    return data
  }

  async function signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    user.value = null
    session.value = null
  }

  // 初始化：获取当前会话并订阅 auth 状态变化
  function init() {
    if (initialized.value) return
    initialized.value = true

    fetchSession()

    supabase.auth.onAuthStateChange((_event, newSession) => {
      session.value = newSession
      user.value = newSession?.user ?? null
    })
  }

  return {
    user,
    session,
    loading,
    isAuthenticated,
    initialized,
    username,
    avatarUrl,
    fetchSession,
    signInWithEmail,
    signUp,
    signOut,
    updateProfile,
    init,
  }
})
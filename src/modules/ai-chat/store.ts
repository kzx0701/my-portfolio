import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useAiStore } from '@/modules/ai/store'
import type { AiChatConversation, AiChatMessage } from './types'

export const useAiChatStore = defineStore('ai-chat', () => {
  const conversations = ref<AiChatConversation[]>([])
  const currentConversation = ref<AiChatConversation | null>(null)
  const messages = ref<AiChatMessage[]>([])
  const loading = ref(false)
  const streaming = ref(false)
  const error = ref<string | null>(null)
  const chatOpen = ref(false)

  const sortedConversations = computed(() =>
    [...conversations.value].sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
  )

  async function getApiKey(): Promise<string | null> {
    const aiStore = useAiStore()
    if (aiStore.services.length === 0) await aiStore.fetchServices()
    if (aiStore.secrets.length === 0) await aiStore.fetchSecrets()
    const svc = aiStore.services.find((s) => s.service_type === 'deepseek')
    if (!svc) return null
    return aiStore.secretsOf(svc.id).find((s) => s.key_value)?.key_value ?? null
  }

  async function getApiBaseUrl(): Promise<string> {
    const aiStore = useAiStore()
    if (aiStore.services.length === 0) await aiStore.fetchServices()
    return aiStore.services.find((s) => s.service_type === 'deepseek')?.base_url || 'https://api.deepseek.com'
  }

  async function fetchConversations(): Promise<boolean> {
    const auth = useAuthStore()
    if (!auth.user) return false
    loading.value = true
    try {
      const { data, error: err } = await supabase
        .from('ai_chat_conversations')
        .select('*')
        .eq('user_id', auth.user.id)
        .order('updated_at', { ascending: false })
      if (err) throw err
      conversations.value = (data ?? []) as AiChatConversation[]
      return true
    } catch (e: any) {
      console.error('fetchConversations error:', e)
      return false
    } finally {
      loading.value = false
    }
  }

  async function createConversation(title = '新对话'): Promise<AiChatConversation | null> {
    const auth = useAuthStore()
    if (!auth.user) return null
    const { data, error: err } = await supabase
      .from('ai_chat_conversations')
      .insert({ user_id: auth.user.id, title })
      .select()
      .single()
    if (err) { console.error(err); return null }
    const conv = data as AiChatConversation
    conversations.value.unshift(conv)
    currentConversation.value = conv
    messages.value = []
    return conv
  }

  async function switchConversation(conv: AiChatConversation) {
    currentConversation.value = conv
    await fetchMessages(conv.id)
  }

  async function fetchMessages(conversationId: string): Promise<boolean> {
    const auth = useAuthStore()
    if (!auth.user) return false
    const { data, error: err } = await supabase
      .from('ai_chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: true })
    if (err) { console.error(err); return false }
    messages.value = (data ?? []) as AiChatMessage[]
    return true
  }

  async function saveMessage(conversationId: string, role: AiChatMessage['role'], content: string): Promise<AiChatMessage | null> {
    const auth = useAuthStore()
    if (!auth.user) return null
    const { data, error: err } = await supabase
      .from('ai_chat_messages')
      .insert({ conversation_id: conversationId, user_id: auth.user.id, role, content })
      .select()
      .single()
    if (err) { console.error(err); return null }
    return data as AiChatMessage
  }

  async function updateConversationTitle(conversationId: string, title: string) {
    await supabase.from('ai_chat_conversations').update({ title }).eq('id', conversationId)
    const conv = conversations.value.find((c) => c.id === conversationId)
    if (conv) conv.title = title
  }

  async function deleteConversation(conversationId: string): Promise<boolean> {
    const { error: err } = await supabase.from('ai_chat_conversations').delete().eq('id', conversationId)
    if (err) { console.error(err); return false }
    conversations.value = conversations.value.filter((c) => c.id !== conversationId)
    if (currentConversation.value?.id === conversationId) {
      currentConversation.value = null
      messages.value = []
    }
    return true
  }

  // 核心：同步函数，立即显示气泡，异步操作在后台执行
  function sendMessage(content: string): void {
    if (streaming.value) return

    // 立即设置streaming，防止重复发送
    streaming.value = true
    error.value = null

    // 立即显示用户消息（同步）
    const userId = 'user-' + Date.now()
    messages.value.push({
      id: userId,
      conversation_id: '',
      user_id: '',
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    })

    // 立即显示AI loading气泡（同步）
    const assistantId = 'assistant-' + Date.now()
    messages.value.push({
      id: assistantId,
      conversation_id: '',
      user_id: '',
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    })

    // 异步执行：获取key、创建对话、调用API
    doSendMessage(content, userId, assistantId)
  }

  // 私有异步函数：处理所有异步操作
  async function doSendMessage(content: string, userId: string, assistantId: string): Promise<void> {
    try {
      const apiKey = await getApiKey()
      if (!apiKey) throw new Error('未配置 DeepSeek API Key，请先在 AI 中心添加')

      let conv = currentConversation.value
      if (!conv) {
        conv = await createConversation()
        if (!conv) throw new Error('创建对话失败')
      }

      // 更新消息的conversation_id
      const userIdx = messages.value.findIndex((m) => m.id === userId)
      if (userIdx !== -1) messages.value[userIdx].conversation_id = conv.id
      const assistIdx = messages.value.findIndex((m) => m.id === assistantId)
      if (assistIdx !== -1) messages.value[assistIdx].conversation_id = conv.id

      // 保存用户消息（只更新id，不替换整个对象，避免触发动画）
      saveMessage(conv.id, 'user', content).then((saved) => {
        if (saved) {
          const idx = messages.value.findIndex((m) => m.id === userId)
          if (idx !== -1) messages.value[idx].id = saved.id
        }
      })

      // 更新标题
      if (messages.value.filter((m) => m.role === 'user').length === 1) {
        updateConversationTitle(conv.id, content.slice(0, 30) + (content.length > 30 ? '...' : ''))
      }

      // 调用API
      const baseUrl = await getApiBaseUrl()
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'deepseek-v4-flash',
          messages: messages.value.filter((m) => m.id !== assistantId).map((m) => ({ role: m.role, content: m.content })),
          stream: true,
        }),
      })

      if (!response.ok) throw new Error(`API 请求失败: ${response.status}`)

      const reader = response.body?.getReader()
      if (!reader) throw new Error('无法读取响应流')

      const decoder = new TextDecoder()
      let fullContent = ''
      let lastUpdate = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.trim().startsWith('data: ')) continue
          const data = line.replace('data: ', '').trim()
          if (data === '[DONE]') break
          try {
            const delta = JSON.parse(data).choices?.[0]?.delta?.content
            if (delta) {
              fullContent += delta
              const now = Date.now()
              if (now - lastUpdate > 30) {
                const idx = messages.value.findIndex((m) => m.id === assistantId)
                if (idx !== -1) messages.value[idx].content = fullContent
                lastUpdate = now
              }
            }
          } catch {}
        }
      }

      // 最终更新
      const finalIdx = messages.value.findIndex((m) => m.id === assistantId)
      if (finalIdx !== -1) messages.value[finalIdx].content = fullContent

      // 保存AI回复（只更新id，不替换整个对象）
      const saved = await saveMessage(conv.id, 'assistant', fullContent)
      if (saved) {
        const saveIdx = messages.value.findIndex((m) => m.id === assistantId)
        if (saveIdx !== -1) messages.value[saveIdx].id = saved.id
      }
    } catch (e: any) {
      error.value = e?.message ?? 'AI 回复失败'
      messages.value = messages.value.filter((m) => m.id !== assistantId)
    } finally {
      streaming.value = false
    }
  }

  function clearCurrent() {
    currentConversation.value = null
    messages.value = []
  }

  return {
    conversations, currentConversation, messages, loading, streaming, error, chatOpen,
    sortedConversations, fetchConversations, createConversation, switchConversation,
    fetchMessages, deleteConversation, sendMessage, clearCurrent,
  }
})

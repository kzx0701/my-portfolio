import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type { AiChatConversation, AiChatMessage, AiChatModel, AiChatModelInput } from './types'
import { consumeOpenAiSse } from './sse'

export const useAiChatStore = defineStore('ai-chat', () => {
  const authStore = useAuthStore()
  const models = ref<AiChatModel[]>([])
  const currentModelId = ref<string | null>(null)
  const conversations = ref<AiChatConversation[]>([])
  const currentConversation = ref<AiChatConversation | null>(null)
  const messages = ref<AiChatMessage[]>([])
  const loading = ref(false)
  const streaming = ref(false)
  const error = ref<string | null>(null)
  const chatOpen = ref(false)
  let modelsLoadedUserId: string | undefined
  let activeRequest: AbortController | null = null

  function reset() {
    activeRequest?.abort()
    activeRequest = null
    models.value = []
    currentModelId.value = null
    conversations.value = []
    currentConversation.value = null
    messages.value = []
    loading.value = false
    streaming.value = false
    error.value = null
    chatOpen.value = false
    modelsLoadedUserId = undefined
  }

  watch(
    () => authStore.user?.id,
    (userId, previousUserId) => {
      if (userId !== previousUserId) reset()
    },
  )

  const sortedConversations = computed(() =>
    [...conversations.value].sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
  )

  const enabledModels = computed(() => models.value.filter((model) => model.enabled))
  const defaultModel = computed(() =>
    enabledModels.value.find((model) => model.is_default) ?? enabledModels.value[0] ?? null,
  )
  const currentModel = computed(() =>
    enabledModels.value.find((model) => model.id === currentModelId.value) ?? defaultModel.value,
  )

  async function fetchModels(force = false): Promise<boolean> {
    const auth = useAuthStore()
    if (!auth.user) return false
    if (!force && modelsLoadedUserId === auth.user.id) return true
    const userId = auth.user.id
    try {
      const { data, error: err } = await supabase
        .from('ai_chat_models')
        .select('*')
        .eq('user_id', auth.user.id)
        .order('is_default', { ascending: false })
        .order('updated_at', { ascending: false })
      if (err) throw err
      if (auth.user?.id !== userId) return false
      models.value = (data ?? []) as AiChatModel[]
      modelsLoadedUserId = userId
      if (!currentModelId.value || !enabledModels.value.some((model) => model.id === currentModelId.value)) {
        currentModelId.value = defaultModel.value?.id ?? null
      }
      return true
    } catch (e) {
      console.error('fetchChatModels error:', e)
      return false
    }
  }

  function modelsOf(serviceId: string): AiChatModel[] {
    return models.value.filter((model) => model.service_id === serviceId)
  }

  async function clearDefault(exceptId?: string) {
    const auth = useAuthStore()
    if (!auth.user) return
    let query = supabase
      .from('ai_chat_models')
      .update({ is_default: false })
      .eq('user_id', auth.user.id)
      .eq('is_default', true)
    if (exceptId) query = query.neq('id', exceptId)
    const { error: err } = await query
    if (err) throw err
    models.value = models.value.map((model) =>
      model.id === exceptId ? model : { ...model, is_default: false },
    )
  }

  async function createModel(input: AiChatModelInput) {
    const auth = useAuthStore()
    if (!auth.user) throw new Error('未登录')
    const shouldDefault = input.enabled !== false && (input.is_default || models.value.length === 0)
    if (shouldDefault) await clearDefault()

    const { data, error: err } = await supabase
      .from('ai_chat_models')
      .insert({ ...input, user_id: auth.user.id, is_default: shouldDefault })
      .select()
      .single()
    if (err) throw err
    const model = data as AiChatModel
    models.value.unshift(model)
    if (model.enabled && (model.is_default || !currentModelId.value)) currentModelId.value = model.id
    return model
  }

  async function updateModel(id: string, patch: Partial<AiChatModelInput>) {
    const target = models.value.find((model) => model.id === id)
    if (!target) throw new Error('对话模型不存在')
    if (patch.is_default) await clearDefault(id)

    const update = patch.enabled === false ? { ...patch, is_default: false } : patch
    const { data, error: err } = await supabase
      .from('ai_chat_models')
      .update(update)
      .eq('id', id)
      .select()
      .single()
    if (err) throw err
    const model = data as AiChatModel
    const index = models.value.findIndex((item) => item.id === id)
    if (index !== -1) models.value[index] = model
    if (currentModelId.value === id && !model.enabled) currentModelId.value = defaultModel.value?.id ?? null
    if (model.is_default) currentModelId.value = model.id
    return model
  }

  async function deleteModel(id: string) {
    const target = models.value.find((model) => model.id === id)
    const { error: err } = await supabase.from('ai_chat_models').delete().eq('id', id)
    if (err) throw err
    models.value = models.value.filter((model) => model.id !== id)

    if (currentModelId.value === id || target?.is_default) {
      const next = enabledModels.value[0] ?? null
      currentModelId.value = next?.id ?? null
      if (next && !next.is_default) await updateModel(next.id, { is_default: true })
    }
  }

  async function selectModel(modelId: string): Promise<boolean> {
    const model = enabledModels.value.find((item) => item.id === modelId)
    if (!model) return false
    currentModelId.value = model.id

    if (currentConversation.value && currentConversation.value.chat_model_id !== model.id) {
      const { error: err } = await supabase
        .from('ai_chat_conversations')
        .update({ chat_model_id: model.id })
        .eq('id', currentConversation.value.id)
      if (err) {
        error.value = err.message
        return false
      }
      currentConversation.value.chat_model_id = model.id
    }
    return true
  }

  async function fetchConversations(): Promise<boolean> {
    const auth = useAuthStore()
    if (!auth.user) return false
    const userId = auth.user.id
    loading.value = true
    try {
      const { data, error: err } = await supabase
        .from('ai_chat_conversations')
        .select('*')
        .eq('user_id', auth.user.id)
        .order('updated_at', { ascending: false })
      if (err) throw err
      if (auth.user?.id !== userId) return false
      conversations.value = (data ?? []) as AiChatConversation[]
      return true
    } catch (e) {
      console.error('fetchConversations error:', e)
      return false
    } finally {
      loading.value = false
    }
  }

  async function createConversation(title = '新对话', modelId = currentModel.value?.id ?? null): Promise<AiChatConversation | null> {
    const auth = useAuthStore()
    if (!auth.user) return null
    const { data, error: err } = await supabase
      .from('ai_chat_conversations')
      .insert({ user_id: auth.user.id, chat_model_id: modelId, title })
      .select()
      .single()
    if (err) {
      console.error(err)
      return null
    }
    const conv = data as AiChatConversation
    conversations.value.unshift(conv)
    currentConversation.value = conv
    currentModelId.value = conv.chat_model_id ?? currentModel.value?.id ?? null
    messages.value = []
    return conv
  }

  async function switchConversation(conv: AiChatConversation) {
    cancelStreaming()
    currentConversation.value = conv
    currentModelId.value =
      enabledModels.value.find((model) => model.id === conv.chat_model_id)?.id
      ?? defaultModel.value?.id
      ?? null
    await fetchMessages(conv.id)
  }

  async function fetchMessages(conversationId: string): Promise<boolean> {
    const auth = useAuthStore()
    if (!auth.user) return false
    const userId = auth.user.id
    const { data, error: err } = await supabase
      .from('ai_chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: true })
    if (err) {
      console.error(err)
      return false
    }
    if (auth.user?.id !== userId) return false
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
    if (err) {
      console.error(err)
      return null
    }
    return data as AiChatMessage
  }

  async function updateConversationTitle(conversationId: string, title: string) {
    const { error: err } = await supabase
      .from('ai_chat_conversations')
      .update({ title })
      .eq('id', conversationId)
    if (err) throw err
    const conv = conversations.value.find((item) => item.id === conversationId)
    if (conv) conv.title = title
  }

  async function deleteConversation(conversationId: string): Promise<boolean> {
    const { error: err } = await supabase.from('ai_chat_conversations').delete().eq('id', conversationId)
    if (err) {
      console.error(err)
      return false
    }
    conversations.value = conversations.value.filter((conv) => conv.id !== conversationId)
    if (currentConversation.value?.id === conversationId) clearCurrent()
    return true
  }

  async function requestChatStream(
    modelId: string,
    requestMessages: Array<Pick<AiChatMessage, 'role' | 'content'>>,
    signal: AbortSignal,
  ): Promise<Response> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
    const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined
    const { data } = await supabase.auth.getSession()
    const accessToken = data.session?.access_token
    if (!supabaseUrl || !publishableKey || !accessToken) throw new Error('登录状态或服务配置无效')

    return fetch(`${supabaseUrl.replace(/\/+$/, '')}/functions/v1/ai-chat-proxy`, {
      method: 'POST',
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ modelId, messages: requestMessages }),
      signal,
    })
  }

  // 核心：同步函数，立即显示气泡，异步操作在后台执行
  function sendMessage(content: string): void {
    if (streaming.value || !content.trim()) return
    streaming.value = true
    error.value = null

    const userId = 'user-' + Date.now()
    messages.value.push({
      id: userId,
      conversation_id: currentConversation.value?.id ?? '',
      user_id: '',
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    })

    const assistantId = 'assistant-' + Date.now()
    messages.value.push({
      id: assistantId,
      conversation_id: currentConversation.value?.id ?? '',
      user_id: '',
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    })

    void doSendMessage(content, userId, assistantId)
  }

  async function doSendMessage(content: string, userId: string, assistantId: string): Promise<void> {
    try {
      const model = currentModel.value
      if (!model) throw new Error('请先在 AI 中心配置一个可用的对话模型')

      let conv = currentConversation.value
      if (!conv) {
        conv = await createConversation('新对话', model.id)
        if (!conv) throw new Error('创建对话失败')
      } else if (conv.chat_model_id !== model.id) {
        const { error: err } = await supabase
          .from('ai_chat_conversations')
          .update({ chat_model_id: model.id })
          .eq('id', conv.id)
        if (err) throw err
        conv.chat_model_id = model.id
      }

      const userIdx = messages.value.findIndex((message) => message.id === userId)
      if (userIdx !== -1) {
        messages.value[userIdx].conversation_id = conv.id
      }
      const assistIdx = messages.value.findIndex((message) => message.id === assistantId)
      if (assistIdx !== -1) {
        messages.value[assistIdx].conversation_id = conv.id
      }

      const savedUserMessage = await saveMessage(conv.id, 'user', content)
      if (!savedUserMessage) throw new Error('保存用户消息失败')
      const savedUserIdx = messages.value.findIndex((message) => message.id === userId)
      if (savedUserIdx !== -1) messages.value[savedUserIdx].id = savedUserMessage.id

      if (messages.value.filter((message) => message.role === 'user').length === 1) {
        await updateConversationTitle(conv.id, content.slice(0, 30) + (content.length > 30 ? '...' : ''))
      }

      const requestController = new AbortController()
      activeRequest = requestController
      const response = await requestChatStream(
        model.id,
        messages.value
          .filter((message) => message.id !== assistantId)
          .map((message) => ({ role: message.role, content: message.content })),
        requestController.signal,
      )

      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null
        throw new Error(body?.error ?? `AI 代理请求失败: ${response.status}`)
      }
      const reader = response.body?.getReader()
      if (!reader) throw new Error('无法读取响应流')

      const decoder = new TextDecoder()
      let fullContent = ''
      let lastUpdate = 0
      let buffer = ''
      let streamDone = false

      while (!streamDone) {
        const { done, value } = await reader.read()
        if (done) break
        const parsed = consumeOpenAiSse(buffer, decoder.decode(value, { stream: true }))
        buffer = parsed.buffer
        streamDone = parsed.done
        for (const contentPart of parsed.contents) {
          fullContent += contentPart
          const now = Date.now()
          if (now - lastUpdate > 30) {
            const idx = messages.value.findIndex((message) => message.id === assistantId)
            if (idx !== -1) messages.value[idx].content = fullContent
            lastUpdate = now
          }
        }
      }
      if (streamDone) await reader.cancel().catch(() => {})

      const finalIdx = messages.value.findIndex((message) => message.id === assistantId)
      if (finalIdx !== -1) messages.value[finalIdx].content = fullContent

      const saved = await saveMessage(conv.id, 'assistant', fullContent)
      if (saved) {
        const saveIdx = messages.value.findIndex((message) => message.id === assistantId)
        if (saveIdx !== -1) messages.value[saveIdx].id = saved.id
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') error.value = e?.message ?? 'AI 回复失败'
      messages.value = messages.value.filter((message) => message.id !== assistantId)
    } finally {
      activeRequest = null
      streaming.value = false
    }
  }

  function cancelStreaming() {
    activeRequest?.abort()
    activeRequest = null
    streaming.value = false
  }

  function clearCurrent() {
    cancelStreaming()
    currentConversation.value = null
    messages.value = []
    currentModelId.value = defaultModel.value?.id ?? null
  }

  return {
    models,
    enabledModels,
    defaultModel,
    currentModel,
    currentModelId,
    conversations,
    currentConversation,
    messages,
    loading,
    streaming,
    error,
    chatOpen,
    sortedConversations,
    fetchModels,
    modelsOf,
    createModel,
    updateModel,
    deleteModel,
    selectModel,
    fetchConversations,
    createConversation,
    switchConversation,
    fetchMessages,
    deleteConversation,
    sendMessage,
    cancelStreaming,
    clearCurrent,
    reset,
  }
})

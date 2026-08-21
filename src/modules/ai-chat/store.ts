import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useAiStore } from '@/modules/ai/store'
import type { AiChatConversation, AiChatMessage, AiChatModel, AiChatModelInput } from './types'

export const useAiChatStore = defineStore('ai-chat', () => {
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
    if (!force && models.value.length > 0 && modelsLoadedUserId === auth.user.id) return true

    modelsLoadedUserId = auth.user.id
    try {
      const { data, error: err } = await supabase
        .from('ai_chat_models')
        .select('*')
        .eq('user_id', auth.user.id)
        .order('is_default', { ascending: false })
        .order('updated_at', { ascending: false })
      if (err) throw err
      models.value = (data ?? []) as AiChatModel[]
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
    await supabase.from('ai_chat_conversations').update({ title }).eq('id', conversationId)
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

  async function getApiKey(model: AiChatModel): Promise<string | null> {
    const aiStore = useAiStore()
    if (aiStore.services.length === 0) await aiStore.fetchServices()
    if (aiStore.secrets.length === 0) await aiStore.fetchSecrets()
    return aiStore.secrets.find(
      (secret) => secret.id === model.secret_id && secret.service_id === model.service_id && secret.key_value,
    )?.key_value ?? null
  }

  async function getChatEndpoint(model: AiChatModel): Promise<string> {
    if (model.protocol !== 'openai_compatible') throw new Error('暂不支持该对话协议')
    if (model.endpoint_url?.trim()) return model.endpoint_url.trim().replace(/\/+$/, '')

    const aiStore = useAiStore()
    if (aiStore.services.length === 0) await aiStore.fetchServices()
    const service = aiStore.services.find((item) => item.id === model.service_id)
    const baseUrl = service?.base_url?.trim().replace(/\/+$/, '')
    if (!baseUrl) throw new Error('未配置 Chat API 地址')
    if (/\/chat\/completions$/i.test(baseUrl)) return baseUrl
    if (/\/v\d+$/i.test(baseUrl)) return `${baseUrl}/chat/completions`
    return `${baseUrl}/v1/chat/completions`
  }

  /** 兼容旧模型配置：MiMo 官方推荐使用 api-key 请求头。 */
  async function getAuthType(model: AiChatModel): Promise<AiChatModel['auth_type']> {
    if (model.auth_type) return model.auth_type
    const aiStore = useAiStore()
    if (aiStore.services.length === 0) await aiStore.fetchServices()
    const service = aiStore.services.find((item) => item.id === model.service_id)
    return service?.service_type === 'xiaomi' ? 'api_key' : 'bearer'
  }

  // 核心：同步函数，立即显示气泡，异步操作在后台执行
  function sendMessage(content: string): void {
    if (streaming.value) return
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

    doSendMessage(content, userId, assistantId)
  }

  async function doSendMessage(content: string, userId: string, assistantId: string): Promise<void> {
    try {
      const model = currentModel.value
      if (!model) throw new Error('请先在 AI 中心配置一个可用的对话模型')

      const apiKey = await getApiKey(model)
      if (!apiKey) throw new Error('当前对话模型未绑定有效密钥，请先在 AI 中心检查配置')

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

      saveMessage(conv.id, 'user', content).then((saved) => {
        if (saved) {
          const idx = messages.value.findIndex((message) => message.id === userId)
          if (idx !== -1) messages.value[idx].id = saved.id
        }
      })

      if (messages.value.filter((message) => message.role === 'user').length === 1) {
        updateConversationTitle(conv.id, content.slice(0, 30) + (content.length > 30 ? '...' : ''))
      }

      const endpoint = await getChatEndpoint(model)
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if ((await getAuthType(model)) === 'api_key') {
        headers['api-key'] = apiKey
      } else {
        headers.Authorization = `Bearer ${apiKey}`
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: model.model_id,
          messages: messages.value
            .filter((message) => message.id !== assistantId)
            .map((message) => ({ role: message.role, content: message.content })),
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
                const idx = messages.value.findIndex((message) => message.id === assistantId)
                if (idx !== -1) messages.value[idx].content = fullContent
                lastUpdate = now
              }
            }
          } catch {
            // 忽略单个非 JSON 流片段，继续读取后续内容
          }
        }
      }

      const finalIdx = messages.value.findIndex((message) => message.id === assistantId)
      if (finalIdx !== -1) messages.value[finalIdx].content = fullContent

      const saved = await saveMessage(conv.id, 'assistant', fullContent)
      if (saved) {
        const saveIdx = messages.value.findIndex((message) => message.id === assistantId)
        if (saveIdx !== -1) messages.value[saveIdx].id = saved.id
      }
    } catch (e: any) {
      error.value = e?.message ?? 'AI 回复失败'
      messages.value = messages.value.filter((message) => message.id !== assistantId)
    } finally {
      streaming.value = false
    }
  }

  function clearCurrent() {
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
    clearCurrent,
  }
})

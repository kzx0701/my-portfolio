import type { Database } from '@/lib/database.types'

/** 可用于全局 AI 对话的模型配置 */
export type AiChatModel = Database['public']['Tables']['ai_chat_models']['Row']

/** 新建 / 编辑对话模型的入参 */
export type AiChatModelInput = Omit<AiChatModel, 'id' | 'user_id' | 'created_at' | 'updated_at'>

/** AI 对话会话 */
export type AiChatConversation = Database['public']['Tables']['ai_chat_conversations']['Row']

/** AI 对话消息 */
export type AiChatMessage = Database['public']['Tables']['ai_chat_messages']['Row']

/** 消息角色 */
export type MessageRole = AiChatMessage['role']

import type { Database } from '@/lib/database.types'

/** AI 对话会话 */
export type AiChatConversation = Database['public']['Tables']['ai_chat_conversations']['Row']

/** AI 对话消息 */
export type AiChatMessage = Database['public']['Tables']['ai_chat_messages']['Row']

/** 消息角色 */
export type MessageRole = AiChatMessage['role']

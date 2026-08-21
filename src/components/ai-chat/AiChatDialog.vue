<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Loader2,
  MessageCircle,
  PanelLeft,
  PanelLeftClose,
  Plus,
  Send,
  Sparkles,
  Trash2,
  X,
} from '@lucide/vue'
import { useAiChatStore } from '@/modules/ai-chat/store'
import AiChatMessage from './AiChatMessage.vue'

const store = useAiChatStore()
const inputText = ref('')
const messagesContainer = ref<HTMLDivElement | null>(null)
const inputRef = ref<HTMLTextAreaElement | null>(null)
// 默认把空间留给聊天内容，需要时再打开历史会话
const showSidebar = ref(false)

const conversationCount = computed(() => store.sortedConversations.length)

onMounted(() => {
  store.fetchModels()
  store.fetchConversations()
})

watch(
  () => store.chatOpen,
  (open) => {
    if (open) nextTick(() => {
      inputRef.value?.focus()
      scrollToBottom()
    })
  },
)

watch(() => store.messages.length, () => nextTick(scrollToBottom))

// 流式输出时保持视口跟随最新内容
let scrollTimer: ReturnType<typeof setInterval> | null = null
watch(() => store.streaming, (streaming) => {
  if (streaming) {
    scrollTimer = setInterval(scrollToBottom, 100)
  } else if (scrollTimer) {
    clearInterval(scrollTimer)
    scrollTimer = null
    nextTick(scrollToBottom)
  }
})

onBeforeUnmount(() => {
  if (scrollTimer) clearInterval(scrollTimer)
})

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

function handleSend() {
  const text = inputText.value.trim()
  if (!text || store.streaming || store.enabledModels.length === 0) return
  inputText.value = ''
  resetTextareaHeight()
  store.sendMessage(text)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function handleQuickSend(text: string) {
  if (store.streaming || store.enabledModels.length === 0) return
  inputText.value = text
  nextTick(handleSend)
}

function handleModelChange(e: Event) {
  const modelId = (e.target as HTMLSelectElement).value
  if (modelId) store.selectModel(modelId)
}

function handleNewChat() {
  store.clearCurrent()
  nextTick(() => inputRef.value?.focus())
}

function handleDeleteConv(id: string, e: Event) {
  e.stopPropagation()
  store.deleteConversation(id)
}

function resetTextareaHeight() {
  if (inputRef.value) inputRef.value.style.height = 'auto'
}

function autoResize(e: Event) {
  const textarea = e.target as HTMLTextAreaElement
  textarea.style.height = 'auto'
  textarea.style.height = Math.min(textarea.scrollHeight, 156) + 'px'
}

function conversationTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '刚刚'

  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  if (sameDay) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  const days = Math.floor((now.getTime() - date.getTime()) / 86400000)
  if (days > 0 && days < 7) return `${days} 天前`
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const showLoading = computed(() => {
  if (!store.streaming) return false
  const last = store.messages[store.messages.length - 1]
  return last?.role === 'assistant' && !last.content
})
</script>

<template>
  <Transition name="chat-window">
    <div
      v-if="store.chatOpen"
      class="ai-chat-window"
      role="dialog"
      aria-modal="false"
      aria-label="AI 助手"
    >
      <header class="ai-chat-header">
        <div class="flex min-w-0 items-center gap-3">
          <div class="ai-chat-mark" aria-hidden="true">
            <Sparkles class="h-5 w-5" />
            <span class="ai-chat-mark-dot" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h2 class="truncate text-base font-semibold tracking-tight text-white">AI 助手</h2>
            </div>
            <select
              v-if="store.enabledModels.length > 0"
              class="ai-chat-model-select"
              :value="store.currentModelId ?? store.defaultModel?.id ?? ''"
              :disabled="store.streaming"
              aria-label="选择对话模型"
              @change="handleModelChange"
            >
              <option v-for="model in store.enabledModels" :key="model.id" :value="model.id">
                {{ model.display_name }}
              </option>
            </select>
            <p v-else class="mt-0.5 text-[11px] text-white/65">未配置对话模型</p>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-1.5">
          <button class="ai-chat-icon-button" type="button" title="新对话" aria-label="新对话" @click="handleNewChat">
            <Plus class="h-4 w-4" />
          </button>
          <button
            class="ai-chat-icon-button"
            type="button"
            :title="showSidebar ? '收起会话' : '展开会话'"
            :aria-label="showSidebar ? '收起会话' : '展开会话'"
            @click="showSidebar = !showSidebar"
          >
            <PanelLeftClose v-if="showSidebar" class="h-4 w-4" />
            <PanelLeft v-else class="h-4 w-4" />
          </button>
          <button class="ai-chat-icon-button" type="button" title="关闭" aria-label="关闭 AI 助手" @click="store.chatOpen = false">
            <X class="h-4 w-4" />
          </button>
        </div>
      </header>

      <div class="ai-chat-layout">
        <aside v-if="showSidebar" class="ai-chat-sidebar">
          <div class="flex items-center justify-between px-3 pb-2">
            <div>
              <p class="ai-chat-section-label">历史</p>
            </div>
            <button class="ai-chat-sidebar-plus" type="button" title="新对话" aria-label="新对话" @click="handleNewChat">
              <Plus class="h-4 w-4" />
            </button>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto px-2.5 pb-3 ai-chat-scrollbar">
            <div v-if="conversationCount > 0" class="space-y-1">
              <div v-for="conv in store.sortedConversations" :key="conv.id" class="ai-chat-conversation-row">
                <button
                  type="button"
                  class="ai-chat-conversation"
                  :class="store.currentConversation?.id === conv.id && 'is-active'"
                  @click="store.switchConversation(conv)"
                >
                  <span class="ai-chat-conversation-icon"><MessageCircle class="h-3.5 w-3.5" /></span>
                  <span class="min-w-0 flex-1 text-left">
                    <span class="block truncate text-[13px] font-medium">{{ conv.title }}</span>
                    <span class="mt-0.5 block text-[10px] opacity-60">{{ conversationTime(conv.updated_at) }}</span>
                  </span>
                </button>
                <button
                  type="button"
                  class="ai-chat-conversation-delete"
                  title="删除对话"
                  aria-label="删除对话"
                  @click="handleDeleteConv(conv.id, $event)"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div v-else class="ai-chat-sidebar-empty">
              <span class="ai-chat-empty-compass"><MessageCircle class="h-4 w-4" /></span>
              <p>暂无对话</p>
            </div>
          </div>
        </aside>

        <section class="ai-chat-main">
          <div ref="messagesContainer" class="ai-chat-messages ai-chat-scrollbar">
            <div v-if="store.messages.length === 0" class="ai-chat-empty-state">
              <div class="ai-chat-empty-illustration" aria-hidden="true">
                <div class="ai-chat-empty-sun"><Sparkles class="h-5 w-5" /></div>
              </div>
              <h3>开始对话</h3>
              <p v-if="store.enabledModels.length > 0" class="max-w-[260px] text-center text-sm leading-relaxed text-muted-foreground">输入一个问题，让我帮你理清思路。</p>
              <p v-else class="max-w-[280px] text-center text-sm leading-relaxed text-muted-foreground">请先在 AI 中心配置一个可用的对话模型。</p>
              <div v-if="store.enabledModels.length > 0" class="mt-6 flex flex-wrap justify-center gap-2">
                <button class="ai-chat-prompt-chip" type="button" @click="handleQuickSend('帮我写一段代码')">帮我写代码</button>
                <button class="ai-chat-prompt-chip" type="button" @click="handleQuickSend('解释一下这个概念')">解释一个概念</button>
                <button class="ai-chat-prompt-chip" type="button" @click="handleQuickSend('给我一些建议')">给我一些建议</button>
              </div>
              <RouterLink v-else to="/ai/tools" class="ai-chat-config-link">去 AI 中心配置</RouterLink>
            </div>

            <div v-else class="ai-chat-message-list">
              <div class="ai-chat-day-divider"><span>当前对话</span></div>
              <AiChatMessage v-for="msg in store.messages" :key="msg.id" :message="msg" />

              <div v-if="showLoading" class="ai-chat-thinking">
                <div class="ai-chat-thinking-avatar"><Sparkles class="h-4 w-4" /></div>
                <div class="ai-chat-thinking-bubble">
                  <span /><span /><span />
                </div>
              </div>
            </div>

            <div v-if="store.error" class="ai-chat-error" role="alert">
              <span class="ai-chat-error-mark">!</span>
              <span class="min-w-0 flex-1">{{ store.error }}</span>
              <button type="button" aria-label="关闭错误提示" @click="store.error = null"><X class="h-4 w-4" /></button>
            </div>
          </div>

          <footer class="ai-chat-composer-area">
            <div class="ai-chat-composer-meta">
              <span>Enter 发送 · Shift + Enter 换行</span>
            </div>
            <div class="ai-chat-composer">
              <textarea
                ref="inputRef"
                v-model="inputText"
                rows="1"
                class="ai-chat-textarea"
                :placeholder="store.enabledModels.length > 0 ? '告诉我你在想什么…' : '请先配置对话模型'"
                :disabled="store.enabledModels.length === 0"
                aria-label="输入消息"
                @keydown="handleKeydown"
                @input="autoResize"
              />
              <button
                class="ai-chat-send"
                type="button"
                :disabled="!inputText.trim() || store.streaming || store.enabledModels.length === 0"
                :aria-label="store.streaming ? '发送中' : '发送消息'"
                @click="handleSend"
              >
                <Send v-if="!store.streaming" class="h-4 w-4" />
                <Loader2 v-else class="h-4 w-4 animate-spin" />
              </button>
            </div>
          </footer>
        </section>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.ai-chat-window {
  --chat-ocean: #087f91;
  --chat-ocean-deep: #075968;
  --chat-teal: #34b6a2;
  --chat-sand: #f4c37b;
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 50;
  display: flex;
  width: min(880px, calc(100vw - 24px));
  height: min(820px, calc(100vh - 24px));
  max-height: calc(100vh - 24px);
  flex-direction: column;
  overflow: hidden;
  color: var(--foreground);
  background: color-mix(in srgb, var(--background) 98%, #e8f5f2);
  border: 1px solid color-mix(in srgb, #4a9f9e 18%, var(--border));
  border-radius: 22px;
  box-shadow: 0 24px 64px rgba(7, 72, 84, 0.16), 0 6px 18px rgba(245, 158, 11, 0.05);
  isolation: isolate;
}

.ai-chat-header {
  position: relative;
  display: flex;
  min-height: 68px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 14px 10px 16px;
  overflow: hidden;
  background: linear-gradient(118deg, #2b7e88 0%, #3f9e9f 55%, #63b8a6 100%);
}

.ai-chat-mark {
  position: relative;
  display: flex;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  color: #fff7df;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 10px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16);
}

.ai-chat-mark-dot {
  position: absolute;
  right: -3px;
  bottom: -3px;
  width: 11px;
  height: 11px;
  background: var(--chat-sand);
  border: 2px solid var(--chat-ocean);
  border-radius: 999px;
}

.ai-chat-section-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.ai-chat-section-label { color: #0d7480; }

.ai-chat-model-select {
  max-width: 220px;
  padding: 1px 20px 1px 0;
  color: rgba(255, 255, 255, 0.72);
  background: transparent;
  border: 0;
  outline: 0;
  font-size: 11px;
  cursor: pointer;
}

.ai-chat-model-select:disabled { cursor: default; opacity: 0.7; }
.ai-chat-model-select option { color: #164e63; background: #fff; }

.ai-chat-icon-button,
.ai-chat-sidebar-plus {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: 180ms ease;
}

.ai-chat-icon-button:hover { background: rgba(255, 255, 255, 0.24); }

.ai-chat-icon-button {
  width: 34px;
  height: 34px;
  color: rgba(255, 255, 255, 0.82);
  border-radius: 10px;
}

.ai-chat-layout {
  position: relative;
  display: flex;
  min-height: 0;
  flex: 1;
}

.ai-chat-sidebar {
  display: flex;
  width: 196px;
  flex-shrink: 0;
  flex-direction: column;
  padding: 12px 0 10px;
  background: color-mix(in srgb, #e9f7f4 54%, var(--background));
  border-right: 1px solid color-mix(in srgb, #86cfc4 20%, var(--border));
}

.ai-chat-sidebar-plus {
  width: 30px;
  height: 30px;
  color: #0b7d88;
  background: rgba(255, 255, 255, 0.64);
  border: 1px solid rgba(11, 125, 136, 0.14);
  border-radius: 9px;
}

.ai-chat-sidebar-plus:hover { background: #fff; transform: translateY(-1px); }

.ai-chat-conversation-row { position: relative; display: flex; align-items: stretch; }

.ai-chat-conversation {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 9px;
  padding: 9px 34px 9px 9px;
  color: var(--muted-foreground);
  border-radius: 12px;
  text-align: left;
  transition: 180ms ease;
}

.ai-chat-conversation:hover { color: var(--foreground); background: rgba(255, 255, 255, 0.58); }

.ai-chat-conversation.is-active {
  color: #075e6c;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 5px 14px rgba(12, 109, 116, 0.08);
}

.ai-chat-conversation-icon {
  display: inline-flex;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  color: #15959b;
  background: rgba(45, 181, 166, 0.12);
  border-radius: 9px;
}

.ai-chat-conversation.is-active .ai-chat-conversation-icon {
  color: #fff;
  background: linear-gradient(135deg, #0b8292, #35b69e);
}

.ai-chat-conversation-delete {
  position: absolute;
  top: 50%;
  right: 7px;
  display: inline-flex;
  width: 25px;
  height: 25px;
  align-items: center;
  justify-content: center;
  color: var(--muted-foreground);
  border-radius: 7px;
  opacity: 0;
  transform: translateY(-50%);
  transition: 160ms ease;
}

.ai-chat-conversation-row:hover .ai-chat-conversation-delete,
.ai-chat-conversation-delete:focus-visible { opacity: 1; }
.ai-chat-conversation-delete:hover { color: #b45309; background: rgba(245, 158, 11, 0.13); }

.ai-chat-sidebar-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 38px 12px;
  color: var(--muted-foreground);
  text-align: center;
  font-size: 12px;
}

.ai-chat-empty-compass { display: grid; width: 36px; height: 36px; place-items: center; margin-bottom: 10px; color: #0b8790; background: rgba(48, 180, 165, 0.12); border-radius: 12px; }

.ai-chat-main { display: flex; min-width: 0; min-height: 0; flex: 1; flex-direction: column; }

.ai-chat-messages {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  background-color: color-mix(in srgb, var(--background) 97%, #e6f6f3);
}

.ai-chat-empty-state {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28px 24px 36px;
  text-align: center;
}

.ai-chat-empty-illustration {
  position: relative;
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
  background: rgba(93, 184, 166, 0.12);
  border: 1px solid rgba(14, 148, 136, 0.14);
  border-radius: 15px;
}

.ai-chat-empty-sun { display: grid; width: 100%; height: 100%; place-items: center; color: #a16207; }
.ai-chat-empty-state h3 { margin-top: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.03em; }

.ai-chat-prompt-chip {
  padding: 8px 12px;
  color: #087582;
  background: color-mix(in srgb, var(--background) 80%, #d6f2ed);
  border: 1px solid rgba(18, 143, 141, 0.16);
  border-radius: 999px;
  font-size: 12px;
  transition: 180ms ease;
}

.ai-chat-prompt-chip:hover { color: #075966; background: #fff; border-color: rgba(18, 143, 141, 0.32); box-shadow: 0 5px 12px rgba(17, 124, 125, 0.1); transform: translateY(-1px); }

.ai-chat-config-link {
  margin-top: 20px;
  padding: 8px 12px;
  color: #087582;
  border: 1px solid rgba(18, 143, 141, 0.18);
  border-radius: 999px;
  font-size: 12px;
  transition: 180ms ease;
}

.ai-chat-config-link:hover { color: #075966; background: rgba(214, 242, 237, 0.55); }

.ai-chat-message-list { padding: 16px clamp(16px, 4vw, 36px) 20px; }
.ai-chat-day-divider { display: flex; align-items: center; gap: 12px; margin: 2px 0 16px; color: var(--muted-foreground); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; }
.ai-chat-day-divider::before, .ai-chat-day-divider::after { height: 1px; flex: 1; content: ''; background: color-mix(in srgb, #4aa9a0 18%, var(--border)); }

.ai-chat-thinking { display: flex; align-items: flex-start; gap: 10px; margin-top: 8px; }
.ai-chat-thinking-avatar { display: grid; width: 30px; height: 30px; flex-shrink: 0; place-items: center; color: #b77927; background: #f8d797; border-radius: 10px; }
.ai-chat-thinking-bubble { display: flex; align-items: center; gap: 5px; padding: 11px 13px; color: #7c6b52; background: rgba(255, 251, 235, 0.72); border: 1px solid rgba(245, 158, 11, 0.16); border-radius: 12px 16px 16px 4px; font-size: 11px; }
.ai-chat-thinking-bubble span { width: 5px; height: 5px; background: #e6aa4e; border-radius: 999px; animation: chat-bounce 900ms infinite ease-in-out; }
.ai-chat-thinking-bubble span:nth-child(2) { animation-delay: 120ms; }
.ai-chat-thinking-bubble span:nth-child(3) { animation-delay: 240ms; }
@keyframes chat-bounce { 0%, 60%, 100% { transform: translateY(0); opacity: 0.45; } 30% { transform: translateY(-3px); opacity: 1; } }

.ai-chat-error { display: flex; align-items: center; gap: 8px; margin: 0 clamp(16px, 5vw, 48px) 12px; padding: 9px 11px; color: #9a5b14; background: rgba(255, 247, 224, 0.92); border: 1px solid rgba(217, 140, 43, 0.22); border-radius: 11px; font-size: 12px; }
.ai-chat-error-mark { display: grid; width: 18px; height: 18px; flex-shrink: 0; place-items: center; color: #fff; background: #d9912e; border-radius: 999px; font-size: 11px; font-weight: 700; }
.ai-chat-error button { display: inline-flex; flex-shrink: 0; color: inherit; opacity: 0.65; }

.ai-chat-composer-area { padding: 9px 12px 12px; background: color-mix(in srgb, var(--background) 97%, #e7f6f1); border-top: 1px solid color-mix(in srgb, #75c6b5 16%, var(--border)); }
.ai-chat-composer-meta { display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin: 0 4px 5px; color: var(--muted-foreground); font-size: 10px; }
.ai-chat-composer { display: flex; align-items: flex-end; gap: 10px; padding: 8px 8px 8px 13px; background: var(--background); border: 1px solid color-mix(in srgb, #1a9c98 18%, var(--border)); border-radius: 15px; box-shadow: 0 4px 12px rgba(12, 112, 116, 0.04); transition: 180ms ease; }
.ai-chat-composer:focus-within { border-color: rgba(14, 148, 136, 0.52); box-shadow: 0 0 0 3px rgba(20, 155, 146, 0.1), 0 8px 18px rgba(12, 112, 116, 0.08); }
.ai-chat-textarea { min-height: 24px; max-height: 156px; flex: 1; resize: none; padding: 3px 0; color: var(--foreground); background: transparent; border: 0; outline: 0; font-size: 13px; line-height: 1.55; }
.ai-chat-textarea::placeholder { color: color-mix(in srgb, var(--muted-foreground) 78%, #77b8af); }
.ai-chat-send { display: inline-flex; width: 34px; height: 34px; flex-shrink: 0; align-items: center; justify-content: center; color: #fff; background: #3b9ea0; border-radius: 10px; box-shadow: 0 5px 12px rgba(9, 124, 135, 0.16); transition: 180ms ease; }
.ai-chat-send:hover:not(:disabled) { box-shadow: 0 8px 18px rgba(9, 124, 135, 0.3); transform: translateY(-1px); }
.ai-chat-send:active:not(:disabled) { transform: scale(0.94); }
.ai-chat-send:disabled { cursor: not-allowed; opacity: 0.38; box-shadow: none; }

.ai-chat-scrollbar { scrollbar-color: rgba(24, 142, 143, 0.26) transparent; scrollbar-width: thin; }
.ai-chat-scrollbar::-webkit-scrollbar { width: 6px; }
.ai-chat-scrollbar::-webkit-scrollbar-track { background: transparent; }
.ai-chat-scrollbar::-webkit-scrollbar-thumb { background: rgba(24, 142, 143, 0.24); border-radius: 999px; }
.ai-chat-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(24, 142, 143, 0.42); }

.chat-window-enter-active, .chat-window-leave-active { transition: opacity 220ms ease, transform 280ms cubic-bezier(0.16, 1, 0.3, 1); }
.chat-window-enter-from, .chat-window-leave-to { opacity: 0; transform: translateY(18px) scale(0.975); }

:global(.dark) .ai-chat-window { background: color-mix(in srgb, var(--background) 98%, #0d3f47); border-color: rgba(87, 201, 189, 0.16); box-shadow: 0 24px 64px rgba(0, 0, 0, 0.34), 0 6px 18px rgba(16, 185, 129, 0.04); }
:global(.dark) .ai-chat-sidebar { background: rgba(13, 63, 68, 0.5); border-color: rgba(102, 202, 187, 0.12); }
:global(.dark) .ai-chat-conversation:hover, :global(.dark) .ai-chat-conversation.is-active { background: rgba(255, 255, 255, 0.08); }
:global(.dark) .ai-chat-conversation.is-active { color: #a7f3d0; }
:global(.dark) .ai-chat-messages { background-color: color-mix(in srgb, var(--background) 97%, #0b3941); }
:global(.dark) .ai-chat-composer-area { background: color-mix(in srgb, var(--background) 94%, #0e464a); border-color: rgba(102, 202, 187, 0.12); }
:global(.dark) .ai-chat-composer { background: rgba(7, 35, 40, 0.76); border-color: rgba(87, 201, 189, 0.2); }
:global(.dark) .ai-chat-prompt-chip { background: rgba(71, 190, 176, 0.08); border-color: rgba(87, 201, 189, 0.2); }

@media (max-width: 640px) {
  .ai-chat-window { right: 12px; bottom: 12px; width: calc(100vw - 24px); height: calc(100vh - 24px); max-height: none; border-radius: 20px; }
  .ai-chat-header { min-height: 64px; padding: 9px 11px 9px 13px; }
  .ai-chat-sidebar { position: absolute; inset: 0; z-index: 3; width: 100%; padding-top: 14px; background: color-mix(in srgb, var(--background) 98%, #dff5f2); }
  .ai-chat-message-list { padding-right: 13px; padding-left: 13px; }
  .ai-chat-composer-area { padding-right: 10px; padding-left: 10px; }
  .ai-chat-composer-meta { margin-right: 2px; margin-left: 2px; }
}

@media (prefers-reduced-motion: reduce) {
  .chat-window-enter-active, .chat-window-leave-active, .ai-chat-thinking-bubble span { transition: none; animation: none; }
}
</style>

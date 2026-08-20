<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, Copy, Sparkles, User } from '@lucide/vue'
import MarkdownIt from 'markdown-it'
import type { AiChatMessage } from '@/modules/ai-chat/types'

const props = defineProps<{
  message: AiChatMessage
}>()

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
})

const copied = ref(false)
let lastContent = ''
let cachedHtml = ''

const isUser = computed(() => props.message.role === 'user')
const roleLabel = computed(() => isUser.value ? '你' : 'AI 助手')

const renderedContent = computed(() => {
  if (isUser.value) return ''
  const content = props.message.content
  if (content === lastContent) return cachedHtml
  lastContent = content
  cachedHtml = md.render(content)
  return cachedHtml
})

function messageTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(props.message.content)
    copied.value = true
    window.setTimeout(() => copied.value = false, 2000)
  } catch {
    // 剪贴板权限被拒绝时不打断当前对话
  }
}
</script>

<template>
  <article
    v-if="isUser || message.content"
    class="ai-message-row group"
    :class="{ 'is-user': isUser }"
    :aria-label="`${roleLabel} ${messageTime(message.created_at)}`"
  >
    <div class="ai-message-avatar" :class="isUser ? 'is-user' : 'is-assistant'" aria-hidden="true">
      <User v-if="isUser" class="h-3.5 w-3.5" />
      <Sparkles v-else class="h-3.5 w-3.5" />
    </div>

    <div class="ai-message-column" :class="isUser && 'is-user'">
      <div class="ai-message-meta" :class="isUser && 'justify-end'">
        <span>{{ roleLabel }}</span>
        <span v-if="messageTime(message.created_at)">{{ messageTime(message.created_at) }}</span>
      </div>

      <div class="ai-message-bubble" :class="isUser ? 'is-user' : 'is-assistant'">
        <p v-if="isUser" class="whitespace-pre-wrap">{{ message.content }}</p>
        <div
          v-else
          class="ai-message-markdown prose prose-sm max-w-none
            prose-p:my-1.5 prose-p:leading-relaxed
            prose-headings:my-2 prose-headings:text-foreground
            prose-h1:text-lg prose-h2:text-base prose-h3:text-sm
            prose-pre:my-2 prose-pre:rounded-xl prose-pre:bg-slate-900 prose-pre:p-3
            prose-code:text-teal-700 prose-code:bg-teal-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-xs prose-code:font-medium
            prose-pre:prose-code:text-slate-100 prose-pre:prose-code:bg-transparent prose-pre:prose-code:p-0
            prose-a:text-teal-700 prose-a:no-underline hover:prose-a:underline
            prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5
            prose-blockquote:my-2 prose-blockquote:border-amber-300 prose-blockquote:text-muted-foreground
            prose-strong:text-foreground prose-strong:font-semibold"
          v-html="renderedContent"
        />

        <button
          v-if="!isUser && message.content"
          type="button"
          class="ai-message-copy"
          :aria-label="copied ? '已复制' : '复制回复'"
          :title="copied ? '已复制' : '复制回复'"
          @click="handleCopy"
        >
          <Check v-if="copied" class="h-3.5 w-3.5 text-emerald-600" />
          <Copy v-else class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.ai-message-row { display: flex; align-items: flex-start; gap: 9px; margin: 9px 0; }
.ai-message-row.is-user { flex-direction: row-reverse; }
.ai-message-avatar { display: grid; width: 30px; height: 30px; flex-shrink: 0; place-items: center; border-radius: 10px; }
.ai-message-avatar.is-assistant { color: #9a651f; background: #f7d493; box-shadow: 0 4px 10px rgba(205, 139, 44, 0.14); }
.ai-message-avatar.is-user { color: #fff; background: linear-gradient(135deg, #0b8291, #35b59f); box-shadow: 0 4px 10px rgba(7, 126, 137, 0.16); }
.ai-message-column { display: flex; max-width: min(82%, 610px); flex-direction: column; align-items: flex-start; }
.ai-message-column.is-user { align-items: flex-end; }
.ai-message-meta { display: flex; align-items: center; gap: 7px; margin: 0 4px 5px; color: var(--muted-foreground); font-size: 10px; }
.ai-message-meta span:first-child { color: #0a7881; font-weight: 700; }
.ai-message-bubble { position: relative; padding: 10px 13px; border-radius: 5px 15px 15px 15px; font-size: 13px; line-height: 1.58; }
.ai-message-bubble.is-assistant { color: var(--foreground); background: var(--background); border: 1px solid rgba(21, 148, 142, 0.12); box-shadow: 0 3px 10px rgba(11, 117, 119, 0.035); }
.ai-message-bubble.is-user { color: #fff; background: #3b9ea0; border-radius: 15px 5px 15px 15px; box-shadow: 0 5px 12px rgba(7, 126, 137, 0.12); }
.ai-message-copy { position: absolute; right: 7px; bottom: -13px; display: inline-flex; width: 26px; height: 26px; align-items: center; justify-content: center; color: var(--muted-foreground); background: var(--background); border: 1px solid var(--border); border-radius: 8px; opacity: 0; box-shadow: 0 3px 8px rgba(4, 69, 78, 0.1); transition: 160ms ease; }
.group:hover .ai-message-copy, .ai-message-copy:focus-visible { opacity: 1; }
.ai-message-copy:hover { color: #087a86; border-color: rgba(8, 122, 134, 0.28); transform: translateY(-1px); }
.ai-message-markdown :deep(p:first-child) { margin-top: 0; }
.ai-message-markdown :deep(p:last-child) { margin-bottom: 0; }
.ai-message-markdown :deep(code::before), .ai-message-markdown :deep(code::after) { content: none; }

:global(.dark) .ai-message-bubble.is-assistant { background: rgba(14, 71, 73, 0.32); border-color: rgba(89, 201, 187, 0.14); }
:global(.dark) .ai-message-copy { background: var(--card); }

@media (max-width: 640px) {
  .ai-message-column { max-width: 86%; }
}
</style>

<script setup lang="ts">
import { MessageCircle, Sparkles } from '@lucide/vue'
import { useAiChatStore } from '@/modules/ai-chat/store'

const store = useAiChatStore()

function toggle() {
  store.chatOpen = !store.chatOpen
}
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="translate-y-3 scale-90 opacity-0"
    enter-to-class="translate-y-0 scale-100 opacity-100"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="translate-y-0 scale-100 opacity-100"
    leave-to-class="translate-y-3 scale-90 opacity-0"
  >
    <button
      v-if="!store.chatOpen"
      type="button"
      class="ai-launcher group"
      aria-label="打开 AI 助手"
      title="AI 助手"
      @click="toggle"
    >
      <span class="ai-launcher-halo" aria-hidden="true" />
      <span class="ai-launcher-button">
        <MessageCircle class="h-[22px] w-[22px] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" />
        <span class="ai-launcher-status"><Sparkles class="h-2.5 w-2.5" /></span>
      </span>
    </button>
  </Transition>
</template>

<style scoped>
.ai-launcher {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
}

.ai-launcher-halo {
  position: absolute;
  right: 1px;
  width: 56px;
  height: 56px;
  background: rgba(65, 164, 163, 0.22);
  border-radius: 999px;
  filter: blur(12px);
  transition: 300ms ease;
}

.ai-launcher-button {
  position: relative;
  display: inline-flex;
  width: 58px;
  height: 58px;
  align-items: center;
  justify-content: center;
  color: #fff8e9;
  background: #3b9ea0;
  border: 3px solid rgba(255, 255, 255, 0.84);
  border-radius: 19px;
  box-shadow: 0 10px 24px rgba(6, 107, 119, 0.18), 0 2px 7px rgba(245, 158, 11, 0.07);
  transition: 300ms cubic-bezier(0.16, 1, 0.3, 1);
}

.ai-launcher-button::after {
  position: absolute;
  right: 8px;
  bottom: 7px;
  width: 16px;
  height: 5px;
  content: '';
  border-top: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 50%;
  transform: rotate(-12deg);
}

.ai-launcher-status {
  position: absolute;
  top: -4px;
  right: -4px;
  display: grid;
  width: 19px;
  height: 19px;
  place-items: center;
  color: #8a5a13;
  background: #f6cf87;
  border: 3px solid #f7fcfa;
  border-radius: 999px;
}

.ai-launcher:hover .ai-launcher-halo { opacity: 1.35; transform: scale(1.12); }
.ai-launcher:hover .ai-launcher-button { box-shadow: 0 16px 34px rgba(6, 107, 119, 0.3), 0 3px 10px rgba(245, 158, 11, 0.16); transform: translateY(-3px) rotate(1deg); }
.ai-launcher:active .ai-launcher-button { transform: translateY(0) scale(0.94); }

@media (max-width: 640px) {
  .ai-launcher { right: 14px; bottom: 14px; width: 60px; }
}
</style>

<script setup lang="ts">
import { dismissToast, toasts } from '@/lib/toast'

const typeClass: Record<string, string> = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-destructive text-destructive-foreground',
  info: 'bg-foreground text-background',
}
</script>

<template>
  <Teleport to="body">
    <div class="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2">
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="pointer-events-auto flex items-start justify-between gap-3 rounded-md px-4 py-3 text-sm shadow-lg"
          :class="typeClass[t.type]"
          role="status"
        >
          <span class="min-w-0 break-words">{{ t.message }}</span>
          <button
            class="shrink-0 opacity-70 transition-opacity hover:opacity-100"
            aria-label="关闭"
            @click="dismissToast(t.id)"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>

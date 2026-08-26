<script setup lang="ts">
import { computed } from 'vue'
import { Ban, Check, Edit3, LoaderCircle, Minus, Trash2 } from '@lucide/vue'
import { Button } from '@/components/ui'
import { toDateKey } from '@/modules/worklog/date'
import type { WorkLogItem } from '@/modules/worklog/types'

const props = defineProps<{
  item: WorkLogItem
  busy?: boolean
  celebrating?: boolean
}>()

const emit = defineEmits<{
  toggle: [item: WorkLogItem]
  cancel: [item: WorkLogItem]
  edit: [item: WorkLogItem]
  delete: [item: WorkLogItem]
}>()

const overdue = computed(
  () => props.item.status === 'pending' && props.item.work_date < toDateKey(new Date()),
)

const metaLabel = computed(() => {
  if (props.item.status === 'completed' && props.item.completed_at) {
    const time = new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(props.item.completed_at))
    return `${time} 完成`
  }
  if (props.item.status === 'cancelled') return '已取消'
  return overdue.value ? '已逾期' : '待处理'
})

const toggleLabel = computed(() =>
  props.item.status === 'pending' ? '标记完成' : '恢复为待办',
)
</script>

<template>
  <li
    class="worklog-task group relative flex gap-3.5 py-3.5"
    :class="[
      `worklog-task--${item.status}`,
      busy && 'worklog-task--busy',
      celebrating && 'worklog-task--celebrating',
    ]"
  >
    <div class="relative flex w-7 shrink-0 justify-center">
      <span class="task-rail absolute bottom-[-0.9rem] top-8 w-px bg-border/80" />
      <button
        type="button"
        class="task-toggle relative z-10 flex h-7 w-7 items-center justify-center overflow-hidden rounded-[0.6rem] outline-none"
        :disabled="busy"
        :aria-label="toggleLabel"
        @click="emit('toggle', item)"
      >
        <LoaderCircle v-if="busy" class="h-3.5 w-3.5 animate-spin" />
        <Check v-else-if="item.status === 'completed'" class="task-toggle__icon h-3.5 w-3.5" stroke-width="3" />
        <Minus v-else-if="item.status === 'cancelled'" class="task-toggle__icon h-3.5 w-3.5" stroke-width="3" />
        <span v-else class="task-toggle__dot h-1.5 w-1.5 rounded-full" />
      </button>
    </div>

    <div class="min-w-0 flex-1 border-b border-border/70 pb-3.5">
      <div class="flex items-start gap-2">
        <p class="min-w-0 flex-1 break-words text-[13px] font-semibold leading-5 tracking-[-0.01em]">
          {{ item.title }}
        </p>
        <span v-if="overdue" class="mt-0.5 shrink-0 rounded bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-rose-600 dark:text-rose-400">
          逾期
        </span>
      </div>

      <p v-if="item.description" class="mt-1 line-clamp-2 whitespace-pre-wrap break-words text-[11px] leading-[1.55] text-muted-foreground">
        {{ item.description }}
      </p>

      <div class="mt-2 flex min-h-7 items-center">
        <span class="task-meta text-[10px] font-semibold tracking-wide">{{ metaLabel }}</span>
        <div class="ml-auto flex items-center gap-0.5 opacity-100 transition-all duration-200 sm:translate-x-1 sm:opacity-0 sm:group-hover:translate-x-0 sm:group-hover:opacity-100 sm:group-focus-within:translate-x-0 sm:group-focus-within:opacity-100">
          <Button
            v-if="item.status === 'pending'"
            variant="ghost"
            size="icon"
            class="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
            :disabled="busy"
            title="取消事项"
            @click="emit('cancel', item)"
          >
            <Ban class="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" class="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground" title="编辑事项" @click="emit('edit', item)">
            <Edit3 class="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" class="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive" title="删除事项" @click="emit('delete', item)">
            <Trash2 class="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  </li>
</template>

<style scoped>
.task-toggle {
  border: 1px solid color-mix(in oklch, var(--color-border) 85%, transparent);
  background: var(--color-background);
  color: var(--color-muted-foreground);
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.06);
  transition:
    transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1),
    border-color 200ms ease,
    background-color 250ms ease,
    color 250ms ease,
    box-shadow 250ms ease;
}
.task-toggle::before {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateY(105%);
  transition: transform 260ms cubic-bezier(0.16, 1, 0.3, 1);
}
.worklog-task--pending .task-toggle {
  border-color: rgb(245 158 11 / 0.38);
  color: rgb(217 119 6);
}
.worklog-task--pending .task-toggle::before {
  background: rgb(245 158 11 / 0.11);
}
.worklog-task--pending .task-toggle__dot {
  background: rgb(245 158 11);
  box-shadow: 0 0 0 3px rgb(245 158 11 / 0.12);
}
.worklog-task--completed .task-toggle {
  border-color: rgb(16 185 129 / 0.3);
  background: rgb(16 185 129);
  color: white;
  box-shadow: 0 4px 12px -6px rgb(16 185 129 / 0.9);
}
.worklog-task--cancelled .task-toggle {
  border-color: rgb(148 163 184 / 0.25);
  background: rgb(148 163 184 / 0.12);
  color: rgb(148 163 184);
}
.task-toggle:hover:not(:disabled) {
  transform: scale(1.08) rotate(-2deg);
  box-shadow: 0 6px 16px -9px rgb(14 165 233 / 0.75);
}
.task-toggle:hover:not(:disabled)::before {
  transform: translateY(0);
}
.task-toggle:active:not(:disabled) {
  transform: scale(0.9);
}
.task-toggle:focus-visible {
  box-shadow: 0 0 0 3px rgb(14 165 233 / 0.22);
}
.task-toggle__icon {
  animation: task-icon-in 320ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.worklog-task--pending .task-meta {
  color: rgb(217 119 6 / 0.8);
}
.worklog-task--completed .task-meta {
  color: rgb(5 150 105 / 0.85);
}
.worklog-task--cancelled .task-meta {
  color: var(--color-muted-foreground);
}
.worklog-task--completed p:first-child,
.worklog-task--cancelled p:first-child {
  color: var(--color-muted-foreground);
  text-decoration-line: line-through;
  text-decoration-thickness: 1px;
  text-decoration-color: rgb(16 185 129 / 0.35);
}
.worklog-task--cancelled {
  opacity: 0.58;
  transition: opacity 200ms ease;
}
.worklog-task--cancelled:hover {
  opacity: 0.9;
}
.worklog-task--busy {
  opacity: 0.62;
}
.worklog-task--busy::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  transform: translateX(-110%);
  background: linear-gradient(90deg, transparent, rgb(125 211 252 / 0.11), transparent);
  animation: task-busy 1.1s ease-in-out infinite;
}
.worklog-task--celebrating {
  animation: task-celebrate 800ms cubic-bezier(0.16, 1, 0.3, 1) both;
}
.worklog-task:last-child .task-rail,
.worklog-task:last-child > div:last-child {
  border-bottom-color: transparent;
}
@keyframes task-icon-in {
  from { opacity: 0; transform: scale(0.4) rotate(-20deg); }
}
@keyframes task-busy {
  to { transform: translateX(110%); }
}
@keyframes task-celebrate {
  0% { background: transparent; }
  35% { background: rgb(16 185 129 / 0.08); }
  100% { background: transparent; }
}
@media (prefers-reduced-motion: reduce) {
  .task-toggle,
  .task-toggle::before,
  .task-toggle__icon,
  .worklog-task--busy::after,
  .worklog-task--celebrating {
    animation: none;
    transition: none;
  }
}
</style>

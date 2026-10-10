<script setup lang="ts">
import { computed } from 'vue'
import { Ban, LoaderCircle, Minus, SquarePen, Trash2 } from '@lucide/vue'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
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

const isPending = computed(() => props.item.status === 'pending')
const isCompleted = computed(() => props.item.status === 'completed')
const isCancelled = computed(() => props.item.status === 'cancelled')

const toggleLabel = computed(() => (isPending.value ? '标记完成' : '恢复为待办'))
const isStruck = computed(() => isCompleted.value || isCancelled.value)

/**
 * 勾选框外框，对齐 uiverse「wise-elephant-53」：
 * 悬停翠绿描边 + 外发光，选中翠绿实底 + 双层投影，按下轻微内缩
 */
const boxClass = computed(() =>
  cn(
    'relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center overflow-visible rounded-md border-2 outline-none',
    'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] active:scale-95',
    'focus-visible:ring-2 focus-visible:ring-sky-500/60',
    isCompleted.value
      ? 'border-emerald-500 bg-emerald-500 shadow-[0_4px_12px_rgba(16,185,129,0.3),0_0_0_2px_rgba(16,185,129,0.2)]'
      : isCancelled.value
        ? 'border-slate-300/80 bg-muted dark:border-slate-600'
        : 'border-slate-300 bg-background hover:border-emerald-500 hover:shadow-[0_0_0_2px_rgba(16,185,129,0.1)] dark:border-slate-600',
    props.busy && 'opacity-60',
  ),
)
</script>

<template>
  <li
    class="group relative flex items-start gap-2.5 rounded-xl px-2 py-2 transition-colors duration-300"
    :class="celebrating ? 'bg-emerald-500/10' : 'hover:bg-emerald-500/5'"
  >
    <!-- 勾选框：填充 → 勾号 → 涟漪，三段回弹动效（复刻 uiverse） -->
    <button
      type="button"
      :class="boxClass"
      :disabled="busy"
      :aria-label="toggleLabel"
      :aria-pressed="isCompleted"
      @click="emit('toggle', item)"
    >
      <!-- 填充层：回弹缓动缩放 0 → 1 -->
      <span
        aria-hidden="true"
        class="absolute inset-0 rounded-[4px] bg-gradient-to-br from-emerald-500 to-emerald-600 transition-transform duration-[400ms] ease-[cubic-bezier(0.68,-0.55,0.265,1.55)]"
        :class="isCompleted ? 'scale-100' : 'scale-0'"
      />

      <!-- 勾号：缩放 + 旋转回弹淡入 -->
      <svg
        v-if="!isCancelled"
        viewBox="0 0 24 24"
        aria-hidden="true"
        class="relative z-[2] h-3 w-3 fill-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-all delay-[120ms] duration-500 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)]"
        :class="isCompleted ? 'scale-100 rotate-0 opacity-100' : 'scale-[0.3] rotate-[20deg] opacity-0'"
      >
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
      </svg>
      <Minus v-else class="relative z-[2] h-3 w-3 text-slate-400" stroke-width="3" />

      <LoaderCircle v-if="busy" class="absolute z-[3] h-3 w-3 animate-spin text-muted-foreground" />

      <!-- 涟漪：外层负责居中，内层只跑动画 transform，避免两者互相覆盖 -->
      <span
        v-if="celebrating"
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 grid place-items-center"
      >
        <span
          class="h-5 w-5 animate-ping rounded-full bg-emerald-500/40 [animation-duration:600ms] [animation-iteration-count:1]"
        />
      </span>
    </button>

    <div class="min-w-0 flex-1">
      <p
        class="break-words text-[13px] font-medium leading-5 transition-colors duration-300"
        :class="isStruck ? 'text-muted-foreground' : ''"
      >
        <!-- 划线由左向右生长（背景渐变法，text-decoration 无法表现生长过程） -->
        <span
          class="worklog-strike"
          :data-struck="isStruck ? 'true' : 'false'"
        >{{ item.title }}</span>
      </p>
      <p
        v-if="item.description"
        class="mt-0.5 line-clamp-2 whitespace-pre-wrap break-words text-xs leading-5 text-muted-foreground"
      >
        {{ item.description }}
      </p>
    </div>

    <div
      class="flex shrink-0 items-center gap-0.5 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
    >
      <Button
        v-if="isPending"
        variant="ghost"
        size="icon"
        class="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
        :disabled="busy"
        title="取消事项"
        @click="emit('cancel', item)"
      >
        <Ban class="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
        title="编辑事项"
        @click="emit('edit', item)"
      >
        <SquarePen class="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
        title="删除事项"
        @click="emit('delete', item)"
      >
        <Trash2 class="h-3.5 w-3.5" />
      </Button>
    </div>
  </li>
</template>

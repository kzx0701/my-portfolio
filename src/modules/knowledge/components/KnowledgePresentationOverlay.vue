<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Folder, Moon, Pin, Sun, X } from '@lucide/vue'
import { renderMarkdown } from '@/lib/markdown'
import { categoryMeta, directoryPath, type KnowledgeArticle, type KnowledgeCategory, type KnowledgeDirectory } from '@/modules/knowledge/types'

const props = defineProps<{
  open: boolean
  article?: KnowledgeArticle | null
  categories?: KnowledgeCategory[]
  directories?: KnowledgeDirectory[]
}>()

const emit = defineEmits<{
  exit: []
}>()

type PresentationTheme = 'light' | 'dark'

const presentationTheme = ref<PresentationTheme>('light')
const presentationRoot = ref<HTMLElement | null>(null)
const exitButton = ref<HTMLButtonElement | null>(null)
const category = computed(() => categoryMeta(props.article?.category ?? null, props.categories))
const directory = computed(() => directoryPath(props.article?.directory_id ?? null, props.directories))
let previousBodyOverflow = ''

function exitPresentation() {
  const shouldExitNative = typeof document !== 'undefined' && !!document.fullscreenElement
  emit('exit')
  if (shouldExitNative) document.exitFullscreen().catch(() => {})
}

function toggleTheme() {
  presentationTheme.value = presentationTheme.value === 'light' ? 'dark' : 'light'
}

function handleFullscreenChange() {
  // Esc 或浏览器主动退出原生全屏时，回到原来的预览弹窗。
  if (props.open && typeof document !== 'undefined' && !document.fullscreenElement) emit('exit')
}

function handleKeydown(event: KeyboardEvent) {
  if (!props.open) return

  // 原生全屏时 Esc 由浏览器处理；这是覆盖式降级模式下的退出兜底。
  if (event.key === 'Escape' && typeof document !== 'undefined' && !document.fullscreenElement) {
    exitPresentation()
    return
  }

  // 底层预览弹窗在演示时变为非模态；这里主动约束 Tab，防止焦点跑回工作台。
  if (event.key === 'Tab') {
    const root = presentationRoot.value
    if (!root) return
    const focusable = [...root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )]
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }
}

watch(
  () => props.open,
  (open) => {
    if (typeof document === 'undefined') return
    if (open) {
      // 每次进入演示默认使用浅色纸张阅读，可在顶部即时切换为深色。
      presentationTheme.value = 'light'
      previousBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      nextTick(() => exitButton.value?.focus())
    } else {
      document.body.style.overflow = previousBodyOverflow
    }
  },
)

onMounted(() => {
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  document.removeEventListener('keydown', handleKeydown)
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  document.body.style.overflow = previousBodyOverflow
})
</script>

<template>
  <Teleport to="body">
    <section
      v-if="open && article"
      ref="presentationRoot"
      class="presentation-stage fixed inset-0 z-[100] h-[100dvh] overflow-y-auto overscroll-contain touch-pan-y"
      :class="`presentation-${presentationTheme}`"
      role="dialog"
      aria-modal="true"
      :aria-label="`${article.title} 演示模式`"
    >
      <div class="presentation-backdrop pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div class="presentation-orb presentation-orb-top absolute -right-32 -top-36 h-[34rem] w-[34rem] rounded-full blur-3xl" />
        <div class="presentation-orb presentation-orb-bottom absolute -bottom-48 -left-32 h-[36rem] w-[36rem] rounded-full blur-3xl" />
        <div class="presentation-grid absolute inset-0 bg-[linear-gradient(currentColor_1px,transparent_1px),linear-gradient(90deg,currentColor_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_70%_56%_at_50%_0%,black,transparent)]" />
      </div>

      <header class="presentation-hud sticky top-0 z-10 flex items-center justify-between gap-4 border-b px-5 py-3 backdrop-blur-xl sm:px-8">
        <div class="min-w-0">
          <p class="presentation-kicker text-[10px] font-semibold uppercase tracking-[0.2em]">Knowledge presentation</p>
          <p class="presentation-document-title mt-0.5 truncate text-sm font-medium">{{ article.title }}</p>
        </div>
        <div class="flex shrink-0 items-center gap-2 sm:gap-3">
          <span class="presentation-escape hidden text-xs sm:inline">按 Esc 退出</span>
          <button
            type="button"
            class="presentation-theme-toggle inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2"
            :title="presentationTheme === 'light' ? '切换为深色模式' : '切换为浅色模式'"
            @click="toggleTheme"
          >
            <Moon v-if="presentationTheme === 'light'" class="h-4 w-4" />
            <Sun v-else class="h-4 w-4" />
            <span class="hidden sm:inline">{{ presentationTheme === 'light' ? '深色' : '浅色' }}</span>
          </button>
          <button
            ref="exitButton"
            type="button"
            class="presentation-exit inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2"
            @click="exitPresentation"
          >
            <X class="h-4 w-4" />
            退出演示
          </button>
        </div>
      </header>

      <main class="relative mx-auto w-full max-w-5xl px-6 py-14 sm:px-12 sm:py-20 lg:py-24">
        <div class="presentation-meta mb-9 flex flex-wrap items-center gap-3 text-sm">
          <span class="presentation-chip rounded-full border px-3 py-1.5">{{ category.label }}</span>
          <span class="presentation-directory inline-flex items-center gap-1.5">
            <Folder class="h-4 w-4" />
            {{ directory }}
          </span>
          <span v-if="article.is_pinned" class="presentation-pin inline-flex items-center gap-1.5">
            <Pin class="h-3.5 w-3.5" />
            置顶文件
          </span>
        </div>
        <h1 class="presentation-title max-w-4xl text-4xl font-semibold leading-[1.16] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
          {{ article.title }}
        </h1>
        <div class="presentation-rule mt-8 h-px w-16" />
        <article class="markdown-body presentation-markdown mt-10" v-html="renderMarkdown(article.content)" />
      </main>
    </section>
  </Teleport>
</template>

<style scoped>
.presentation-stage {
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
}

.presentation-light {
  background: #f7f6f1;
  color: #172033;
}

.presentation-light .presentation-hud {
  border-color: rgb(23 32 51 / 0.1);
  background: rgb(247 246 241 / 0.86);
}

.presentation-light .presentation-kicker,
.presentation-light .presentation-escape,
.presentation-light .presentation-directory {
  color: #64748b;
}

.presentation-light .presentation-document-title,
.presentation-light .presentation-title {
  color: #172033;
}

.presentation-light .presentation-theme-toggle,
.presentation-light .presentation-exit {
  border-color: rgb(23 32 51 / 0.14);
  background: rgb(255 255 255 / 0.72);
  color: #26344d;
}

.presentation-light .presentation-theme-toggle:hover,
.presentation-light .presentation-exit:hover {
  background: white;
}

.presentation-light .presentation-theme-toggle:focus-visible,
.presentation-light .presentation-exit:focus-visible {
  --tw-ring-color: #38bdf8;
}

.presentation-light .presentation-chip {
  border-color: rgb(23 32 51 / 0.12);
  background: rgb(255 255 255 / 0.68);
  color: #334155;
}

.presentation-light .presentation-pin {
  color: #b45309;
}

.presentation-light .presentation-pin :deep(svg) {
  fill: currentColor;
}

.presentation-light .presentation-rule {
  background: #0ea5e9;
}

.presentation-light .presentation-orb-top {
  background: rgb(56 189 248 / 0.12);
}

.presentation-light .presentation-orb-bottom {
  background: rgb(45 212 191 / 0.1);
}

.presentation-light .presentation-grid {
  color: rgb(23 32 51 / 0.045);
}

.presentation-dark {
  background: #101114;
  color: rgb(226 232 240);
}

.presentation-dark .presentation-hud {
  border-color: rgb(255 255 255 / 0.1);
  background: rgb(16 17 20 / 0.82);
}

.presentation-dark .presentation-kicker,
.presentation-dark .presentation-escape,
.presentation-dark .presentation-directory {
  color: rgb(148 163 184);
}

.presentation-dark .presentation-document-title,
.presentation-dark .presentation-title {
  color: white;
}

.presentation-dark .presentation-theme-toggle,
.presentation-dark .presentation-exit {
  border-color: rgb(255 255 255 / 0.15);
  background: rgb(255 255 255 / 0.08);
  color: white;
}

.presentation-dark .presentation-theme-toggle:hover,
.presentation-dark .presentation-exit:hover {
  background: rgb(255 255 255 / 0.15);
}

.presentation-dark .presentation-theme-toggle:focus-visible,
.presentation-dark .presentation-exit:focus-visible {
  --tw-ring-color: rgb(125 211 252);
}

.presentation-dark .presentation-chip {
  border-color: rgb(255 255 255 / 0.12);
  background: rgb(255 255 255 / 0.07);
  color: rgb(203 213 225);
}

.presentation-dark .presentation-pin {
  color: rgb(252 211 77);
}

.presentation-dark .presentation-pin :deep(svg) {
  fill: currentColor;
}

.presentation-dark .presentation-rule {
  background: rgb(125 211 252 / 0.7);
}

.presentation-dark .presentation-orb-top {
  background: rgb(56 189 248 / 0.1);
}

.presentation-dark .presentation-orb-bottom {
  background: rgb(45 212 191 / 0.1);
}

.presentation-dark .presentation-grid {
  color: rgb(255 255 255 / 0.028);
}

.presentation-markdown {
  max-width: 62rem;
  font-size: clamp(1.05rem, 1.6vw, 1.25rem);
  line-height: 2;
}

.presentation-light .presentation-markdown {
  color: #334155 !important;
}

.presentation-light .presentation-markdown :deep(h1),
.presentation-light .presentation-markdown :deep(h2),
.presentation-light .presentation-markdown :deep(h3),
.presentation-light .presentation-markdown :deep(h4) {
  color: #172033;
  letter-spacing: -0.025em;
}

.presentation-light .presentation-markdown :deep(p),
.presentation-light .presentation-markdown :deep(li) {
  color: #475569;
}

.presentation-light .presentation-markdown :deep(blockquote) {
  border-left-color: #38bdf8;
  background: rgb(14 165 233 / 0.07);
  color: #475569;
}

.presentation-light .presentation-markdown :deep(code) {
  background: rgb(15 23 42 / 0.07);
  color: #1e293b;
}

.presentation-light .presentation-markdown :deep(pre) {
  border-color: rgb(15 23 42 / 0.12);
  background: #eef1f5;
}

.presentation-light .presentation-markdown :deep(a) {
  color: #0284c7;
}

.presentation-light .presentation-markdown :deep(th),
.presentation-light .presentation-markdown :deep(td) {
  border-color: rgb(15 23 42 / 0.14);
}

.presentation-light .presentation-markdown :deep(th) {
  background: rgb(15 23 42 / 0.055);
  color: #172033;
}

.presentation-dark .presentation-markdown {
  color: rgb(226 232 240) !important;
}

.presentation-dark .presentation-markdown :deep(h1),
.presentation-dark .presentation-markdown :deep(h2),
.presentation-dark .presentation-markdown :deep(h3),
.presentation-dark .presentation-markdown :deep(h4) {
  color: white;
  letter-spacing: -0.025em;
}

.presentation-dark .presentation-markdown :deep(p),
.presentation-dark .presentation-markdown :deep(li) {
  color: rgb(203 213 225);
}

.presentation-dark .presentation-markdown :deep(blockquote) {
  border-left-color: rgb(125 211 252 / 0.8);
  background: rgb(255 255 255 / 0.055);
  color: rgb(203 213 225);
}

.presentation-dark .presentation-markdown :deep(code) {
  background: rgb(255 255 255 / 0.1);
  color: rgb(240 249 255);
}

.presentation-dark .presentation-markdown :deep(pre) {
  border-color: rgb(255 255 255 / 0.12);
  background: rgb(2 6 23 / 0.78);
}

.presentation-dark .presentation-markdown :deep(a) {
  color: rgb(125 211 252);
}

.presentation-dark .presentation-markdown :deep(th),
.presentation-dark .presentation-markdown :deep(td) {
  border-color: rgb(255 255 255 / 0.14);
}

.presentation-dark .presentation-markdown :deep(th) {
  background: rgb(255 255 255 / 0.075);
  color: white;
}

.presentation-markdown :deep(h1) {
  font-size: 2.1em;
  margin-top: 1.8em;
}

.presentation-markdown :deep(h2) {
  font-size: 1.55em;
  margin-top: 2em;
}

.presentation-markdown :deep(h3) {
  font-size: 1.2em;
  margin-top: 1.8em;
}
</style>

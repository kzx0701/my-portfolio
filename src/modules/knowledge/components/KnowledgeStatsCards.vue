<script setup lang="ts">
import { computed } from 'vue'
import { Archive, BookOpen, FolderOpen, Pin } from '@lucide/vue'
import { cn } from '@/lib/utils'
import { useKnowledgeStore } from '@/modules/knowledge/store'

const store = useKnowledgeStore()

/** 统计卡配置（笔记按未归档统计；分类数按去重分类计） */
const stats = computed(() => [
  {
    title: '笔记总数',
    value: store.articles.filter((a) => !a.is_archived).length,
    hint: '未归档笔记',
    icon: BookOpen,
    iconClass: 'bg-gradient-to-br from-sky-400 to-blue-500',
    accentClass: 'bg-linear-to-r from-sky-400 to-blue-500',
  },
  {
    title: '置顶笔记',
    value: store.articles.filter((a) => a.is_pinned && !a.is_archived).length,
    hint: '常驻置顶展示',
    icon: Pin,
    iconClass: 'bg-gradient-to-br from-amber-400 to-orange-500',
    accentClass: 'bg-linear-to-r from-amber-400 to-orange-500',
  },
  {
    title: '笔记分类',
    value: new Set(store.articles.map((a) => a.category).filter(Boolean)).size,
    hint: '分类数（去重）',
    icon: FolderOpen,
    iconClass: 'bg-gradient-to-br from-teal-400 to-emerald-500',
    accentClass: 'bg-linear-to-r from-teal-400 to-emerald-500',
  },
  {
    title: '归档笔记',
    value: store.articles.filter((a) => a.is_archived).length,
    hint: '已归档隐藏',
    icon: Archive,
    iconClass: 'bg-gradient-to-br from-indigo-400 to-indigo-600',
    accentClass: 'bg-linear-to-r from-indigo-400 to-indigo-600',
  },
])
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <div
      v-for="s in stats"
      :key="s.title"
      class="relative overflow-hidden rounded-xl bg-card p-5 shadow-sm"
    >
      <div :class="cn('absolute inset-x-0 top-0 h-1', s.accentClass)" />
      <div class="flex items-center gap-4">
        <div
          :class="
            cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md',
              s.iconClass,
            )
          "
        >
          <component :is="s.icon" class="h-5 w-5" />
        </div>
        <div class="min-w-0">
          <p class="text-sm font-medium text-muted-foreground">{{ s.title }}</p>
          <p class="mt-0.5 text-2xl font-bold tabular-nums tracking-tight">{{ s.value }}</p>
          <p class="mt-0.5 truncate text-xs text-muted-foreground">{{ s.hint }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

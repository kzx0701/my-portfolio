<script setup lang="ts">
import { RouterLink } from 'vue-router'
import KnowledgeSidebarTree from '@/modules/knowledge/components/KnowledgeSidebarTree.vue'
import type { ModuleMeta } from '@/modules/registry'

defineProps<{
  module: ModuleMeta
  currentPath: string
}>()
</script>

<template>
  <nav class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3" :aria-label="`${module.title}菜单`">
    <template v-if="module.children?.length">
      <template v-for="item in module.children" :key="item.key">
        <RouterLink
          v-if="item.key !== 'knowledge-articles'"
          :to="item.path"
          class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
          :class="currentPath === item.path ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'"
        >
          <component :is="item.icon" class="h-4 w-4 shrink-0" />
          {{ item.title }}
        </RouterLink>
      </template>
      <KnowledgeSidebarTree v-if="module.key === 'knowledge'" />
    </template>
  </nav>
</template>

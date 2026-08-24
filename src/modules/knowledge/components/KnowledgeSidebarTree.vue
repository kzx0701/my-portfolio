<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ChevronDown, ChevronRight, FileText, Folder, FolderOpen, Inbox, LoaderCircle } from '@lucide/vue'
import { useKnowledgeStore } from '@/modules/knowledge/store'
import {
  directoryIconClass,
  type KnowledgeArticle,
  type KnowledgeDirectory,
} from '@/modules/knowledge/types'

const route = useRoute()
const store = useKnowledgeStore()

const menuExpanded = ref(true)
const expandedDirectories = ref<Record<string, boolean>>({})

onMounted(() => {
  store.fetchArticles()
})

const visibleArticles = computed(() => store.articles.filter((article) => !article.is_archived))
const rootDirectories = computed(() => store.directories.filter((directory) => !directory.parent_id))
const unfiledArticles = computed(() => visibleArticles.value.filter((article) => !article.directory_id))
const visibleArticleCount = computed(() => visibleArticles.value.length)

function childrenOf(directoryId: string): KnowledgeDirectory[] {
  return store.directories.filter((directory) => directory.parent_id === directoryId)
}

function articlesOf(directoryId: string): KnowledgeArticle[] {
  return visibleArticles.value.filter((article) => article.directory_id === directoryId)
}

function hasChildren(directoryId: string): boolean {
  return childrenOf(directoryId).length > 0 || articlesOf(directoryId).length > 0
}

function isExpanded(directoryId: string): boolean {
  return expandedDirectories.value[directoryId] ?? true
}

function toggleDirectory(directoryId: string) {
  expandedDirectories.value[directoryId] = !isExpanded(directoryId)
}

function isArticlesRoute(): boolean {
  return route.path === '/knowledge/articles'
}

function isAllArticlesActive(): boolean {
  return isArticlesRoute() && !route.query.article && !route.query.directory
}

function isDirectoryActive(directoryId: string): boolean {
  return isArticlesRoute() && route.query.directory === directoryId && !route.query.article
}

function isArticleActive(articleId: string): boolean {
  return isArticlesRoute() && route.query.article === articleId
}
</script>

<template>
  <section class="rounded-lg bg-muted/35 p-1">
    <div class="flex items-center gap-1">
      <RouterLink
        to="/knowledge/articles"
        class="flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors"
        :class="isAllArticlesActive() ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'"
      >
        <FileText class="h-4 w-4 shrink-0" />
        <span class="min-w-0 flex-1 truncate">全部文件</span>
        <span v-if="visibleArticleCount > 0" class="text-[10px] font-normal tabular-nums text-muted-foreground/75">
          {{ visibleArticleCount }}
        </span>
      </RouterLink>
      <button
        type="button"
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
        :aria-expanded="menuExpanded"
        aria-controls="knowledge-file-tree"
        aria-label="展开或收起知识文件"
        @click="menuExpanded = !menuExpanded"
      >
        <ChevronDown v-if="menuExpanded" class="h-3.5 w-3.5" />
        <ChevronRight v-else class="h-3.5 w-3.5" />
      </button>
    </div>

    <div v-show="menuExpanded" id="knowledge-file-tree" class="mt-1 space-y-0.5 border-t border-border/60 pt-1">
      <div v-if="store.loading && store.articles.length === 0" class="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
        <LoaderCircle class="h-3.5 w-3.5 animate-spin" />
        正在加载文件…
      </div>

      <div v-for="root in rootDirectories" :key="root.id" class="space-y-0.5">
        <div class="flex items-center gap-0.5">
          <button
            type="button"
            class="flex h-7 w-6 shrink-0 items-center justify-center rounded text-muted-foreground/70 transition-colors hover:bg-background hover:text-foreground disabled:opacity-40"
            :disabled="!hasChildren(root.id)"
            :aria-expanded="isExpanded(root.id)"
            :aria-label="`${isExpanded(root.id) ? '收起' : '展开'} ${root.name}`"
            @click="toggleDirectory(root.id)"
          >
            <template v-if="hasChildren(root.id)">
              <ChevronDown v-if="isExpanded(root.id)" class="h-3 w-3" />
              <ChevronRight v-else class="h-3 w-3" />
            </template>
          </button>
          <RouterLink
            :to="{ path: '/knowledge/articles', query: { directory: root.id } }"
            class="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1.5 text-xs transition-colors"
            :class="isDirectoryActive(root.id) ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'"
          >
            <FolderOpen v-if="isExpanded(root.id)" class="h-3.5 w-3.5 shrink-0" :class="directoryIconClass(root.color)" />
            <Folder v-else class="h-3.5 w-3.5 shrink-0" :class="directoryIconClass(root.color)" />
            <span class="min-w-0 flex-1 truncate font-medium">{{ root.name }}</span>
            <span class="text-[10px] tabular-nums text-muted-foreground/70">{{ articlesOf(root.id).length + childrenOf(root.id).reduce((count, child) => count + articlesOf(child.id).length, 0) }}</span>
          </RouterLink>
        </div>

        <div v-if="isExpanded(root.id)" class="ml-3 space-y-0.5 border-l border-border/70 pl-2">
          <RouterLink
            v-for="article in articlesOf(root.id)"
            :key="article.id"
            :to="{ path: '/knowledge/articles', query: { article: article.id } }"
            class="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors"
            :class="isArticleActive(article.id) ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'"
            :title="article.title"
          >
            <FileText class="h-3.5 w-3.5 shrink-0" />
            <span class="min-w-0 truncate">{{ article.title }}</span>
          </RouterLink>

          <div v-for="child in childrenOf(root.id)" :key="child.id" class="space-y-0.5">
            <div class="flex items-center gap-0.5">
              <button
                type="button"
                class="flex h-7 w-6 shrink-0 items-center justify-center rounded text-muted-foreground/70 transition-colors hover:bg-background hover:text-foreground disabled:opacity-40"
                :disabled="!hasChildren(child.id)"
                :aria-expanded="isExpanded(child.id)"
                :aria-label="`${isExpanded(child.id) ? '收起' : '展开'} ${child.name}`"
                @click="toggleDirectory(child.id)"
              >
                <template v-if="hasChildren(child.id)">
                  <ChevronDown v-if="isExpanded(child.id)" class="h-3 w-3" />
                  <ChevronRight v-else class="h-3 w-3" />
                </template>
              </button>
              <RouterLink
                :to="{ path: '/knowledge/articles', query: { directory: child.id } }"
                class="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1.5 text-xs transition-colors"
                :class="isDirectoryActive(child.id) ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'"
              >
                <FolderOpen v-if="isExpanded(child.id)" class="h-3.5 w-3.5 shrink-0" :class="directoryIconClass(child.color)" />
                <Folder v-else class="h-3.5 w-3.5 shrink-0" :class="directoryIconClass(child.color)" />
                <span class="min-w-0 flex-1 truncate">{{ child.name }}</span>
                <span class="text-[10px] tabular-nums text-muted-foreground/70">{{ articlesOf(child.id).length }}</span>
              </RouterLink>
            </div>

            <div v-if="isExpanded(child.id)" class="ml-3 space-y-0.5 border-l border-border/60 pl-2">
              <RouterLink
                v-for="article in articlesOf(child.id)"
                :key="article.id"
                :to="{ path: '/knowledge/articles', query: { article: article.id } }"
                class="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors"
                :class="isArticleActive(article.id) ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'"
                :title="article.title"
              >
                <FileText class="h-3.5 w-3.5 shrink-0" />
                <span class="min-w-0 truncate">{{ article.title }}</span>
              </RouterLink>
            </div>
          </div>
        </div>
      </div>

      <div v-if="unfiledArticles.length > 0" class="space-y-0.5 pt-1">
        <div class="flex items-center gap-2 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
          <Inbox class="ml-5 h-3.5 w-3.5" />
          未归档
        </div>
        <RouterLink
          v-for="article in unfiledArticles"
          :key="article.id"
          :to="{ path: '/knowledge/articles', query: { article: article.id } }"
          class="flex items-center gap-2 rounded-md px-2 py-1.5 pl-10 text-xs transition-colors"
          :class="isArticleActive(article.id) ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'"
          :title="article.title"
        >
          <FileText class="h-3.5 w-3.5 shrink-0" />
          <span class="min-w-0 truncate">{{ article.title }}</span>
        </RouterLink>
      </div>

      <p v-if="!store.loading && visibleArticleCount === 0 && rootDirectories.length === 0" class="px-7 py-2 text-xs leading-relaxed text-muted-foreground">
        还没有知识文件
      </p>
    </div>
  </section>
</template>

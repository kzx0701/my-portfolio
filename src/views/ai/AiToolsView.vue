<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Plus, RotateCw, Sparkles, Wrench } from '@lucide/vue'
import { Button, Skeleton } from '@/components/ui'
import { useAiStore } from '@/modules/ai/store'
import { useAiChatStore } from '@/modules/ai-chat/store'
import {
  ChatModelDialog,
  ToolDeleteDialog,
  ToolDetailDialog,
  ToolFormDialog,
  ToolTable,
} from '@/modules/ai/components'
import { type AiService, type AiServiceInput } from '@/modules/ai/types'
import { toast } from '@/lib/toast'

const store = useAiStore()

const formOpen = ref(false)
const editingService = ref<AiService | null>(null)
const viewingService = ref<AiService | null>(null)
const chatModelService = ref<AiService | null>(null)
const deleteTarget = ref<AiService | null>(null)
const submitting = ref(false)
const deleting = ref(false)
const refreshing = ref(false)
const chatStore = useAiChatStore()

onMounted(() => {
  store.fetchServices()
  store.fetchSecrets()
  chatStore.fetchModels()
})

function openConsole(url: string) {
  window.open(url, '_blank')
}

async function handleRefresh() {
  refreshing.value = true
  try {
    const ok = await store.fetchServices(true)
    if (ok) toast('数据已刷新', 'success')
    else toast('刷新失败，请重试', 'error')
  } finally {
    refreshing.value = false
  }
}

function openCreate() {
  editingService.value = null
  formOpen.value = true
}

function openEdit(service: AiService) {
  viewingService.value = null
  editingService.value = service
  formOpen.value = true
}

async function handleSubmit(input: AiServiceInput) {
  submitting.value = true
  try {
    if (editingService.value) {
      await store.updateService(editingService.value.id, input)
      toast('工具已更新', 'success')
    } else {
      await store.createService(input)
      toast('工具已添加', 'success')
    }
    formOpen.value = false
  } catch (e: any) {
    console.error('保存工具失败', e)
    toast(e?.message ?? '保存失败', 'error')
  } finally {
    submitting.value = false
  }
}

async function handleDeleteConfirm() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await store.deleteService(deleteTarget.value.id)
    deleteTarget.value = null
    viewingService.value = null
    toast('工具已删除', 'success')
  } catch (e: any) {
    console.error('删除工具失败', e)
    toast(e?.message ?? '删除失败', 'error')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-6">
    <!-- 标题区（logo 与首页卡片同 viewTransitionName，实现 VT 共享元素 morphing） -->
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-teal-500 text-white shadow-md shadow-sky-500/25"
          :style="{ viewTransitionName: 'vt-ai' }"
        >
          <Sparkles class="h-5 w-5" />
        </div>
        <div>
          <h2 class="text-lg font-semibold">工具管理</h2>
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <Button variant="outline" :disabled="refreshing" @click="handleRefresh">
          <RotateCw class="h-4 w-4" :class="refreshing && 'animate-spin'" />
          刷新
        </Button>
        <Button @click="openCreate">
          <Plus class="h-4 w-4" />
          添加工具
        </Button>
      </div>
    </div>

    <!-- 工具管理 -->
    <div v-if="store.loading && store.services.length === 0" class="overflow-hidden rounded-lg border bg-card">
      <div class="flex h-12 items-center border-b bg-muted/30 px-2">
        <div v-for="i in 4" :key="`h-${i}`" class="w-1/4 px-2">
          <Skeleton class="h-4 w-16" />
        </div>
      </div>
      <div v-for="r in 5" :key="`r-${r}`" class="flex h-12 items-center border-b px-2 last:border-0">
        <div v-for="c in 4" :key="`c-${c}`" class="w-1/4 px-2">
          <Skeleton class="h-4 w-3/4" />
        </div>
      </div>
    </div>
    <div v-else-if="store.services.length === 0" class="rounded-lg border border-dashed py-16 text-center">
      <Wrench class="mx-auto h-10 w-10 text-muted-foreground/60" />
      <p class="mt-3 font-medium">还没有 AI 工具</p>
      <p class="mt-1 text-sm text-muted-foreground">添加你使用的 AI 工具，统一管理控制台与密钥</p>
      <Button class="mt-4" @click="openCreate">
        <Plus class="h-4 w-4" />
        添加第一个工具
      </Button>
    </div>
    <div v-else class="animate-in fade-in slide-in-from-bottom-2 [animation-duration:400ms]">
      <ToolTable
        :services="store.services"
        @view="(s) => viewingService = s"
        @edit="openEdit"
        @remove="(s) => deleteTarget = s"
        @open-console="openConsole"
        @view-secrets="(s) => viewingService = s"
        @manage-chat-models="(s) => chatModelService = s"
      />
    </div>

    <!-- 密钥管理 -->
    <ToolDetailDialog
      :open="viewingService !== null"
      :service="viewingService"
      @update:open="(v) => !v && (viewingService = null)"
    />

    <!-- 对话模型配置 -->
    <ChatModelDialog
      :open="chatModelService !== null"
      :service="chatModelService"
      @update:open="(v) => !v && (chatModelService = null)"
    />

    <!-- 新建/编辑 -->
    <ToolFormDialog
      v-model:open="formOpen"
      :service="editingService"
      :submitting="submitting"
      @submit="handleSubmit"
    />

    <!-- 删除确认 -->
    <ToolDeleteDialog
      :open="deleteTarget !== null"
      :service-name="deleteTarget?.name"
      :deleting="deleting"
      @update:open="(v) => !v && (deleteTarget = null)"
      @confirm="handleDeleteConfirm"
    />
  </div>
</template>

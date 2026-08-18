<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { KeyRound, Plus, RefreshCw, RotateCw, Sparkles, Wrench } from '@lucide/vue'
import { Badge, Button, Skeleton } from '@/components/ui'
import { useAiStore } from '@/modules/ai/store'
import {
  ToolDeleteDialog,
  ToolDetailDialog,
  ToolFormDialog,
} from '@/modules/ai/components'
import {
  balanceFresh,
  serviceTypeMeta,
  type AiService,
  type AiServiceInput,
} from '@/modules/ai/types'
import { toast } from '@/lib/toast'

const store = useAiStore()

const formOpen = ref(false)
const editingService = ref<AiService | null>(null)
const viewingService = ref<AiService | null>(null)
const deleteTarget = ref<AiService | null>(null)
const submitting = ref(false)
const deleting = ref(false)
const refreshing = ref(false)

onMounted(() => {
  store.fetchServices()
  store.fetchSecrets()
})

/** 余额展示：有周期额度显示 剩余/总额；否则单值 */
function balanceLabel(s: AiService): string {
  if (s.balance === null) return '未维护'
  return s.quota_limit !== null ? `${s.balance} / ${s.quota_limit}` : `${s.balance}`
}

/** 余额更新时间短展示 */
function updatedLabel(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const sameYear = d.getFullYear() === now.getFullYear()
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  if (sameDay) return `今天 ${time}`
  if (sameYear) return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${time}`
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${time}`
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

async function handleSubmit(payload: { input: AiServiceInput; apiKey: string | null }) {
  const { input, apiKey } = payload
  submitting.value = true
  try {
    if (editingService.value) {
      await store.updateService(editingService.value.id, input)
      // 编辑时若重新填了 Key，更新为工具的新 Key
      if (apiKey) {
        await store.createSecret({
          service_id: editingService.value.id,
          name: `${input.name} API Key`,
          service: input.service_type,
          key_value: apiKey,
          note: null,
        })
      }
      toast('工具已更新', 'success')
    } else {
      const created = await store.createService(input)
      // 模型 API：把 Key 存到该工具名下
      if (apiKey) {
        await store.createSecret({
          service_id: created.id,
          name: `${input.name} API Key`,
          service: input.service_type,
          key_value: apiKey,
          note: null,
        })
      }
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

/** 刷新指定工具余量（模型 API 类：用关联 Key 调余额接口） */
async function handleRefreshBalance(service: AiService) {
  const result = await store.refreshBalance(service)
  if (result.ok) {
    toast(`余量已刷新：${result.balance !== null ? new Intl.NumberFormat('zh-CN').format(result.balance) : '—'}`, 'success')
  } else {
    toast(result.error ?? '刷新失败', 'error')
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
          <h2 class="text-lg font-semibold">工具列表</h2>
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

    <!-- 工具卡片 -->
    <div v-if="store.loading && store.services.length === 0" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Skeleton v-for="i in 6" :key="i" class="h-44 rounded-xl" />
    </div>
    <div v-else-if="store.services.length === 0" class="rounded-lg border border-dashed py-16 text-center">
      <Wrench class="mx-auto h-10 w-10 text-muted-foreground/60" />
      <p class="mt-3 font-medium">还没有 AI 工具</p>
      <p class="mt-1 text-sm text-muted-foreground">登记 WorkBuddy、Trae、中转站等工具，维护剩余额度与密钥</p>
      <Button class="mt-4" @click="openCreate">
        <Plus class="h-4 w-4" />
        添加第一个工具
      </Button>
    </div>
    <div v-else class="animate-in grid gap-4 fade-in slide-in-from-bottom-2 [animation-duration:400ms] sm:grid-cols-2 lg:grid-cols-3">
      <button
        v-for="s in store.services"
        :key="s.id"
        class="group relative flex flex-col overflow-hidden rounded-xl border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        @click="viewingService = s"
      >
        <div class="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-sky-400 to-teal-500 opacity-0 transition-opacity group-hover:opacity-100" />
        <div class="flex items-start justify-between gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <Badge variant="outline" :class="serviceTypeMeta(s.service_type).badgeClass">
              {{ serviceTypeMeta(s.service_type).label }}
            </Badge>
            <Badge variant="secondary" class="font-normal">
              {{ s.kind === 'model_api' ? '模型 API' : 'Agent' }}
            </Badge>
          </div>
          <span class="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <KeyRound class="h-3.5 w-3.5" />
            {{ store.secretsOf(s.id).length }}
          </span>
        </div>
        <h3 class="mt-3 font-semibold leading-snug group-hover:text-primary">{{ s.name }}</h3>
        <p class="mt-2 text-2xl font-bold tabular-nums tracking-tight">{{ balanceLabel(s) }}</p>
        <div class="mt-2 flex flex-wrap items-center gap-2">
          <Badge
            v-if="balanceFresh(s)"
            variant="outline"
            :class="balanceFresh(s)!.badgeClass"
          >
            {{ balanceFresh(s)!.label }}
          </Badge>
        </div>
        <div class="mt-3 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
          <span>余额更新 {{ updatedLabel(s.balance_updated_at) }}</span>
          <span class="flex items-center gap-2">
            <button
              v-if="s.kind === 'model_api' && s.balance_query_url"
              type="button"
              class="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-primary"
              title="用 API Key 刷新余量"
              @click.stop="handleRefreshBalance(s)"
            >
              <RefreshCw class="h-3.5 w-3.5" />
              刷新余量
            </button>
            <span class="text-muted-foreground/70">查看密钥</span>
          </span>
        </div>
      </button>
    </div>

    <!-- 工具详情（含密钥管理） -->
    <ToolDetailDialog
      :open="viewingService !== null"
      :service="viewingService"
      @update:open="(v) => !v && (viewingService = null)"
      @edit="viewingService && openEdit(viewingService)"
      @remove="viewingService && (deleteTarget = viewingService)"
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

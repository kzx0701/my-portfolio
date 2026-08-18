<script setup lang="ts">
import { computed, ref } from 'vue'
import { CalendarDays, Copy, Eye, EyeOff, KeyRound, Link2, Pencil, Plus, RefreshCw, Trash2 } from '@lucide/vue'
import { Badge, Button, Dialog, Skeleton } from '@/components/ui'
import { useAiStore } from '@/modules/ai/store'
import {
  balanceFresh,
  maskKey,
  serviceTypeMeta,
  type AiSecret,
  type AiSecretInput,
  type AiService,
} from '@/modules/ai/types'
import SecretDeleteDialog from './SecretDeleteDialog.vue'
import SecretFormDialog from './SecretFormDialog.vue'
import { toast } from '@/lib/toast'

const props = defineProps<{
  open: boolean
  service?: AiService | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  edit: []
  remove: []
}>()

const store = useAiStore()

/** 刷新余量中 */
const refreshing = ref(false)

/** 该工具的密钥 */
const serviceSecrets = computed(() => (props.service ? store.secretsOf(props.service.id) : []))
/** 余额新鲜度 */
const fresh = computed(() => (props.service ? balanceFresh(props.service) : null))

/** 余额展示：有周期额度显示 剩余/总额；否则单值 */
const balanceLabel = computed(() => {
  const s = props.service
  if (!s) return '—'
  if (s.balance === null) return '未维护'
  return s.quota_limit !== null ? `${s.balance} / ${s.quota_limit}` : `${s.balance}`
})

/** 刷新余量（模型 API 类：用关联 Key 调余额接口） */
async function handleRefreshBalance() {
  if (!props.service) return
  refreshing.value = true
  try {
    const result = await store.refreshBalance(props.service)
    if (result.ok) {
      toast(
        `余量已刷新：${result.balance !== null ? new Intl.NumberFormat('zh-CN').format(result.balance) : '—'}`,
        'success',
      )
    } else {
      toast(result.error ?? '刷新失败', 'error')
    }
  } finally {
    refreshing.value = false
  }
}

/** 重置时间展示 MM-DD */
const resetLabel = computed(() => {
  const t = props.service?.quota_reset_time
  if (!t) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t)
  if (!m) return t
  return `${Number(m[2])}-${m[3]} 重置`
})

/** 余额更新时间展示 */
const updatedLabel = computed(() => {
  const t = props.service?.balance_updated_at
  if (!t) return '—'
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return t
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
})

const secretFormOpen = ref(false)
const editingSecret = ref<AiSecret | null>(null)
const deleteSecretTarget = ref<AiSecret | null>(null)
const submitting = ref(false)
const deleting = ref(false)
/** 明文可见的密钥 id（点击眼睛临时展开明文；默认打码） */
const revealedId = ref<string | null>(null)

function openCreateSecret() {
  editingSecret.value = null
  secretFormOpen.value = true
}

function openEditSecret(secret: AiSecret) {
  editingSecret.value = secret
  secretFormOpen.value = true
}

async function handleCopy(secret: AiSecret) {
  if (!secret.key_value) {
    toast('该密钥无内容', 'info')
    return
  }
  try {
    await navigator.clipboard.writeText(secret.key_value)
    revealedId.value = null
    toast('已复制到剪贴板', 'success')
  } catch {
    toast('复制失败，请手动选择', 'error')
  }
}

async function handleSecretSubmit(input: AiSecretInput) {
  if (!props.service) return
  submitting.value = true
  try {
    if (editingSecret.value) {
      await store.updateSecret(editingSecret.value.id, input)
      toast('密钥已更新', 'success')
    } else {
      await store.createSecret({ ...input, service_id: props.service.id })
      toast('密钥已创建', 'success')
    }
    secretFormOpen.value = false
  } catch (e: any) {
    console.error('保存密钥失败', e)
    toast(e?.message ?? '保存失败', 'error')
  } finally {
    submitting.value = false
  }
}

async function handleSecretDeleteConfirm() {
  if (!deleteSecretTarget.value) return
  deleting.value = true
  try {
    await store.deleteSecret(deleteSecretTarget.value.id)
    deleteSecretTarget.value = null
    toast('密钥已删除', 'success')
  } catch (e: any) {
    console.error('删除密钥失败', e)
    toast(e?.message ?? '删除失败', 'error')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <Dialog
    :open="open"
    class="max-w-2xl"
    @update:open="emit('update:open', $event)"
  >
    <div v-if="service">
      <!-- 工具信息 -->
      <div class="mb-4">
        <div class="flex flex-wrap items-center gap-2">
          <Badge variant="outline" :class="serviceTypeMeta(service.service_type).badgeClass">
            {{ serviceTypeMeta(service.service_type).label }}
          </Badge>
          <Badge v-if="service.plan" variant="secondary" class="font-normal">{{ service.plan }}</Badge>
        </div>
        <h2 class="mt-2 text-xl font-semibold">{{ service.name }}</h2>
      </div>

      <!-- 余额概览 -->
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="rounded-lg border p-4">
          <div class="flex items-center justify-between">
            <p class="text-xs text-muted-foreground">当前剩余额度</p>
            <button
              v-if="service.kind === 'model_api' && service.balance_query_url"
              type="button"
              class="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
              :disabled="refreshing"
              title="用 API Key 刷新余量"
              @click="handleRefreshBalance"
            >
              <RefreshCw class="h-3.5 w-3.5" :class="refreshing && 'animate-spin'" />
              刷新余量
            </button>
          </div>
          <p class="mt-1 text-2xl font-bold tabular-nums tracking-tight">{{ balanceLabel }}</p>
          <div class="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <Badge v-if="fresh" variant="outline" :class="fresh.badgeClass">{{ fresh.label }}</Badge>
            <span v-if="resetLabel" class="text-muted-foreground tabular-nums">{{ resetLabel }}</span>
          </div>
        </div>
        <div class="space-y-1.5 rounded-lg border p-4 text-sm">
          <div class="flex items-center gap-1.5 text-muted-foreground">
            <CalendarDays class="h-3.5 w-3.5" />
            余额更新：{{ updatedLabel }}
          </div>
          <div v-if="service.base_url" class="flex items-center gap-1.5 text-muted-foreground">
            <Link2 class="h-3.5 w-3.5" />
            <span class="truncate">{{ service.base_url }}</span>
          </div>
          <p v-if="service.note" class="text-muted-foreground">{{ service.note }}</p>
        </div>
      </div>

      <!-- 密钥区 -->
      <div class="mt-5">
        <div class="mb-2 flex items-center justify-between">
          <h3 class="flex items-center gap-1.5 text-sm font-semibold">
            <KeyRound class="h-4 w-4 text-muted-foreground" />
            密钥配置（{{ serviceSecrets.length }}）
          </h3>
          <Button variant="outline" size="sm" @click="openCreateSecret">
            <Plus class="h-4 w-4" />
            添加密钥
          </Button>
        </div>
        <div v-if="serviceSecrets.length > 0" class="divide-y rounded-lg border">
          <div v-for="s in serviceSecrets" :key="s.id" class="flex items-center gap-2 px-3 py-2.5 text-sm">
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium">{{ s.name }}</p>
              <code class="mt-0.5 block truncate font-mono text-xs text-muted-foreground">
                {{ revealedId === s.id ? s.key_value : maskKey(s.key_value) }}
              </code>
            </div>
            <div class="flex shrink-0 gap-0.5">
              <Button variant="ghost" size="sm" :title="revealedId === s.id ? '隐藏' : '显示明文'" @click="revealedId = revealedId === s.id ? null : s.id">
                <EyeOff v-if="revealedId === s.id" class="h-4 w-4" />
                <Eye v-else class="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" title="复制" @click="handleCopy(s)">
                <Copy class="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" title="编辑" @click="openEditSecret(s)">
                <Pencil class="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                title="删除"
                class="text-destructive hover:text-destructive"
                @click="deleteSecretTarget = s"
              >
                <Trash2 class="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <p v-else class="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
          尚未配置密钥，点击「添加密钥」录入该工具的 API Key / Token
        </p>
      </div>

      <!-- 底部操作 -->
      <div class="mt-5 flex justify-between gap-2">
        <Button type="button" variant="ghost" class="text-destructive hover:text-destructive" @click="emit('remove')">
          <Trash2 class="h-4 w-4" />
          删除工具
        </Button>
        <Button type="button" @click="emit('edit')">
          <Pencil class="h-4 w-4" />
          编辑工具
        </Button>
      </div>
    </div>
    <div v-else class="space-y-2">
      <Skeleton v-for="i in 3" :key="i" class="h-12 rounded-md" />
    </div>

    <!-- 密钥新建/编辑 -->
    <SecretFormDialog
      v-model:open="secretFormOpen"
      :secret="editingSecret"
      :submitting="submitting"
      @submit="handleSecretSubmit"
    />

    <!-- 密钥删除确认 -->
    <SecretDeleteDialog
      :open="deleteSecretTarget !== null"
      :secret-name="deleteSecretTarget?.name"
      :deleting="deleting"
      @update:open="(v) => !v && (deleteSecretTarget = null)"
      @confirm="handleSecretDeleteConfirm"
    />
  </Dialog>
</template>

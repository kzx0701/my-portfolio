<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { RefreshCw } from '@lucide/vue'
import { Badge, Button, Dialog, Input, Label, Select, Textarea } from '@/components/ui'
import {
  BALANCE_PROVIDER_OPTIONS,
  queryBalance,
  resolveApiBase,
  resolveBalanceUrl,
} from '@/lib/balance'
import { toast } from '@/lib/toast'
import { useAiStore } from '@/modules/ai/store'
import { SERVICE_TYPE_META, type AiService, type AiServiceInput } from '@/modules/ai/types'

const props = defineProps<{
  open: boolean
  /** 传入工具则为编辑，否则为新建 */
  service?: AiService | null
  submitting?: boolean
}>()

/** 提交载荷：工具入参 + 新建/更新的 API Key（模型 API 类创建密钥用，null 表示不创建） */
const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [payload: { input: AiServiceInput; apiKey: string | null }]
}>()

const store = useAiStore()

/** Agent 工具类型选项（workbuddy/trae/other） */
const AGENT_TYPE_OPTIONS = ['workbuddy', 'trae', 'other'].map((value) => ({
  value,
  label: SERVICE_TYPE_META[value].label,
}))

const form = reactive({
  kind: 'model_api' as 'model_api' | 'agent',
  name: '',
  // 模型 API 分支
  provider: 'deepseek',
  customBase: '',
  customBalanceUrl: '',
  apiKey: '',
  // 手动余额（模型 API 分支：无余额接口的平台手工维护；查询成功时被覆盖）
  manualBalance: null as number | '' | null,
  // Agent 分支
  agentType: null as string | null,
  agentBalance: null as number | '' | null,
  note: null as string | null,
})

/** 查询余量状态 */
const checking = ref(false)
const checkResult = ref<{ ok: boolean; balance: number | null; error?: string } | null>(null)
/** 最近一次查询成功的余额（提交时带上） */
const lastQueriedBalance = ref<number | null>(null)

/** 是否自定义/中转站（需手填地址） */
const isCustom = computed(() => form.provider === 'custom' || form.provider === 'relay')

/** 计算后的 API 地址与余额接口 */
const apiBase = computed(() =>
  isCustom.value ? form.customBase.trim() : resolveApiBase(form.provider),
)
const balanceUrl = computed(() =>
  isCustom.value
    ? form.customBalanceUrl.trim()
    : resolveBalanceUrl(form.provider),
)

/** 是否有可用余额查询接口（无则不显示「查询余量」按钮） */
const canQueryBalance = computed(() => balanceUrl.value.length > 0)

/** 编辑时：该工具已有的 API Key（查询余量用；新建为 null） */
const existingKey = computed(() => {
  if (!props.service) return null
  return store.secretsOf(props.service.id).find((s) => s.key_value)?.key_value ?? null
})

/** 查询用 Key：优先表单新输入，其次已有 Key */
const queryKey = computed(() => form.apiKey.trim() || existingKey.value || '')

watch(
  () => props.open,
  (open) => {
    if (!open) return
    const s = props.service
    form.kind = (s?.kind as 'model_api' | 'agent') ?? 'model_api'
    form.name = s?.name ?? ''
    form.provider = (s?.service_type as string) ?? 'deepseek'
    // 预设平台还是自定义：service_type 不在预设列表内 → 归入自定义
    if (!['deepseek', 'zhipu', 'xiaomi', 'relay', 'custom'].includes(form.provider)) {
      form.provider = 'custom'
    }
    form.customBase = s?.base_url ?? ''
    form.customBalanceUrl = s?.balance_query_url ?? ''
    form.apiKey = ''
    form.manualBalance = null
    form.agentType = (s?.service_type as string) ?? 'workbuddy'
    form.agentBalance = s?.balance ?? null
    form.note = s?.note ?? null
    checkResult.value = null
    lastQueriedBalance.value = null
  },
)

/** 平台切换时，自定义地址同步到当前值 */
function onProviderChange(value: string) {
  form.provider = value
  if (!isCustom.value) {
    form.customBase = resolveApiBase(value)
    form.customBalanceUrl = resolveBalanceUrl(value)
  }
}

async function handleCheckBalance() {
  if (!balanceUrl.value) {
    toast('请先填写余额查询接口地址', 'error')
    return
  }
  if (!queryKey.value) {
    toast('请先填写 API Key', 'error')
    return
  }
  checking.value = true
  checkResult.value = null
  try {
    const result = await queryBalance(balanceUrl.value, queryKey.value)
    checkResult.value = result
    if (result.ok && result.balance !== null) {
      lastQueriedBalance.value = result.balance
    } else {
      lastQueriedBalance.value = null
    }
  } finally {
    checking.value = false
  }
}

/** 数值输入归一化：空 → null */
function num(v: number | '' | null): number | null {
  return v === '' || v === null ? null : Number(v)
}

function handleSubmit() {
  const name = form.name.trim()
  if (!name) {
    toast('请填写工具名称', 'error')
    return
  }
  if (form.kind === 'model_api') {
    if (!apiBase.value) {
      toast('请填写 API 地址', 'error')
      return
    }
    if (!queryKey.value) {
      toast('请填写 API Key（可先查询余量）', 'error')
      return
    }
    // 余额：手动填写优先（无余额接口的平台如小米）；有自动查询结果时手动值留空则用查询值
    const manualBalance = num(form.manualBalance)
    const balance = manualBalance ?? lastQueriedBalance.value
    const input: AiServiceInput = {
      name,
      service_type: form.provider as AiServiceInput['service_type'],
      kind: 'model_api',
      plan: null,
      base_url: apiBase.value,
      balance_query_url: balanceUrl.value || null,
      balance,
      balance_updated_at: balance !== null ? new Date().toISOString() : null,
      quota_limit: null,
      quota_reset_time: null,
      note: form.note?.trim() || null,
    }
    emit('submit', { input, apiKey: form.apiKey.trim() || null })
    return
  }
  // Agent 工具
  const balance = num(form.agentBalance)
  const input: AiServiceInput = {
    name,
    service_type: form.agentType as AiServiceInput['service_type'],
    kind: 'agent',
    plan: null,
    base_url: null,
    balance_query_url: null,
    balance,
    balance_updated_at: balance !== null ? new Date().toISOString() : null,
    quota_limit: null,
    quota_reset_time: null,
    note: form.note?.trim() || null,
  }
  emit('submit', { input, apiKey: null })
}
</script>

<template>
  <Dialog
    :open="open"
    :title="service ? '编辑 AI 工具' : '添加 AI 工具'"
    description="模型 API：填 API 地址与 Key，自动查询余量；Agent 工具：极简登记。"
    class="max-w-2xl"
    @update:open="emit('update:open', $event)"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <!-- 工具形态切换 -->
      <div class="flex gap-2">
        <button
          type="button"
          class="flex-1 rounded-lg border px-3 py-2 text-sm transition-colors"
          :class="
            form.kind === 'model_api'
              ? 'border-transparent bg-primary text-primary-foreground'
              : 'border-border text-muted-foreground hover:text-foreground'
          "
          @click="form.kind = 'model_api'"
        >
          模型 API
        </button>
        <button
          type="button"
          class="flex-1 rounded-lg border px-3 py-2 text-sm transition-colors"
          :class="
            form.kind === 'agent'
              ? 'border-transparent bg-primary text-primary-foreground'
              : 'border-border text-muted-foreground hover:text-foreground'
          "
          @click="form.kind = 'agent'"
        >
          Agent 工具
        </button>
      </div>

      <!-- 模型 API 分支 -->
      <template v-if="form.kind === 'model_api'">
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <Label for="mk-name">工具名称 *</Label>
            <Input id="mk-name" v-model="form.name" placeholder="如：DeepSeek API" required />
          </div>
          <div class="space-y-2">
            <Label for="mk-provider">平台</Label>
            <Select
              id="mk-provider"
              :model-value="form.provider"
              :options="BALANCE_PROVIDER_OPTIONS"
              @update:model-value="onProviderChange"
            />
          </div>
        </div>

        <div class="space-y-2">
          <Label for="mk-base">API 地址</Label>
          <Input
            id="mk-base"
            :model-value="isCustom ? form.customBase : apiBase"
            :readonly="!isCustom"
            :placeholder="isCustom ? '如 https://api.deepseek.com' : apiBase"
            @update:model-value="(v) => (form.customBase = String(v))"
          />
          <p v-if="!isCustom" class="text-xs text-muted-foreground">预设平台地址已自动带出</p>
        </div>

        <div class="space-y-2">
          <Label for="mk-key">API Key{{ service ? '（选填）' : ' *' }}</Label>
          <Input
            id="mk-key"
            v-model="form.apiKey"
            type="password"
            autocomplete="off"
            :placeholder="service ? '留空保持原 Key' : '粘贴 API Key（sk-...）'"
          />
        </div>

        <!-- 余额 -->
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <Label for="mk-balance">当前余额（选填）</Label>
            <Input
              id="mk-balance"
              v-model.number="form.manualBalance"
              type="number"
              min="0"
              step="0.01"
              placeholder="不支持自动查询的平台手动填写"
            />
            <p v-if="!canQueryBalance" class="text-xs text-muted-foreground">
              {{ form.provider === 'xiaomi' ? '小米 MiMo 余额需在控制台查看，暂不支持自动查询，请手动填写' : '该平台暂不支持自动查询余量，可手动填写' }}
            </p>
          </div>
          <div v-if="canQueryBalance" class="space-y-2">
            <Label for="mk-bal-url">余额查询接口（选填）</Label>
            <Input
              id="mk-bal-url"
              :model-value="isCustom ? form.customBalanceUrl : balanceUrl"
              :readonly="!isCustom"
              :placeholder="isCustom ? '如 https://open.bigmodel.cn/api/paas/v4/balance' : balanceUrl"
              @update:model-value="(v) => (form.customBalanceUrl = String(v))"
            />
          </div>
        </div>

        <!-- 自动查询余量 -->
        <div v-if="canQueryBalance" class="space-y-2">
          <div class="flex items-end gap-2">
            <div class="flex-1">
              <p class="text-xs text-muted-foreground">填入 API Key 后点「查询余量」，成功自动保存</p>
            </div>
            <Button type="button" variant="outline" :disabled="checking" @click="handleCheckBalance">
              <RefreshCw class="h-4 w-4" :class="checking && 'animate-spin'" />
              查询余量
            </Button>
          </div>
          <div v-if="checkResult" class="flex items-center gap-2 text-sm">
            <Badge
              variant="outline"
              :class="
                checkResult.ok
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
              "
            >
              {{ checkResult.ok ? '查询成功' : '查询失败' }}
            </Badge>
            <span v-if="checkResult.ok" class="font-semibold tabular-nums">
              {{ checkResult.balance !== null ? new Intl.NumberFormat('zh-CN').format(checkResult.balance) : '—' }}
            </span>
            <span v-else class="text-xs text-muted-foreground">{{ checkResult.error }}</span>
          </div>
        </div>
      </template>

      <!-- Agent 工具分支 -->
      <template v-else>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <Label for="ak-name">工具名称 *</Label>
            <Input id="ak-name" v-model="form.name" placeholder="如：WorkBuddy / Trae" required />
          </div>
          <div class="space-y-2">
            <Label for="ak-type">类型</Label>
            <Select id="ak-type" v-model="form.agentType" :options="AGENT_TYPE_OPTIONS" />
          </div>
        </div>
        <div class="space-y-2">
          <Label for="ak-balance">当前剩余额度（选填）</Label>
          <Input id="ak-balance" v-model.number="form.agentBalance" type="number" min="0" step="0.01" placeholder="手动维护，如 WorkBuddy 剩余积分" />
        </div>
      </template>

      <div class="space-y-2">
        <Label for="svc-note">备注</Label>
        <Textarea id="svc-note" v-model="form.note" placeholder="用途说明…" :rows="2" />
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" @click="emit('update:open', false)">取消</Button>
        <Button type="submit" :disabled="submitting">
          {{ submitting ? '保存中…' : service ? '保存修改' : '添加工具' }}
        </Button>
      </div>
    </form>
  </Dialog>
</template>

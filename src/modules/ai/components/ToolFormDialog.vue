<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Eye, EyeOff } from '@lucide/vue'
import { Button, Dialog, Input, Label, Select, Textarea } from '@/components/ui'
import {
  BALANCE_PROVIDER_OPTIONS,
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

/** Agent 工具类型选项 */
const AGENT_TYPE_OPTIONS = ['kimi', 'rightcode', 'pixelapi', 'shareapi'].map((value) => ({
  value,
  label: SERVICE_TYPE_META[value].label,
}))

const form = reactive({
  kind: 'model_api' as 'model_api' | 'agent' | 'relay',
  name: '',
  // 模型 API 分支
  provider: 'deepseek',
  apiKey: '',
  consoleUrl: '',
  balanceQueryUrl: '',
  // Agent 分支
  agentType: null as string | null,
  // 中转站分支
  relayApiUrl: '',
  relayApiKey: '',
  relayBalanceQueryUrl: '',
  note: null as string | null,
})

/** API Key 明文可见状态 */
const showApiKey = ref(false)

/** 计算后的 API 地址与余额接口 */
const apiBase = computed(() => resolveApiBase(form.provider))
const balanceUrl = computed(() => resolveBalanceUrl(form.provider))

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
    form.kind = (s?.kind as 'model_api' | 'agent' | 'relay') ?? 'model_api'
    form.name = s?.name ?? ''
    form.provider = (s?.service_type as string) ?? 'deepseek'
    // 预设平台：service_type 不在预设列表内 → 归入 deepseek
    if (!BALANCE_PROVIDER_OPTIONS.some((o) => o.value === form.provider)) {
      form.provider = 'deepseek'
    }
    form.apiKey = existingKey.value ?? ''
    form.consoleUrl = s?.console_url ?? ''
    form.balanceQueryUrl = s?.balance_query_url ?? ''
    form.agentType = (s?.service_type as string) ?? 'kimi'
    // 中转站分支
    form.relayApiUrl = s?.base_url ?? ''
    form.relayApiKey = existingKey.value ?? ''
    form.relayBalanceQueryUrl = s?.balance_query_url ?? ''
    form.note = s?.note ?? null
    showApiKey.value = false
  },
)

/** 平台切换时，自定义地址同步到当前值 */
function onProviderChange(value: string) {
  form.provider = value
}

function handleSubmit() {
  const name = form.name.trim()
  if (!name) {
    toast('请填写工具名称', 'error')
    return
  }
  // 判断 API Key 是否有修改：编辑时若和现有 key 相同则视为未修改
  function resolveApiKey(current: string): string | null {
    const trimmed = current.trim()
    if (!trimmed) return null
    // 编辑模式下，如果和现有 key 相同，返回 null 表示不更新
    if (props.service && trimmed === existingKey.value) return null
    return trimmed
  }
  if (form.kind === 'model_api') {
    if (!apiBase.value) {
      toast('请填写 API 地址', 'error')
      return
    }
    if (!queryKey.value) {
      toast('请填写 API Key', 'error')
      return
    }
    const input: AiServiceInput = {
      name,
      service_type: form.provider as AiServiceInput['service_type'],
      kind: 'model_api',
      plan: null,
      base_url: apiBase.value,
      balance_query_url: form.balanceQueryUrl.trim() || balanceUrl.value || null,
      console_url: form.consoleUrl.trim() || null,
      balance: props.service?.balance ?? null,
      balance_updated_at: props.service?.balance_updated_at ?? null,
      quota_limit: null,
      quota_reset_time: null,
      note: form.note?.trim() || null,
    }
    emit('submit', { input, apiKey: resolveApiKey(form.apiKey) })
    return
  }
  // Agent 工具
  if (form.kind === 'agent') {
    const input: AiServiceInput = {
      name,
      service_type: form.agentType as AiServiceInput['service_type'],
      kind: 'agent',
      plan: null,
      base_url: null,
      balance_query_url: null,
      console_url: form.consoleUrl.trim() || null,
      balance: props.service?.balance ?? null,
      balance_updated_at: props.service?.balance_updated_at ?? null,
      quota_limit: null,
      quota_reset_time: null,
      note: form.note?.trim() || null,
    }
    emit('submit', { input, apiKey: null })
    return
  }
  // 中转站
  const relayInput: AiServiceInput = {
    name,
    service_type: null,
    kind: 'relay',
    plan: null,
    base_url: form.relayApiUrl.trim() || null,
    balance_query_url: form.relayBalanceQueryUrl.trim() || null,
    console_url: form.consoleUrl.trim() || null,
    balance: props.service?.balance ?? null,
    balance_updated_at: props.service?.balance_updated_at ?? null,
    quota_limit: null,
    quota_reset_time: null,
    note: form.note?.trim() || null,
  }
  emit('submit', { input: relayInput, apiKey: resolveApiKey(form.relayApiKey) })
}
</script>

<template>
  <Dialog
    :open="open"
    :title="service ? '编辑 AI 工具' : '添加 AI 工具'"
    description="模型 API：填 API 地址与 Key，自动查询余量；Agent 工具：极简登记；中转站：填 API 地址与 Key。"
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
        <button
          type="button"
          class="flex-1 rounded-lg border px-3 py-2 text-sm transition-colors"
          :class="
            form.kind === 'relay'
              ? 'border-transparent bg-primary text-primary-foreground'
              : 'border-border text-muted-foreground hover:text-foreground'
          "
          @click="form.kind = 'relay'"
        >
          中转站
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
            :model-value="apiBase"
            readonly
            :placeholder="apiBase"
          />
          <p class="text-xs text-muted-foreground">预设平台地址已自动带出</p>
        </div>

        <div class="space-y-2">
          <Label for="mk-key">API Key{{ service ? '（选填）' : ' *' }}</Label>
          <div class="relative">
            <Input
              id="mk-key"
              v-model="form.apiKey"
              :type="showApiKey ? 'text' : 'password'"
              autocomplete="new-password"
              class="pr-10"
              :placeholder="service ? '留空保持不变，或输入新密钥' : '粘贴 API Key（sk-...）'"
            />
            <button
              type="button"
              class="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-muted-foreground hover:text-foreground"
              @click="showApiKey = !showApiKey"
            >
              <EyeOff v-if="showApiKey" class="h-4 w-4" />
              <Eye v-else class="h-4 w-4" />
            </button>
          </div>
        </div>

        <div class="space-y-2">
          <Label for="mk-balance-url">用量查询地址（选填）</Label>
          <Input
            id="mk-balance-url"
            v-model="form.balanceQueryUrl"
            :placeholder="balanceUrl || '留空使用预设地址'"
          />
          <p v-if="balanceUrl" class="text-xs text-muted-foreground">预设：{{ balanceUrl }}</p>
        </div>
      </template>

      <!-- Agent 工具分支 -->
      <template v-else-if="form.kind === 'agent'">
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
      </template>

      <!-- 中转站分支 -->
      <template v-else>
        <div class="space-y-2">
          <Label for="rl-name">工具名称 *</Label>
          <Input id="rl-name" v-model="form.name" placeholder="如：OpenRouter 中转" required />
        </div>
        <div class="space-y-2">
          <Label for="rl-api-url">API 地址</Label>
          <Input id="rl-api-url" v-model="form.relayApiUrl" placeholder="如：https://openrouter.ai/api/v1" />
        </div>
        <div class="space-y-2">
          <Label for="rl-api-key">API Key</Label>
          <div class="relative">
            <Input
              id="rl-api-key"
              v-model="form.relayApiKey"
              :type="showApiKey ? 'text' : 'password'"
              autocomplete="new-password"
              class="pr-10"
              :placeholder="service ? '留空保持不变，或输入新密钥' : '粘贴 API Key'"
            />
            <button
              type="button"
              class="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-muted-foreground hover:text-foreground"
              @click="showApiKey = !showApiKey"
            >
              <EyeOff v-if="showApiKey" class="h-4 w-4" />
              <Eye v-else class="h-4 w-4" />
            </button>
          </div>
        </div>
        <div class="space-y-2">
          <Label for="rl-balance-query-url">用量查询地址（选填）</Label>
          <Input id="rl-balance-query-url" v-model="form.relayBalanceQueryUrl" placeholder="如：https://openrouter.ai/api/v1/auth/key" />
        </div>
      </template>

      <div class="space-y-2">
        <Label for="svc-console">控制台地址（选填）</Label>
        <Input id="svc-console" v-model="form.consoleUrl" placeholder="如：https://platform.deepseek.com" />
      </div>

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

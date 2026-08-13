<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Plus, Trash2 } from '@lucide/vue'
import { Badge, Button, Dialog, Input, Label, Select } from '@/components/ui'
import DatePicker from '@/components/DatePicker.vue'
import { useOrdersStore } from '@/modules/orders/store'
import {
  PAYMENT_STAGE_META,
  PAYMENT_STAGE_OPTIONS,
  type Order,
  type PaymentInput,
} from '@/modules/orders/types'
import { toast } from '@/lib/toast'

const props = defineProps<{
  open: boolean
  /** 目标订单（null 时不显示内容） */
  order?: Order | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const store = useOrdersStore()

/** 回款阶段 badge 配色（可扩展阶段未在映射中时回退到 outline 默认样式） */
const STAGE_BADGE_CLASS: Record<string, string> = {
  deposit: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  final: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
}

const form = reactive<{
  stage: string
  amount: number | null
  paid_at: string | null
  note: string | null
}>({
  stage: 'deposit',
  amount: null,
  paid_at: null,
  note: null,
})

watch(
  () => props.open,
  (open) => {
    if (open) {
      form.stage = 'deposit'
      form.amount = null
      form.paid_at = null
      form.note = null
    }
  },
)

const payments = computed(() => (props.order ? store.paymentsOf(props.order.id) : []))
const paidTotal = computed(() => (props.order ? store.paidTotalOf(props.order.id) : 0))

/** 各阶段回款金额汇总（如 定金合计 / 尾款合计） */
const stageSummary = computed(() => {
  const map: Record<string, number> = {}
  for (const p of payments.value) map[p.stage] = (map[p.stage] ?? 0) + (p.amount ?? 0)
  return Object.keys(map).map((stage) => ({
    stage,
    label: PAYMENT_STAGE_META[stage]?.label ?? stage,
    total: map[stage],
  }))
})

const orderAmount = computed(() => props.order?.amount ?? null)
const remaining = computed(() =>
  orderAmount.value === null ? null : Math.max(0, orderAmount.value - paidTotal.value),
)

const adding = ref(false)

async function handleAdd() {
  if (!props.order) return
  const amount = Number(form.amount)
  if (!amount || amount <= 0) {
    toast('请输入大于 0 的回款金额', 'error')
    return
  }
  // 约束：已回款合计 + 本次金额不得超过订单金额（"回款收满 = 订单金额"）
  if (orderAmount.value !== null && paidTotal.value + amount > orderAmount.value) {
    toast(`回款合计不能超过订单金额 ${formatAmount(orderAmount.value)}`, 'error')
    return
  }
  adding.value = true
  try {
    await store.addPayment(props.order.id, {
      stage: form.stage,
      amount,
      paid_at: form.paid_at,
      note: form.note?.trim() || null,
    })
    form.amount = null
    form.paid_at = null
    form.note = null
  } catch (e: any) {
    console.error('添加回款失败', e)
    toast(e?.message ?? '添加失败', 'error')
  } finally {
    adding.value = false
  }
}

async function handleDelete(paymentId: string) {
  if (!props.order) return
  try {
    await store.deletePayment(props.order.id, paymentId)
  } catch (e: any) {
    console.error('删除回款失败', e)
    toast(e?.message ?? '删除失败', 'error')
  }
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(value)
}

function formatDate(date: string | null): string {
  if (!date) return '—'
  return date.slice(0, 10)
}
</script>

<template>
  <Dialog
    :open="open"
    title="回款管理"
    @update:open="emit('update:open', $event)"
  >
    <div v-if="order" class="space-y-4">
      <!-- 金额摘要：已回款 / 订单金额 / 剩余可收 -->
      <div class="grid gap-3 sm:grid-cols-3">
        <div class="rounded-lg border bg-muted/50 p-3 text-center">
          <p class="text-xs text-muted-foreground">已回款</p>
          <p class="mt-1 text-sm font-semibold tabular-nums">{{ formatAmount(paidTotal) }}</p>
        </div>
        <div class="rounded-lg border bg-muted/50 p-3 text-center">
          <p class="text-xs text-muted-foreground">订单金额</p>
          <p class="mt-1 text-sm font-semibold tabular-nums">
            {{ orderAmount !== null ? formatAmount(orderAmount) : '—' }}
          </p>
        </div>
        <div class="rounded-lg border bg-muted/50 p-3 text-center">
          <p class="text-xs text-muted-foreground">剩余可收</p>
          <p class="mt-1 text-sm font-semibold tabular-nums">
            {{ remaining !== null ? formatAmount(remaining) : '—' }}
          </p>
        </div>
      </div>

      <!-- 分阶段回款汇总（如 定金合计 / 尾款合计） -->
      <div v-if="stageSummary.length" class="flex flex-wrap gap-2">
        <Badge
          v-for="s in stageSummary"
          :key="s.stage"
          variant="outline"
          :class="STAGE_BADGE_CLASS[s.stage]"
          class="gap-1.5 px-2.5 py-1"
        >
          {{ s.label }} {{ formatAmount(s.total) }}
        </Badge>
      </div>

      <!-- 回款记录列表 -->
      <ul v-if="payments.length" class="divide-y rounded-lg border">
        <li v-for="p in payments" :key="p.id" class="flex items-center gap-3 px-3 py-2.5">
          <Badge
            variant="outline"
            :class="STAGE_BADGE_CLASS[p.stage]"
            class="w-14 shrink-0 justify-center"
          >
            {{ PAYMENT_STAGE_META[p.stage]?.label ?? p.stage }}
          </Badge>
          <span class="flex-1 truncate text-sm font-medium tabular-nums">{{ formatAmount(p.amount) }}</span>
          <span v-if="p.note" class="hidden max-w-[8rem] truncate text-xs text-muted-foreground sm:inline">{{ p.note }}</span>
          <span class="shrink-0 text-xs tabular-nums text-muted-foreground">{{ formatDate(p.paid_at) }}</span>
          <Button variant="ghost" size="icon" title="删除该笔回款" @click="handleDelete(p.id)">
            <Trash2 class="h-4 w-4 text-destructive" />
          </Button>
        </li>
      </ul>
      <p v-else class="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
        暂无回款记录，添加第一笔定金吧。
      </p>

      <!-- 新增回款表单 -->
      <form class="space-y-4 border-t pt-4" @submit.prevent="handleAdd">
        <div class="grid gap-4 sm:grid-cols-3">
          <div class="space-y-2">
            <Label for="p-stage">回款阶段</Label>
            <Select id="p-stage" v-model="form.stage" :options="PAYMENT_STAGE_OPTIONS" />
          </div>
          <div class="space-y-2">
            <Label for="p-amount">回款金额（元）</Label>
            <Input
              id="p-amount"
              v-model.number="form.amount"
              type="number"
              min="0"
              step="0.01"
              :placeholder="remaining !== null ? `剩余可收 ${formatAmount(remaining)}` : '0'"
            />
          </div>
          <div class="space-y-2">
            <Label for="p-date">回款日期</Label>
            <DatePicker id="p-date" v-model="form.paid_at" placeholder="选择回款日期" />
          </div>
        </div>
        <div class="space-y-2">
          <Label for="p-note">备注（可选）</Label>
          <Input id="p-note" v-model="form.note" placeholder="如：微信转账 / 尾款线下支付…" />
        </div>
        <div class="flex justify-end">
          <Button type="submit" :disabled="adding">
            <Plus class="h-4 w-4" />
            {{ adding ? '添加中…' : '添加回款' }}
          </Button>
        </div>
      </form>
    </div>
  </Dialog>
</template>

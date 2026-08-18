<script setup lang="ts">
import { computed } from 'vue'
import { Coins, KeyRound, Receipt, Wrench } from '@lucide/vue'
import { cn } from '@/lib/utils'
import { useAiStore } from '@/modules/ai/store'
import { currentMonth } from '@/modules/ai/types'

const store = useAiStore()

/** 本月消费合计（按消费日期聚合到月份） */
const monthAmount = computed(() =>
  store.usage
    .filter((u) => u.usage_date.slice(0, 7) === currentMonth())
    .reduce((sum, u) => sum + u.amount, 0),
)

/** 统计卡配置 */
const stats = computed(() => [
  {
    title: 'AI 工具',
    value: store.services.length,
    hint: '已登记工具',
    icon: Wrench,
    iconClass: 'bg-gradient-to-br from-sky-400 to-blue-500',
    accentClass: 'bg-linear-to-r from-sky-400 to-blue-500',
  },
  {
    title: '密钥数量',
    value: store.secrets.length,
    hint: 'API Key / Token',
    icon: KeyRound,
    iconClass: 'bg-gradient-to-br from-teal-400 to-emerald-500',
    accentClass: 'bg-linear-to-r from-teal-400 to-emerald-500',
  },
  {
    title: '本月消费',
    value:
      monthAmount.value > 0
        ? new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(monthAmount.value)
        : '—',
    hint: '人民币金额',
    icon: Receipt,
    iconClass: 'bg-gradient-to-br from-indigo-400 to-indigo-600',
    accentClass: 'bg-linear-to-r from-indigo-400 to-indigo-600',
  },
  {
    title: '消费记录',
    value: store.usage.length,
    hint: '累计笔数',
    icon: Coins,
    iconClass: 'bg-gradient-to-br from-amber-400 to-orange-500',
    accentClass: 'bg-linear-to-r from-amber-400 to-orange-500',
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
          <p class="mt-0.5 truncate text-2xl font-bold tabular-nums tracking-tight">{{ s.value }}</p>
          <p class="mt-0.5 truncate text-xs text-muted-foreground">{{ s.hint }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

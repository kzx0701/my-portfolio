<script setup lang="ts">
import { Activity, Briefcase, CheckCircle2, Wallet } from '@lucide/vue'
import { StatCard } from '@/modules/orders/components'
import { useOrdersStore } from '@/modules/orders/store'

const store = useOrdersStore()

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(value)
}
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <StatCard
      title="进行中"
      :value="store.stats.active"
      :icon="Activity"
      icon-class="bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/25"
      accent-class="bg-gradient-to-r from-amber-400 to-orange-500"
    />
    <StatCard
      title="总订单"
      :value="store.stats.total"
      :icon="Briefcase"
      icon-class="bg-gradient-to-br from-sky-400 to-blue-500 shadow-sky-500/25"
      accent-class="bg-gradient-to-r from-sky-400 to-blue-500"
    />
    <StatCard
      title="已完成"
      :value="store.stats.completed"
      :icon="CheckCircle2"
      icon-class="bg-gradient-to-br from-emerald-400 to-teal-500 shadow-emerald-500/25"
      accent-class="bg-gradient-to-r from-emerald-400 to-teal-500"
    />
    <StatCard
      title="已收款"
      :value="formatCurrency(store.stats.paidTotal)"
      :icon="Wallet"
      icon-class="bg-gradient-to-br from-teal-400 to-cyan-500 shadow-teal-500/25"
      accent-class="bg-gradient-to-r from-teal-400 to-cyan-500"
    />
  </div>
</template>

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
    <StatCard title="进行中" :value="store.stats.active" :icon="Activity" hint="未完成 / 未取消" />
    <StatCard title="总订单" :value="store.stats.total" :icon="Briefcase" />
    <StatCard title="已完成" :value="store.stats.completed" :icon="CheckCircle2" />
    <StatCard title="已收款" :value="formatCurrency(store.stats.paidTotal)" :icon="Wallet" hint="全部项目回款总额" />
  </div>
</template>

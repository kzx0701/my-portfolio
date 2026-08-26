<script setup lang="ts">
import { CheckCircle2, CircleDashed, Gauge, TriangleAlert } from '@lucide/vue'
import { Skeleton } from '@/components/ui'
import { StatCard } from '@/modules/orders/components'
import { useWorklogStore } from '@/modules/worklog/store'

const store = useWorklogStore()
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <template v-if="store.dashboardLoading">
      <Skeleton v-for="i in 4" :key="i" class="h-[118px] rounded-xl" />
    </template>
    <template v-else>
      <StatCard
        title="当前待办"
        :value="store.dashboardStats.currentPending"
        hint="今天及历史遗留"
        :icon="CircleDashed"
        icon-class="bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/25"
        accent-class="bg-gradient-to-r from-amber-400 to-orange-500"
      />
      <StatCard
        title="今日完成"
        :value="store.dashboardStats.todayCompleted"
        hint="按实际完成时间统计"
        :icon="CheckCircle2"
        icon-class="bg-gradient-to-br from-emerald-400 to-teal-500 shadow-emerald-500/25"
        accent-class="bg-gradient-to-r from-emerald-400 to-teal-500"
      />
      <StatCard
        title="已逾期"
        :value="store.dashboardStats.overdue"
        hint="过去日期仍未完成"
        :icon="TriangleAlert"
        icon-class="bg-gradient-to-br from-rose-400 to-orange-500 shadow-rose-500/25"
        accent-class="bg-gradient-to-r from-rose-400 to-orange-500"
      />
      <StatCard
        title="近 7 日完成率"
        :value="`${store.dashboardStats.last7CompletionRate}%`"
        hint="已取消事项不参与计算"
        :icon="Gauge"
        icon-class="bg-gradient-to-br from-sky-400 to-cyan-500 shadow-sky-500/25"
        accent-class="bg-gradient-to-r from-sky-400 to-cyan-500"
      />
    </template>
  </div>
</template>

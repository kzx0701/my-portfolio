<script setup lang="ts">
import { CircleCheck, CircleCheckBig, CircleDashed, Gauge } from '@lucide/vue'
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
        title="待处理"
        :value="store.dashboardStats.pendingTotal"
        hint="全部未完成事项"
        :icon="CircleDashed"
        icon-class="bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/25"
        accent-class="bg-gradient-to-r from-amber-400 to-orange-500"
      />
      <StatCard
        title="今日完成"
        :value="store.dashboardStats.todayCompleted"
        hint="按实际完成时间统计"
        :icon="CircleCheckBig"
        icon-class="bg-gradient-to-br from-emerald-400 to-teal-500 shadow-emerald-500/25"
        accent-class="bg-gradient-to-r from-emerald-400 to-teal-500"
      />
      <StatCard
        title="近 7 日完成"
        :value="store.dashboardStats.last7Completed"
        hint="最近 7 天完成的记录"
        :icon="CircleCheck"
        icon-class="bg-gradient-to-br from-sky-400 to-cyan-500 shadow-sky-500/25"
        accent-class="bg-gradient-to-r from-sky-400 to-cyan-500"
      />
      <StatCard
        title="近 7 日完成率"
        :value="`${store.dashboardStats.last7CompletionRate}%`"
        hint="已取消事项不参与计算"
        :icon="Gauge"
        icon-class="bg-gradient-to-br from-sky-500 to-teal-500 shadow-teal-500/25"
        accent-class="bg-gradient-to-r from-sky-500 to-teal-500"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  ArrowRight,
  ClipboardList,
  Plus,
} from '@lucide/vue'
import { Badge, Button, Skeleton } from '@/components/ui'
import { OrderFormDialog, StatsCards } from '@/modules/orders/components'
import { useOrdersStore } from '@/modules/orders/store'
import {
  ORDER_STATUS_META,
  type OrderInput,
  type OrderStatus,
} from '@/modules/orders/types'
import { toast } from '@/lib/toast'

const store = useOrdersStore()

const formOpen = ref(false)
const submitting = ref(false)

onMounted(() => {
  store.fetchOrders()
})

/** 最近订单（store 已按 created_at 倒序） */
const recentOrders = computed(() => store.orders.slice(0, 5))

/** 状态分布（含占比，用于轻量条形展示） */
const statusDistribution = computed(() => {
  const total = store.orders.length || 1
  return (Object.keys(ORDER_STATUS_META) as OrderStatus[]).map((key) => {
    const count = store.orders.filter((o) => o.status === key).length
    return { key, label: ORDER_STATUS_META[key].label, count, ratio: Math.round((count / total) * 100) }
  })
})

/** 状态 → 条形配色（与统计页图表色一致） */
const STATUS_BAR_COLOR: Record<OrderStatus, string> = {
  negotiating: 'bg-amber-500',
  quoted: 'bg-teal-500',
  in_progress: 'bg-indigo-500',
  completed: 'bg-cyan-400',
  cancelled: 'bg-red-500',
}

function formatCurrency(value: number | null): string {
  if (value === null) return '—'
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(value)
}

function openCreate() {
  formOpen.value = true
}

async function handleSubmit(input: OrderInput) {
  submitting.value = true
  try {
    await store.createOrder(input)
    formOpen.value = false
  } catch (e: any) {
    console.error('创建订单失败', e)
    toast(e?.message ?? '创建失败', 'error')
  } finally {
    submitting.value = false
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
          :style="{ viewTransitionName: 'vt-orders' }"
        >
          <ClipboardList class="h-5 w-5" />
        </div>
        <div>
          <h2 class="text-lg font-semibold">仪表盘</h2>
          <p class="text-sm text-muted-foreground">接单业务概览与最近动态</p>
        </div>
      </div>
      <Button @click="openCreate">
        <Plus class="h-4 w-4" />
        新建订单
      </Button>
    </div>

    <!-- 统计卡片（三页共用组件） -->
    <StatsCards />

    <!-- 主区域：最近订单 + 状态分布 -->
    <div v-if="store.loading" class="grid gap-4 lg:grid-cols-3">
      <Skeleton class="h-80 rounded-lg lg:col-span-2" />
      <Skeleton class="h-80 rounded-lg" />
    </div>
    <div
      v-else-if="store.error"
      class="rounded-lg border border-destructive/50 p-6 text-center text-sm text-destructive"
    >
      加载失败：{{ store.error }}
    </div>
    <div v-else class="grid gap-4 lg:grid-cols-3">
      <!-- 最近订单 -->
      <div class="rounded-lg border lg:col-span-2">
        <div class="flex items-center justify-between border-b px-4 py-3">
          <h3 class="text-sm font-semibold">最近订单</h3>
          <RouterLink
            to="/orders/list"
            class="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            查看全部
            <ArrowRight class="h-3.5 w-3.5" />
          </RouterLink>
        </div>

        <div v-if="recentOrders.length === 0" class="px-4 py-14 text-center text-sm text-muted-foreground">
          还没有订单，点击右上角「新建订单」开始第一笔业务。
        </div>
        <ul v-else class="divide-y">
          <li
            v-for="order in recentOrders"
            :key="order.id"
            class="flex items-center gap-4 px-4 py-3"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="truncate text-sm font-medium">{{ order.project_name }}</span>
                <span class="hidden truncate text-xs text-muted-foreground sm:inline">
                  {{ order.client_name || '—' }}
                </span>
              </div>
            </div>
            <div class="shrink-0 text-right">
              <Badge variant="outline" :class="ORDER_STATUS_META[order.status].badgeClass">
                {{ ORDER_STATUS_META[order.status].label }}
              </Badge>
              <p class="mt-1 text-sm font-semibold tabular-nums">{{ formatCurrency(order.amount) }}</p>
            </div>
          </li>
        </ul>
      </div>

      <!-- 状态分布 -->
      <div class="rounded-lg border">
        <div class="border-b px-4 py-3">
          <h3 class="text-sm font-semibold">订单状态分布</h3>
        </div>
        <div v-if="store.orders.length === 0" class="px-4 py-14 text-center text-sm text-muted-foreground">
          暂无数据
        </div>
        <ul v-else class="space-y-3 p-4">
          <li v-for="item in statusDistribution" :key="item.key" class="space-y-1">
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground">{{ item.label }}</span>
              <span class="tabular-nums text-muted-foreground">{{ item.count }} 笔 · {{ item.ratio }}%</span>
            </div>
            <div class="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="STATUS_BAR_COLOR[item.key]"
                :style="{ width: `${item.ratio}%` }"
              />
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- 新建订单弹窗 -->
    <OrderFormDialog v-model:open="formOpen" :order="null" :submitting="submitting" @submit="handleSubmit" />
  </div>
</template>

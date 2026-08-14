<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  ArrowRight,
  ClipboardList,
  Plus,
  RotateCw,
} from '@lucide/vue'
import { Badge, Button, Skeleton } from '@/components/ui'
import { OrderCharts, OrderFormDialog, StatsCards } from '@/modules/orders/components'
import { useOrdersStore } from '@/modules/orders/store'
import { ORDER_STATUS_META, type OrderInput } from '@/modules/orders/types'
import { toast } from '@/lib/toast'

const store = useOrdersStore()

const formOpen = ref(false)
const submitting = ref(false)
/** 刷新中（只驱动按钮图标旋转，不触发页面骨架屏） */
const refreshing = ref(false)

onMounted(() => {
  store.fetchOrders()
})

/** 最近订单（store 已按 created_at 倒序） */
const recentOrders = computed(() => store.orders.slice(0, 5))

function formatCurrency(value: number | null): string {
  if (value === null) return '—'
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(value)
}

function openCreate() {
  formOpen.value = true
}

/** 强制刷新数据并提示结果 */
async function handleRefresh() {
  refreshing.value = true
  try {
    const ok = await store.fetchOrders(true)
    if (ok) toast('数据已刷新', 'success')
    else toast('刷新失败，请重试', 'error')
  } finally {
    refreshing.value = false
  }
}

async function handleSubmit(input: OrderInput) {
  submitting.value = true
  try {
    await store.createOrder(input)
    formOpen.value = false
    toast('订单创建成功', 'success')
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
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <Button variant="outline" :disabled="store.loading || refreshing" @click="handleRefresh">
          <RotateCw class="h-4 w-4" :class="refreshing && 'animate-spin'" />
          刷新
        </Button>
        <Button @click="openCreate">
          <Plus class="h-4 w-4" />
          新建订单
        </Button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <StatsCards />

    <!-- 主区域：左侧统计图表（2×2）+ 右侧最近订单 -->
    <div v-if="store.loading" class="grid gap-4 lg:grid-cols-3">
      <Skeleton class="h-[34rem] rounded-lg lg:col-span-2" />
      <Skeleton class="h-[34rem] rounded-lg" />
    </div>
    <div
      v-else-if="store.error"
      class="rounded-lg border border-destructive/50 p-6 text-center text-sm text-destructive"
    >
      加载失败：{{ store.error }}
    </div>
    <div v-else-if="store.orders.length === 0" class="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
      还没有订单，点击右上角「新建订单」开始第一笔业务。
    </div>
    <div v-else class="grid items-start gap-4 lg:grid-cols-3">
      <!-- 左侧：统计图表（2×2） -->
      <div class="lg:col-span-2">
        <OrderCharts />
      </div>

      <!-- 右侧：最近订单 -->
      <div class="rounded-lg border">
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

        <ul class="divide-y">
          <li
            v-for="order in recentOrders"
            :key="order.id"
            class="flex items-center gap-3 px-4 py-3"
          >
            <!-- 状态标签（行首） -->
            <Badge
              variant="outline"
              :class="ORDER_STATUS_META[order.status].badgeClass"
              class="shrink-0"
            >
              {{ ORDER_STATUS_META[order.status].label }}
            </Badge>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="truncate text-sm font-medium">{{ order.project_name }}</span>
                <span class="hidden truncate text-xs text-muted-foreground sm:inline">
                  {{ order.client_name || '—' }}
                </span>
              </div>
            </div>
            <!-- 金额（行尾，右对齐） -->
            <p class="shrink-0 text-right text-sm font-semibold tabular-nums">
              {{ formatCurrency(order.amount) }}
            </p>
          </li>
        </ul>
      </div>
    </div>

    <!-- 新建订单弹窗 -->
    <OrderFormDialog v-model:open="formOpen" :order="null" :submitting="submitting" @submit="handleSubmit" />
  </div>
</template>

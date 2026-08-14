<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Plus, ClipboardList, RotateCw } from '@lucide/vue'
import { Button, Skeleton } from '@/components/ui'
import { useOrdersStore } from '@/modules/orders/store'
import type { Order, OrderInput } from '@/modules/orders/types'
import { OrderTable } from '@/modules/orders/components'
import { OrderFormDialog } from '@/modules/orders/components'
import { OrderDeleteDialog } from '@/modules/orders/components'
import { PaymentDialog } from '@/modules/orders/components'
import { StatsCards } from '@/modules/orders/components'
import { toast } from '@/lib/toast'

const store = useOrdersStore()

/** 表格骨架各列占位宽度（与真实列内容长短匹配，观感更真实） */
const SKELETON_COL_WIDTHS = [
  'w-3/4', // 项目名称
  'w-1/2', // 客户名称
  'w-2/3', // 订单金额
  'w-2/3', // 回款金额
  'w-2/3', // 项目周期
  'w-1/2', // 项目类型
  'w-3/5', // 渠道来源
  'w-3/5', // 当前阶段
  'w-3/4', // 操作
]

const formOpen = ref(false)
const editingOrder = ref<Order | null>(null)
const deleteTarget = ref<Order | null>(null)
const paymentsOpen = ref(false)
const paymentsOrder = ref<Order | null>(null)
/** 刷新中（只驱动按钮图标旋转，不触发页面骨架屏） */
const refreshing = ref(false)

/** 强制从服务端重新拉取数据（绕过本地缓存），并提示结果 */
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
const submitting = ref(false)
const deleting = ref(false)

onMounted(() => {
  store.fetchOrders()
})

function openCreate() {
  editingOrder.value = null
  formOpen.value = true
}

function openEdit(order: Order) {
  editingOrder.value = order
  formOpen.value = true
}

function openDelete(order: Order) {
  deleteTarget.value = order
}

function openPayments(order: Order) {
  paymentsOrder.value = order
  paymentsOpen.value = true
}

async function handleSubmit(input: OrderInput) {
  submitting.value = true
  try {
    if (editingOrder.value) {
      await store.updateOrder(editingOrder.value.id, input)
      toast('订单已更新', 'success')
    } else {
      await store.createOrder(input)
      toast('订单创建成功', 'success')
    }
    formOpen.value = false
  } catch (e: any) {
    console.error('保存订单失败', e)
    toast(e?.message ?? '保存失败', 'error')
  } finally {
    submitting.value = false
  }
}

async function handleDeleteConfirm() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await store.deleteOrder(deleteTarget.value.id)
    deleteTarget.value = null
    toast('订单已删除', 'success')
  } catch (e: any) {
    console.error('删除订单失败', e)
    toast(e?.message ?? '删除失败', 'error')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-6">
    <!-- 工具栏 -->
    <div class="flex items-center justify-between">
      <!-- 标题区（logo 与首页卡片同 viewTransitionName，实现 VT 共享元素 morphing） -->
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-teal-500 text-white shadow-md shadow-sky-500/25"
          :style="{ viewTransitionName: 'vt-orders' }"
        >
          <ClipboardList class="h-5 w-5" />
        </div>
        <div>
          <h2 class="text-lg font-semibold">订单列表</h2>
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

    <!-- 统计卡片（与仪表盘一致，位于标题下方） -->
    <StatsCards />

    <!-- 列表 -->
    <div v-if="store.loading" class="overflow-hidden rounded-lg border bg-card">
      <!-- 表头骨架 -->
      <div class="flex h-12 items-center border-b bg-muted/30 px-2">
        <div v-for="i in 9" :key="`h-${i}`" class="w-[11.11%] px-2">
          <Skeleton class="h-4 w-16" />
        </div>
      </div>
      <!-- 数据行骨架（5 行 × 9 列，列宽差异化） -->
      <div v-for="r in 5" :key="`r-${r}`" class="flex h-12 items-center border-b px-2 last:border-0">
        <div v-for="(w, c) in SKELETON_COL_WIDTHS" :key="`c-${c}`" class="w-[11.11%] px-2">
          <Skeleton class="h-4" :class="w" />
        </div>
      </div>
    </div>
    <div v-else-if="store.error" class="rounded-lg border border-destructive/50 p-6 text-center text-sm text-destructive">
      加载失败：{{ store.error }}
    </div>
    <OrderTable v-else :orders="store.orders" @edit="openEdit" @remove="openDelete" @payments="openPayments" />

    <!-- 新建/编辑弹窗 -->
    <OrderFormDialog
      v-model:open="formOpen"
      :order="editingOrder"
      :submitting="submitting"
      @submit="handleSubmit"
    />

    <!-- 删除确认弹窗 -->
    <OrderDeleteDialog
      :open="deleteTarget !== null"
      :project-name="deleteTarget?.project_name"
      :deleting="deleting"
      @update:open="(v) => !v && (deleteTarget = null)"
      @confirm="handleDeleteConfirm"
    />

    <!-- 回款管理弹窗（关闭动画期间保留 order，避免内容提前卸载导致关闭闪现） -->
    <PaymentDialog
      :open="paymentsOpen"
      :order="paymentsOrder"
      @update:open="(v) => !v && (paymentsOpen = false)"
    />
  </div>
</template>
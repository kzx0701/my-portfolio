<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Plus, ClipboardList } from '@lucide/vue'
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

const formOpen = ref(false)
const editingOrder = ref<Order | null>(null)
const deleteTarget = ref<Order | null>(null)
const paymentsOpen = ref(false)
const paymentsOrder = ref<Order | null>(null)
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
    } else {
      await store.createOrder(input)
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
    <!-- 统计卡片（三页共用组件） -->
    <StatsCards />

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
      <Button @click="openCreate">
        <Plus class="h-4 w-4" />
        新建订单
      </Button>
    </div>

    <!-- 列表 -->
    <div v-if="store.loading" class="space-y-2">
      <Skeleton v-for="i in 4" :key="i" class="h-12 w-full" />
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
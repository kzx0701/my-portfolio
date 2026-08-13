<script setup lang="ts">
import { Banknote, Pencil, Trash2 } from '@lucide/vue'
import { Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui'
import { useOrdersStore } from '@/modules/orders/store'
import { ORDER_CHANNEL_META, ORDER_STATUS_META, PROJECT_TYPE_META, type Order } from '@/modules/orders/types'

defineProps<{ orders: Order[] }>()

const store = useOrdersStore()

const emit = defineEmits<{
  edit: [order: Order]
  remove: [order: Order]
  payments: [order: Order]
}>()

function formatAmount(amount: number | null): string {
  if (amount === null) return '—'
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(amount)
}

/** 回款金额状态配色：未回款（灰）→ 部分回款（橙）→ 已收满（绿） */
function paidClass(order: Order): string {
  const paid = store.paidTotalOf(order.id)
  if (order.amount === null || paid <= 0) return 'text-muted-foreground'
  if (paid >= order.amount) return 'text-emerald-600 dark:text-emerald-500'
  return 'text-amber-600 dark:text-amber-500'
}
</script>

<template>
  <div class="overflow-hidden rounded-lg border">
    <Table class="table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead class="w-[11.11%]">项目名称</TableHead>
          <TableHead class="w-[11.11%]">客户名称</TableHead>
          <TableHead class="w-[11.11%] whitespace-nowrap">项目类型</TableHead>
          <TableHead class="w-[11.11%] whitespace-nowrap">订单金额</TableHead>
          <TableHead class="w-[11.11%] whitespace-nowrap">回款金额</TableHead>
          <TableHead class="w-[11.11%] whitespace-nowrap">项目周期</TableHead>
          <TableHead class="w-[11.11%] whitespace-nowrap">渠道来源</TableHead>
          <TableHead class="w-[11.11%] whitespace-nowrap">当前阶段</TableHead>
          <TableHead class="w-[11.11%] whitespace-nowrap text-center">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="order in orders" :key="order.id">
          <TableCell class="truncate font-medium" :title="order.project_name">
            {{ order.project_name }}
          </TableCell>
          <TableCell class="truncate text-muted-foreground" :title="order.client_name || undefined">
            {{ order.client_name || '—' }}
          </TableCell>
          <TableCell>
            <Badge
              v-if="order.project_type"
              variant="outline"
              :class="PROJECT_TYPE_META[order.project_type]?.badgeClass ?? undefined"
              class="whitespace-nowrap"
            >
              {{ PROJECT_TYPE_META[order.project_type]?.label ?? order.project_type }}
            </Badge>
            <span v-else class="text-muted-foreground">—</span>
          </TableCell>
          <TableCell class="whitespace-nowrap tabular-nums">{{ formatAmount(order.amount) }}</TableCell>
          <TableCell class="whitespace-nowrap tabular-nums" :class="paidClass(order)">
            {{ formatAmount(store.paidTotalOf(order.id)) }}
          </TableCell>
          <TableCell>
            <div v-if="order.start_date || order.due_date" class="flex flex-col whitespace-nowrap leading-5">
              <span v-if="order.start_date" class="text-muted-foreground">{{ order.start_date.slice(0, 10) }}</span>
              <span v-if="order.due_date" class="text-muted-foreground">{{ order.due_date.slice(0, 10) }}</span>
            </div>
            <span v-else class="text-muted-foreground">—</span>
          </TableCell>
          <TableCell>
            <template v-if="order.channel">
              <span class="inline-flex items-center gap-2 whitespace-nowrap">
                <img
                  :src="ORDER_CHANNEL_META[order.channel].logo"
                  alt=""
                  class="h-6 w-6 shrink-0 rounded-md object-contain"
                />
                <span class="text-muted-foreground">{{ ORDER_CHANNEL_META[order.channel].label }}</span>
              </span>
            </template>
            <span v-else class="text-muted-foreground">—</span>
          </TableCell>
          <TableCell>
            <Badge variant="outline" :class="ORDER_STATUS_META[order.status].badgeClass" class="whitespace-nowrap">
              {{ ORDER_STATUS_META[order.status].label }}
            </Badge>
          </TableCell>
          <TableCell>
            <div class="flex justify-center gap-1 whitespace-nowrap">
              <Button variant="ghost" size="icon" title="回款" @click="emit('payments', order)">
                <Banknote class="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" title="编辑" @click="emit('edit', order)">
                <Pencil class="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" title="删除" @click="emit('remove', order)">
                <Trash2 class="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        <TableRow v-if="orders.length === 0">
          <TableCell colspan="9" class="h-24 text-center text-muted-foreground">
            暂无订单，点击右上角「新建订单」开始。
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
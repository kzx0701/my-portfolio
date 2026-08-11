<script setup lang="ts">
import { Pencil, Trash2 } from '@lucide/vue'
import { Badge, Button, Progress, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui'
import { ORDER_STATUS_META, type Order } from '@/modules/orders/types'

defineProps<{ orders: Order[] }>()

const emit = defineEmits<{
  edit: [order: Order]
  remove: [order: Order]
}>()

function formatAmount(amount: number | null): string {
  if (amount === null) return '—'
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(amount)
}

function formatDate(date: string | null): string {
  if (!date) return '—'
  return date.slice(0, 10)
}
</script>

<template>
  <div class="overflow-hidden rounded-lg border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>项目名称</TableHead>
          <TableHead>客户</TableHead>
          <TableHead class="text-right">金额</TableHead>
          <TableHead>阶段</TableHead>
          <TableHead class="w-[160px]">进度</TableHead>
          <TableHead>截止日期</TableHead>
          <TableHead class="text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="order in orders" :key="order.id">
          <TableCell class="font-medium">{{ order.project_name }}</TableCell>
          <TableCell class="text-muted-foreground">{{ order.client_name || '—' }}</TableCell>
          <TableCell class="text-right tabular-nums">{{ formatAmount(order.amount) }}</TableCell>
          <TableCell>
            <Badge :variant="ORDER_STATUS_META[order.status].variant">
              {{ ORDER_STATUS_META[order.status].label }}
            </Badge>
          </TableCell>
          <TableCell>
            <div class="flex items-center gap-2">
              <Progress :model-value="order.progress" class="flex-1" />
              <span class="w-8 text-right text-xs tabular-nums text-muted-foreground">{{ order.progress }}%</span>
            </div>
          </TableCell>
          <TableCell class="text-muted-foreground">{{ formatDate(order.due_date) }}</TableCell>
          <TableCell>
            <div class="flex justify-end gap-1">
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
          <TableCell colspan="7" class="h-24 text-center text-muted-foreground">
            暂无订单，点击右上角「新建订单」开始。
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
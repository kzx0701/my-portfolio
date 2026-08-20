<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Pencil, Plus, Receipt, RotateCw, Trash2 } from '@lucide/vue'
import { Badge, Button, Select, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui'
import { useAiStore } from '@/modules/ai/store'
import { AiUsageStats, UsageDeleteDialog, UsageFormDialog } from '@/modules/ai/components'
import { type AiUsageRecord, type AiUsageRecordInput, consumptionTypeMeta, paymentMethodMeta, serviceTypeMeta } from '@/modules/ai/types'
import { toast } from '@/lib/toast'

const store = useAiStore()

/** 工具筛选：'all' 表示全部 */
const serviceFilter = ref<'all' | string>('all')

// 筛选变化时重置页码
watch(serviceFilter, () => {
  currentPage.value = 1
})

/** 分页 */
const currentPage = ref(1)
const pageSize = 10

const formOpen = ref(false)
const editingRecord = ref<AiUsageRecord | null>(null)
const deleteTarget = ref<AiUsageRecord | null>(null)
const submitting = ref(false)
const deleting = ref(false)
const refreshing = ref(false)

onMounted(() => {
  store.fetchUsage()
  store.fetchServices()
})

/** 工具选项（含「全部」） */
const filterOptions = computed(() => [
  { value: 'all', label: '全部工具' },
  ...store.services.map((s) => ({ value: s.id, label: s.name })),
])

/** 过滤后的消费记录 */
const filteredUsage = computed(() =>
  serviceFilter.value === 'all'
    ? store.usage
    : store.usage.filter((u) => u.service_id === serviceFilter.value),
)

/** 总页数 */
const totalPages = computed(() => Math.ceil(filteredUsage.value.length / pageSize))

/** 当前页的消费记录 */
const paginatedUsage = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredUsage.value.slice(start, start + pageSize)
})

/** 页码列表（最多显示 5 个页码） */
const pageNumbers = computed(() => {
  const pages: number[] = []
  const total = totalPages.value
  const current = currentPage.value
  
  if (total <= 5) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    let start = Math.max(1, current - 2)
    let end = Math.min(total, start + 4)
    if (end - start < 4) start = Math.max(1, end - 4)
    for (let i = start; i <= end; i++) pages.push(i)
  }
  return pages
})

/** 切换页码 */
function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

/** 工具名映射 */
function serviceName(id: string): string {
  const svc = store.services.find((s) => s.id === id)
  return svc ? serviceTypeMeta(svc.service_type).label : '未知工具'
}

/** 日期展示（YYYY-MM-DD 原样，便于识别） */
function dateLabel(date: string): string {
  return date
}

/** 记录描述（删除确认用） */
function usageLabel(u: AiUsageRecord): string {
  return `${serviceName(u.service_id)} · ${u.usage_date}`
}

/** 金额展示（人民币） */
function amountLabel(u: AiUsageRecord): string {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(u.amount)
}

async function handleRefresh() {
  refreshing.value = true
  try {
    const ok = await store.fetchUsage(true)
    if (ok) toast('数据已刷新', 'success')
    else toast('刷新失败，请重试', 'error')
  } finally {
    refreshing.value = false
  }
}

function openCreate() {
  editingRecord.value = null
  formOpen.value = true
}

function openEdit(record: AiUsageRecord) {
  editingRecord.value = record
  formOpen.value = true
}

async function handleSubmit(input: AiUsageRecordInput) {
  submitting.value = true
  try {
    if (editingRecord.value) {
      await store.updateUsage(editingRecord.value.id, input)
      toast('消费记录已更新', 'success')
    } else {
      await store.createUsage(input)
      toast('消费记录已添加', 'success')
    }
    formOpen.value = false
  } catch (e: any) {
    console.error('保存消费记录失败', e)
    toast(e?.message ?? '保存失败', 'error')
  } finally {
    submitting.value = false
  }
}

async function handleDeleteConfirm() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await store.deleteUsage(deleteTarget.value.id)
    deleteTarget.value = null
    toast('消费记录已删除', 'success')
  } catch (e: any) {
    console.error('删除消费记录失败', e)
    toast(e?.message ?? '删除失败', 'error')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-6">
    <!-- 标题区 -->
    <div class="flex items-center gap-3">
      <div
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-teal-500 text-white shadow-md shadow-sky-500/25"
        :style="{ viewTransitionName: 'vt-ai' }"
      >
        <Receipt class="h-5 w-5" />
      </div>
      <div>
        <h2 class="text-lg font-semibold">消费记录</h2>
      </div>
    </div>

    <!-- 消费统计 -->
    <div v-if="store.usage.length > 0" class="animate-in fade-in slide-in-from-bottom-2 [animation-duration:400ms]">
      <AiUsageStats />
    </div>

    <!-- 记录列表 -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="w-48">
          <Select v-model="serviceFilter" :options="filterOptions" />
        </div>
        <p class="text-sm text-muted-foreground">共 {{ filteredUsage.length }} 条记录</p>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <Button variant="outline" :disabled="refreshing" @click="handleRefresh">
          <RotateCw class="h-4 w-4" :class="refreshing && 'animate-spin'" />
          刷新
        </Button>
        <Button @click="openCreate">
          <Plus class="h-4 w-4" />
          添加消费
        </Button>
      </div>
    </div>

    <div v-if="store.loading && store.usage.length === 0" class="space-y-2">
      <Skeleton v-for="i in 5" :key="i" class="h-10 rounded-md" />
    </div>
    <div v-else-if="store.usage.length === 0" class="rounded-lg border border-dashed py-16 text-center">
      <Receipt class="mx-auto h-10 w-10 text-muted-foreground/60" />
      <p class="mt-3 font-medium">还没有消费记录</p>
      <p class="mt-1 text-sm text-muted-foreground">手动添加 AI 工具的消费金额（¥），统计将自动汇总</p>
      <Button class="mt-4" @click="openCreate">
        <Plus class="h-4 w-4" />
        添加第一条记录
      </Button>
    </div>
    <div v-else class="animate-in overflow-hidden rounded-lg border bg-card fade-in slide-in-from-bottom-2 [animation-duration:400ms]">
      <Table class="table-fixed">
        <colgroup>
          <col width="13%">
          <col width="13%">
          <col width="13%">
          <col width="13%">
          <col width="13%">
          <col width="15%">
          <col width="13%">
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead class="whitespace-nowrap">日期</TableHead>
            <TableHead class="whitespace-nowrap">工具</TableHead>
            <TableHead class="whitespace-nowrap">消费金额</TableHead>
            <TableHead class="whitespace-nowrap">消费类型</TableHead>
            <TableHead class="whitespace-nowrap">支付方式</TableHead>
            <TableHead class="whitespace-nowrap">备注</TableHead>
            <TableHead class="whitespace-nowrap text-center">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="u in paginatedUsage" :key="u.id">
            <TableCell class="whitespace-nowrap tabular-nums">{{ dateLabel(u.usage_date) }}</TableCell>
            <TableCell class="truncate font-medium" :title="serviceName(u.service_id)">
              {{ serviceName(u.service_id) }}
            </TableCell>
            <TableCell class="whitespace-nowrap font-medium tabular-nums">{{ amountLabel(u) }}</TableCell>
            <TableCell class="whitespace-nowrap">
              <template v-if="consumptionTypeMeta(u.consumption_type)">
                <Badge variant="outline" :class="consumptionTypeMeta(u.consumption_type)!.badgeClass">
                  {{ consumptionTypeMeta(u.consumption_type)!.label }}
                </Badge>
              </template>
              <span v-else class="text-muted-foreground">—</span>
            </TableCell>
            <TableCell class="whitespace-nowrap">
              <template v-if="paymentMethodMeta(u.payment_method)">
                <span class="inline-flex items-center gap-2 whitespace-nowrap">
                  <img
                    :src="paymentMethodMeta(u.payment_method)!.logo"
                    alt=""
                    class="h-6 w-6 shrink-0 rounded-md object-contain"
                  />
                  <span class="text-muted-foreground">{{ paymentMethodMeta(u.payment_method)!.label }}</span>
                </span>
              </template>
              <span v-else class="text-muted-foreground">—</span>
            </TableCell>
            <TableCell class="truncate text-muted-foreground" :title="u.note || undefined">
              {{ u.note || '—' }}
            </TableCell>
            <TableCell>
              <div class="flex justify-center gap-1 whitespace-nowrap">
                <Button variant="ghost" size="icon" title="编辑" @click="openEdit(u)">
                  <Pencil class="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" title="删除" @click="deleteTarget = u">
                  <Trash2 class="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-if="filteredUsage.length === 0">
            <TableCell colspan="7" class="h-24 text-center text-muted-foreground">
              没有符合筛选条件的消费记录
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      
      <!-- 分页 -->
      <div v-if="totalPages > 1" class="flex items-center justify-between border-t px-4 py-3">
        <p class="text-sm text-muted-foreground">
          第 {{ (currentPage - 1) * pageSize + 1 }}-{{ Math.min(currentPage * pageSize, filteredUsage.length) }} 条，共 {{ filteredUsage.length }} 条
        </p>
        <div class="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            :disabled="currentPage === 1"
            @click="goToPage(currentPage - 1)"
          >
            上一页
          </Button>
          <Button
            v-for="page in pageNumbers"
            :key="page"
            :variant="page === currentPage ? 'default' : 'outline'"
            size="sm"
            class="min-w-[2.5rem]"
            @click="goToPage(page)"
          >
            {{ page }}
          </Button>
          <Button
            variant="outline"
            size="sm"
            :disabled="currentPage === totalPages"
            @click="goToPage(currentPage + 1)"
          >
            下一页
          </Button>
        </div>
      </div>
    </div>

    <!-- 新建/编辑弹窗 -->
    <UsageFormDialog
      v-model:open="formOpen"
      :record="editingRecord"
      :submitting="submitting"
      @submit="handleSubmit"
    />

    <!-- 删除确认弹窗 -->
    <UsageDeleteDialog
      :open="deleteTarget !== null"
      :usage-label="deleteTarget ? usageLabel(deleteTarget) : undefined"
      :deleting="deleting"
      @update:open="(v) => !v && (deleteTarget = null)"
      @confirm="handleDeleteConfirm"
    />
  </div>
</template>

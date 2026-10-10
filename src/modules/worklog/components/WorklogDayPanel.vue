<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ArrowUp, BadgeCheck, ListTodo, LoaderCircle, Plus } from '@lucide/vue'
import { Badge, Button, Input, Progress, Skeleton } from '@/components/ui'
import { toast } from '@/lib/toast'
import { formatMonthDay, formatWeekday, toDateKey } from '@/modules/worklog/date'
import { useWorklogStore } from '@/modules/worklog/store'
import type { WorkLogItem, WorkLogItemInput, WorkLogStatus } from '@/modules/worklog/types'
import WorklogDeleteDialog from './WorklogDeleteDialog.vue'
import WorklogFormDialog from './WorklogFormDialog.vue'
import WorklogTaskRow from './WorklogTaskRow.vue'

const props = defineProps<{
  workDate: string
  items: WorkLogItem[]
  loading?: boolean
}>()

const store = useWorklogStore()
const quickTitle = ref('')
const creating = ref(false)
const editingItem = ref<WorkLogItem | null>(null)
const formOpen = ref(false)
const formSubmitting = ref(false)
const deleteTarget = ref<WorkLogItem | null>(null)
const deleting = ref(false)
const busyIds = ref<Set<string>>(new Set())
const celebratingIds = ref<Set<string>>(new Set())
const celebrationTimers = new Map<string, ReturnType<typeof setTimeout>>()
/** 同一次范围请求（切换日期）里，只有当天确实没有数据时才用骨架屏，避免闪现 */
const showSkeleton = computed(() => props.loading && props.items.length === 0)

const dateLabel = computed(() => formatMonthDay(props.workDate))
const weekdayLabel = computed(() => formatWeekday(props.workDate))
const isToday = computed(() => props.workDate === toDateKey(new Date()))

const completedCount = computed(() => props.items.filter((item) => item.status === 'completed').length)
const pendingCount = computed(() => props.items.filter((item) => item.status === 'pending').length)
/** 已取消不计入完成率分母 */
const actionableCount = computed(() => completedCount.value + pendingCount.value)
const completionRate = computed(() =>
  actionableCount.value === 0
    ? 0
    : Math.round((completedCount.value / actionableCount.value) * 100),
)

// 列表顺序由 store.itemsForDate 保证（待办 → 已完成 → 已取消，组内按创建时间），
// 这里不再做二次分组：待办/已完成的区分完全交给行首勾选框自身表达。

watch(
  () => props.workDate,
  () => {
    quickTitle.value = ''
  },
)

onBeforeUnmount(() => {
  for (const timer of celebrationTimers.values()) clearTimeout(timer)
})

function setBusy(id: string, busy: boolean) {
  const next = new Set(busyIds.value)
  if (busy) next.add(id)
  else next.delete(id)
  busyIds.value = next
}

/** 完成反馈：短暂高亮整行（配合行自身的 transition-colors，无 keyframes） */
function celebrate(id: string) {
  const next = new Set(celebratingIds.value)
  next.add(id)
  celebratingIds.value = next
  const previous = celebrationTimers.get(id)
  if (previous) clearTimeout(previous)
  celebrationTimers.set(
    id,
    setTimeout(() => {
      const settled = new Set(celebratingIds.value)
      settled.delete(id)
      celebratingIds.value = settled
      celebrationTimers.delete(id)
    }, 850),
  )
}

async function handleQuickAdd() {
  const title = quickTitle.value.trim()
  if (!title || creating.value) return
  creating.value = true
  try {
    await store.createItem({ work_date: props.workDate, title, description: null })
    quickTitle.value = ''
  } catch (caught: any) {
    toast(caught?.message ?? '添加失败', 'error')
  } finally {
    creating.value = false
  }
}

function openEdit(item: WorkLogItem) {
  editingItem.value = item
  formOpen.value = true
}

async function handleEditSubmit(input: WorkLogItemInput) {
  if (!editingItem.value) return
  formSubmitting.value = true
  try {
    await store.updateItem(editingItem.value.id, input)
    formOpen.value = false
    toast('事项已更新', 'success')
  } catch (caught: any) {
    toast(caught?.message ?? '保存失败', 'error')
  } finally {
    formSubmitting.value = false
  }
}

async function handleStatus(item: WorkLogItem, status: WorkLogStatus) {
  if (busyIds.value.has(item.id)) return
  setBusy(item.id, true)
  try {
    await store.changeStatus(item.id, status)
    if (status === 'completed') celebrate(item.id)
  } catch (caught: any) {
    toast(caught?.message ?? '更新状态失败', 'error')
  } finally {
    setBusy(item.id, false)
  }
}

function toggleStatus(item: WorkLogItem) {
  void handleStatus(item, item.status === 'pending' ? 'completed' : 'pending')
}

async function handleDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await store.deleteItem(deleteTarget.value.id)
    deleteTarget.value = null
    toast('事项已删除', 'success')
  } catch (caught: any) {
    toast(caught?.message ?? '删除失败', 'error')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <aside class="flex h-full min-h-[36rem] flex-col overflow-hidden bg-card">
    <!-- 头部：日期 + 星期 + 当天进度（进度行常驻，保证切换日期时高度不跳动） -->
    <header class="border-b px-5 pb-4 pt-5">
      <Transition
        mode="out-in"
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-1"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="opacity-0 translate-y-1"
      >
        <div :key="workDate">
          <div class="flex items-start justify-between gap-3">
            <h3 class="flex items-baseline gap-2">
              <span class="text-xl font-semibold tracking-tight tabular-nums">{{ dateLabel }}</span>
              <span class="text-sm text-muted-foreground">{{ weekdayLabel }}</span>
            </h3>
            <Badge
              v-if="isToday"
              variant="outline"
              class="shrink-0 border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300"
            >
              今天
            </Badge>
          </div>

          <div class="mt-3 flex items-center gap-2.5">
            <Progress
              :model-value="completionRate"
              class="h-1 flex-1 bg-muted"
              indicator-class="bg-gradient-to-r from-sky-500 to-teal-500"
            />
            <span
              v-if="actionableCount"
              class="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground"
            >
              已完成 {{ completedCount }}/{{ actionableCount }}
            </span>
            <span v-else class="shrink-0 text-[11px] text-muted-foreground">暂无事项</span>
          </div>
        </div>
      </Transition>
    </header>

    <!-- 快速添加 -->
    <div class="border-b px-5 py-3.5">
      <form
        class="flex items-center gap-2 rounded-xl border bg-background px-2.5 py-1.5 transition-colors duration-200 focus-within:border-sky-500/50 focus-within:ring-2 focus-within:ring-sky-500/15"
        @submit.prevent="handleQuickAdd"
      >
        <Plus class="h-4 w-4 shrink-0 text-muted-foreground" />
        <Input
          v-model="quickTitle"
          maxlength="200"
          placeholder="添加事项…"
          :disabled="creating"
          class="h-8 flex-1 border-0 bg-transparent px-0 text-[13px] shadow-none focus-visible:ring-0"
        />
        <Button
          type="submit"
          size="icon"
          class="h-7 w-7 shrink-0 rounded-lg transition-transform duration-200 active:scale-90"
          :disabled="!quickTitle.trim() || creating"
          aria-label="添加事项"
        >
          <LoaderCircle v-if="creating" class="h-3.5 w-3.5 animate-spin" />
          <ArrowUp v-else class="h-3.5 w-3.5" stroke-width="2.5" />
        </Button>
      </form>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto px-3.5 py-3">
      <Transition
        mode="out-in"
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-1.5"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="opacity-0 -translate-y-1.5"
      >
        <div v-if="showSkeleton" key="loading" class="space-y-2 px-1.5">
          <Skeleton v-for="row in 5" :key="row" class="h-9 rounded-lg" />
        </div>

        <ul v-else-if="items.length" :key="workDate" class="space-y-0.5">
          <TransitionGroup
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 -translate-y-1"
            leave-active-class="transition duration-150 ease-in"
            leave-to-class="opacity-0 translate-x-2"
            move-class="transition duration-200 ease-out"
          >
            <WorklogTaskRow
              v-for="item in items"
              :key="item.id"
              :item="item"
              :busy="busyIds.has(item.id)"
              :celebrating="celebratingIds.has(item.id)"
              @toggle="toggleStatus"
              @cancel="(target) => handleStatus(target, 'cancelled')"
              @edit="openEdit"
              @delete="deleteTarget = $event"
            />
          </TransitionGroup>
        </ul>

        <div v-else key="empty" class="flex min-h-[18rem] items-center justify-center px-2">
          <div
            class="flex w-full flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-10 text-center"
          >
            <ListTodo class="h-8 w-8 text-muted-foreground/50" />
            <div class="space-y-1">
              <p class="text-sm font-medium">这一天还没有记录</p>
              <p class="text-xs text-muted-foreground">把要做的事写在上面，完成后勾选它</p>
            </div>
          </div>
        </div>
      </Transition>

      <!-- 全部处理完的轻提示，不占用独立区块 -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="opacity-0"
      >
        <p
          v-if="items.length && !pendingCount && !showSkeleton"
          class="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground"
        >
          <BadgeCheck class="h-3.5 w-3.5 text-emerald-500" />
          这一天的事项都完成了
        </p>
      </Transition>
    </div>
  </aside>

  <WorklogFormDialog
    v-model:open="formOpen"
    :item="editingItem"
    :work-date="workDate"
    :submitting="formSubmitting"
    @submit="handleEditSubmit"
  />
  <WorklogDeleteDialog
    :open="!!deleteTarget"
    :title="deleteTarget?.title"
    :deleting="deleting"
    @update:open="(open) => { if (!open) deleteTarget = null }"
    @confirm="handleDelete"
  />
</template>

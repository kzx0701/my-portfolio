<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ArrowUp, CheckCheck, ListTodo, LoaderCircle, Plus } from '@lucide/vue'
import { Button, Input, Progress, Skeleton } from '@/components/ui'
import { toast } from '@/lib/toast'
import { formatLongDate, formatWeekday, fromDateKey, toDateKey } from '@/modules/worklog/date'
import { useWorklogStore } from '@/modules/worklog/store'
import type {
  WorkLogItem,
  WorkLogItemInput,
  WorkLogStatus,
} from '@/modules/worklog/types'
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

const selectedDate = computed(() => fromDateKey(props.workDate))
const monthDay = computed(
  () => `${String(selectedDate.value.getMonth() + 1).padStart(2, '0')}.${String(selectedDate.value.getDate()).padStart(2, '0')}`,
)
const year = computed(() => selectedDate.value.getFullYear())
const isToday = computed(() => props.workDate === toDateKey(new Date()))
const pendingItems = computed(() => props.items.filter((item) => item.status === 'pending'))
const completedItems = computed(() => props.items.filter((item) => item.status === 'completed'))
const cancelledItems = computed(() => props.items.filter((item) => item.status === 'cancelled'))
const pendingCount = computed(() => pendingItems.value.length)
const completedCount = computed(() => completedItems.value.length)
const actionableCount = computed(() => pendingCount.value + completedCount.value)
const completionRate = computed(() =>
  actionableCount.value === 0 ? 0 : Math.round((completedCount.value / actionableCount.value) * 100),
)

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
    toast('事项已添加', 'success')
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
    if (status === 'completed') {
      celebrate(item.id)
      toast('事项已完成', 'success')
    }
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
  <aside class="daily-log relative flex h-full min-h-[38rem] flex-col overflow-hidden bg-card">
    <header class="daily-log__header relative border-b px-5 pb-5 pt-6 sm:px-6">
      <Transition name="date-swap" mode="out-in">
        <div :key="workDate">
          <div class="flex items-center justify-between gap-3">
            <p class="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
              <span class="h-1.5 w-1.5 rounded-full bg-sky-500" />
              Daily log / {{ year }}
            </p>
            <span v-if="isToday" class="rounded-full border border-sky-500/20 bg-sky-500/[0.07] px-2 py-1 text-[9px] font-bold tracking-wide text-sky-700 dark:text-sky-300">
              TODAY
            </span>
          </div>

          <div class="mt-3 flex items-end justify-between gap-4">
            <div>
              <p class="daily-log__date text-[2.85rem] font-semibold leading-none tracking-[-0.075em] text-foreground">
                {{ monthDay }}
              </p>
              <p class="mt-2 text-xs text-muted-foreground">
                <strong class="font-semibold text-foreground">{{ formatWeekday(workDate) }}</strong>
                <span class="mx-1.5 text-border">/</span>{{ formatLongDate(workDate) }}
              </p>
            </div>

            <div class="mb-0.5 min-w-20 text-right">
              <p class="text-2xl font-semibold tabular-nums tracking-[-0.04em]">{{ pendingCount }}</p>
              <p class="mt-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">OPEN TASKS</p>
            </div>
          </div>
        </div>
      </Transition>

      <div class="mt-5">
        <div class="mb-2 flex items-center justify-between text-[10px] font-medium text-muted-foreground">
          <span>{{ completedCount }} 已完成 · {{ pendingCount }} 待处理</span>
          <span class="font-bold tabular-nums text-foreground">{{ completionRate }}%</span>
        </div>
        <Progress
          :model-value="completionRate"
          class="h-1 bg-muted"
          indicator-class="bg-sky-500"
        />
      </div>
    </header>

    <div class="border-b px-5 py-4 sm:px-6">
      <form
        class="command-input group relative flex items-center gap-2 rounded-xl border bg-background px-2 py-2 shadow-[0_8px_30px_-24px_rgba(15,23,42,0.65)] transition-all duration-300 focus-within:-translate-y-px focus-within:border-sky-500/45 focus-within:shadow-[0_12px_32px_-22px_rgba(14,165,233,0.7)]"
        :class="creating && 'command-input--busy'"
        @submit.prevent="handleQuickAdd"
      >
        <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-focus-within:bg-sky-500/10 group-focus-within:text-sky-600 dark:group-focus-within:text-sky-400">
          <Plus class="h-3.5 w-3.5" />
        </span>
        <Input
          v-model="quickTitle"
          maxlength="200"
          :placeholder="`添加 ${monthDay} 的事项`"
          :disabled="creating"
          class="h-8 border-0 bg-transparent px-0 text-[13px] shadow-none focus-visible:ring-0"
        />
        <Button
          type="submit"
          size="icon"
          class="h-7 w-7 rounded-lg bg-foreground text-background shadow-none transition-all duration-200 hover:scale-105 hover:bg-foreground/85 active:scale-90"
          :disabled="!quickTitle.trim() || creating"
          aria-label="添加事项"
        >
          <LoaderCircle v-if="creating" class="h-3.5 w-3.5 animate-spin" />
          <ArrowUp v-else class="h-3.5 w-3.5" stroke-width="2.5" />
        </Button>
      </form>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
      <Transition name="content-swap" mode="out-in">
        <div v-if="loading" key="loading" class="space-y-6" aria-label="正在加载当天事项">
          <section v-for="section in 2" :key="section">
            <div class="mb-1 flex items-center justify-between">
              <Skeleton class="h-3 w-16" />
              <Skeleton class="h-3 w-6" />
            </div>
            <div v-for="row in section === 1 ? 3 : 2" :key="row" class="flex gap-3.5 py-3.5">
              <div class="relative flex w-7 justify-center">
                <Skeleton class="h-7 w-7 rounded-[0.6rem]" />
                <span v-if="row < (section === 1 ? 3 : 2)" class="absolute bottom-[-0.9rem] top-8 w-px bg-border/70" />
              </div>
              <div class="flex-1 space-y-2 border-b pb-3.5">
                <Skeleton class="h-3.5" :class="row % 2 ? 'w-3/4' : 'w-2/3'" />
                <Skeleton class="h-2.5 w-20" />
              </div>
            </div>
          </section>
        </div>

        <div v-else-if="items.length" key="items" class="space-y-6">
          <Transition name="section-rise">
            <section v-if="pendingItems.length">
              <div class="flex items-center justify-between border-b border-border/80 pb-2">
                <h4 class="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground">待处理</h4>
                <span class="text-[10px] font-bold tabular-nums text-amber-600 dark:text-amber-400">{{ pendingItems.length }} OPEN</span>
              </div>
              <TransitionGroup name="task-flow" tag="ul">
                <WorklogTaskRow
                  v-for="item in pendingItems"
                  :key="item.id"
                  :item="item"
                  :busy="busyIds.has(item.id)"
                  @toggle="toggleStatus"
                  @cancel="(target) => handleStatus(target, 'cancelled')"
                  @edit="openEdit"
                  @delete="deleteTarget = $event"
                />
              </TransitionGroup>
            </section>
          </Transition>

          <Transition name="section-rise">
            <section v-if="completedItems.length">
              <div class="flex items-center justify-between border-b border-border/80 pb-2">
                <h4 class="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground">已完成</h4>
                <span class="text-[10px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{{ completedItems.length }} DONE</span>
              </div>
              <TransitionGroup name="task-flow" tag="ul">
                <WorklogTaskRow
                  v-for="item in completedItems"
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
            </section>
          </Transition>

          <Transition name="section-rise">
            <section v-if="cancelledItems.length">
              <div class="flex items-center justify-between border-b border-border/80 pb-2">
                <h4 class="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">已取消</h4>
                <span class="text-[10px] font-bold tabular-nums text-muted-foreground">{{ cancelledItems.length }} SKIPPED</span>
              </div>
              <TransitionGroup name="task-flow" tag="ul">
                <WorklogTaskRow
                  v-for="item in cancelledItems"
                  :key="item.id"
                  :item="item"
                  :busy="busyIds.has(item.id)"
                  @toggle="toggleStatus"
                  @cancel="(target) => handleStatus(target, 'cancelled')"
                  @edit="openEdit"
                  @delete="deleteTarget = $event"
                />
              </TransitionGroup>
            </section>
          </Transition>
        </div>

        <div v-else key="empty" class="flex min-h-[22rem] flex-col items-center justify-center text-center">
          <div class="empty-mark flex h-14 w-14 items-center justify-center rounded-2xl border bg-background text-muted-foreground shadow-sm">
            <ListTodo class="h-5 w-5" />
          </div>
          <p class="mt-5 text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">No tasks</p>
          <p class="mt-2 text-sm font-semibold">这一天保持空白</p>
          <p class="mt-1.5 max-w-52 text-xs leading-5 text-muted-foreground">需要安排时，从上方输入第一件事。</p>
        </div>
      </Transition>
    </div>

    <Transition name="footer-rise">
      <footer v-if="items.length && !loading" class="flex items-center justify-between border-t bg-muted/25 px-5 py-3 text-[10px] font-medium text-muted-foreground sm:px-6">
        <span class="inline-flex items-center gap-1.5">
          <CheckCheck class="h-3.5 w-3.5" :class="pendingCount === 0 && 'text-emerald-500'" />
          {{ pendingCount ? `仍有 ${pendingCount} 项待处理` : '当天事项已全部处理' }}
        </span>
        <span class="tabular-nums">{{ completedCount }}/{{ actionableCount }}</span>
      </footer>
    </Transition>
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

<style scoped>
.daily-log__header::after {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 2px;
  background: linear-gradient(90deg, rgb(14 165 233), rgb(14 165 233 / 0.15) 36%, transparent 70%);
}
.daily-log__date {
  font-variant-numeric: tabular-nums;
}
.command-input::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  transform: translateX(-110%);
  background: linear-gradient(90deg, transparent, rgb(125 211 252 / 0.12), transparent);
}
.command-input--busy::after {
  animation: command-shimmer 1.1s ease-in-out infinite;
}
.date-swap-enter-active,
.date-swap-leave-active,
.content-swap-enter-active,
.content-swap-leave-active,
.section-rise-enter-active,
.section-rise-leave-active,
.footer-rise-enter-active,
.footer-rise-leave-active {
  transition:
    opacity 230ms ease,
    transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
}
.date-swap-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.date-swap-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
.content-swap-enter-from,
.section-rise-enter-from,
.footer-rise-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.content-swap-leave-to,
.section-rise-leave-to,
.footer-rise-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
.task-flow-enter-active,
.task-flow-leave-active,
.task-flow-move {
  transition:
    opacity 260ms ease,
    transform 340ms cubic-bezier(0.16, 1, 0.3, 1);
}
.task-flow-enter-from {
  opacity: 0;
  transform: translateY(8px) scale(0.99);
}
.task-flow-leave-to {
  opacity: 0;
  transform: translateX(12px);
}
.empty-mark {
  animation: empty-mark-in 420ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
@keyframes command-shimmer {
  to { transform: translateX(110%); }
}
@keyframes empty-mark-in {
  from { opacity: 0; transform: scale(0.8) rotate(-5deg); }
}
@media (prefers-reduced-motion: reduce) {
  .command-input--busy::after,
  .empty-mark {
    animation: none;
  }
  .date-swap-enter-active,
  .date-swap-leave-active,
  .content-swap-enter-active,
  .content-swap-leave-active,
  .section-rise-enter-active,
  .section-rise-leave-active,
  .footer-rise-enter-active,
  .footer-rise-leave-active,
  .task-flow-enter-active,
  .task-flow-leave-active,
  .task-flow-move {
    transition: none;
  }
}
</style>

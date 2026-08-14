<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { CircleCheck, CircleX, Pencil, Plus, Target, Trash2 } from '@lucide/vue'
import {
  Badge,
  Button,
  Progress,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui'
import { cn } from '@/lib/utils'
import { useHealthStore } from '@/modules/health/store'
import { HealthGoalFormDialog, HealthGoalDeleteDialog } from '@/modules/health/components'
import {
  GOAL_STATUS_META,
  GOAL_TYPE_META,
  calcGoalProgress,
  goalDaysLeftLabel,
  goalProgressStyle,
  type GoalProgress,
  type HealthGoal,
  type HealthGoalInput,
} from '@/modules/health/types'
import { toast } from '@/lib/toast'

type GoalTab = 'all' | 'in_progress' | 'completed' | 'cancelled'

const store = useHealthStore()

/** 目标是否已加载完成（区分「加载中」与「无目标」） */
const loaded = ref(false)
const tab = ref<GoalTab>('all')
const formOpen = ref(false)
const editingGoal = ref<HealthGoal | null>(null)
const deleteTarget = ref<HealthGoal | null>(null)
const submitting = ref(false)
const deleting = ref(false)

onMounted(async () => {
  // fetchRecords 提供「当前体重」（目标进度用）
  await Promise.all([store.fetchGoals(), store.fetchRecords()])
  loaded.value = true
})

/** 最近一次体重（records 已按 record_date 倒序，取第一条有体重的） */
const latestWeight = computed<number | null>(() => {
  for (const r of store.records) {
    if (r.weight_kg !== null) return r.weight_kg
  }
  return null
})

/** 各状态数量（顶部统计卡） */
const counts = computed(() => {
  const c = { all: store.goals.length, in_progress: 0, completed: 0, cancelled: 0 }
  for (const g of store.goals) c[g.status] += 1
  return c
})

/** 顶部统计卡配置（点击切换筛选；accent/icon 渐变与语义色对应） */
const statCards = computed(() => [
  {
    key: 'all' as GoalTab,
    title: '总目标',
    value: counts.value.all,
    icon: Target,
    iconClass: 'bg-gradient-to-br from-sky-400 to-blue-500',
    accentClass: 'bg-linear-to-r from-sky-400 to-blue-500',
  },
  {
    key: 'in_progress' as GoalTab,
    title: '进行中',
    value: counts.value.in_progress,
    icon: CircleCheck,
    iconClass: 'bg-gradient-to-br from-indigo-400 to-indigo-600',
    accentClass: 'bg-linear-to-r from-indigo-400 to-indigo-600',
  },
  {
    key: 'completed' as GoalTab,
    title: '已完成',
    value: counts.value.completed,
    icon: CircleCheck,
    iconClass: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
    accentClass: 'bg-linear-to-r from-emerald-400 to-emerald-600',
  },
])

/** 按当前筛选展示的目标 */
const filteredGoals = computed(() => {
  if (tab.value === 'all') return store.goals
  return store.goals.filter((g) => g.status === tab.value)
})

function goalTypeLabel(g: HealthGoal): string {
  return g.goal_type ? GOAL_TYPE_META[g.goal_type].label : '未设定类型'
}

function goalProgress(g: HealthGoal): GoalProgress {
  return calcGoalProgress(g, latestWeight.value)
}

/** 变化文案：已减 / 已增 / 持平 */
function changedLabel(changed: number | null): string {
  if (changed === null) return ''
  if (changed === 0) return '体重持平'
  return changed < 0 ? `已减 ${Math.abs(changed)} kg` : `已增 ${changed} kg`
}

/** 本地日期 YYYY-MM-DD（标记完成时写入达成日期） */
function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 体重路线文案：起始 → 目标 */
function weightRoute(g: HealthGoal): string {
  const p = goalProgress(g)
  if (p.start !== null && p.target !== null) return `${p.start} → ${p.target} kg`
  if (p.start !== null) return `${p.start} kg`
  if (p.target !== null) return `→ ${p.target} kg`
  return '—'
}

function openCreate() {
  editingGoal.value = null
  formOpen.value = true
}

function openEdit(g: HealthGoal) {
  editingGoal.value = g
  formOpen.value = true
}

async function handleSubmit(input: HealthGoalInput) {
  submitting.value = true
  try {
    if (editingGoal.value) {
      await store.updateGoal(editingGoal.value.id, input)
      toast('目标已更新', 'success')
    } else {
      await store.createGoal(input)
      toast('目标已创建', 'success')
    }
    formOpen.value = false
  } catch (e: any) {
    console.error('保存目标失败', e)
    toast(e?.message ?? '保存失败', 'error')
  } finally {
    submitting.value = false
  }
}

/** 状态流转：标记完成（自动记录达成日期为今天）/ 取消（清空达成日期） */
async function setStatus(g: HealthGoal, status: HealthGoal['status']) {
  try {
    const patch: { status: HealthGoal['status']; achieved_date?: string | null } = { status }
    if (status === 'completed') patch.achieved_date = todayStr()
    if (status === 'cancelled') patch.achieved_date = null
    await store.updateGoal(g.id, patch)
    toast('目标状态已更新', 'success')
  } catch (e: any) {
    console.error('更新目标状态失败', e)
    toast(e?.message ?? '操作失败', 'error')
  }
}

async function handleDeleteConfirm() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await store.deleteGoal(deleteTarget.value.id)
    deleteTarget.value = null
    toast('目标已删除', 'success')
  } catch (e: any) {
    console.error('删除目标失败', e)
    toast(e?.message ?? '删除失败', 'error')
  } finally {
    deleting.value = false
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
          :style="{ viewTransitionName: 'vt-health' }"
        >
          <Target class="h-5 w-5" />
        </div>
        <div>
          <h2 class="text-lg font-semibold">健康目标</h2>
        </div>
      </div>
      <Button class="shrink-0" @click="openCreate">
        <Plus class="h-4 w-4" />
        新建目标
      </Button>
    </div>

    <template v-if="!loaded">
      <!-- 加载中：统计卡骨架 + 表格骨架 -->
      <div class="grid gap-4 sm:grid-cols-3">
        <Skeleton v-for="i in 3" :key="i" class="h-24 rounded-xl" />
      </div>
      <div class="overflow-hidden rounded-lg border bg-card">
        <div v-for="r in 4" :key="r" class="flex h-12 items-center gap-4 border-b px-4 last:border-0">
          <Skeleton v-for="c in 6" :key="c" class="h-4 flex-1" />
        </div>
      </div>
    </template>

    <template v-else>
      <!-- 顶部统计卡（无边框 + 顶部渐变条作为视觉边界，避免边框线与彩条双线；点击切换筛选，选中高亮） -->
      <div class="grid animate-in gap-4 fade-in slide-in-from-bottom-2 [animation-duration:400ms] sm:grid-cols-3">
        <button
          v-for="s in statCards"
          :key="s.key"
          class="group relative overflow-hidden rounded-xl bg-card p-5 pb-6 pt-6 text-left shadow-sm transition-all hover:shadow-md hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          :class="tab === s.key && 'ring-1 ring-primary/40'"
          @click="tab = s.key"
        >
          <div :class="cn('absolute inset-x-0 top-0 h-1', s.accentClass)" />
          <div class="flex items-center gap-4">
            <div
              :class="
                cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md transition-transform group-hover:scale-105',
                  s.iconClass,
                )
              "
            >
              <component :is="s.icon" class="h-5 w-5" />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium text-muted-foreground">{{ s.title }}</p>
              <p class="mt-0.5 text-2xl font-bold tabular-nums tracking-tight">{{ s.value }}</p>
            </div>
          </div>
        </button>
      </div>

      <!-- 目标列表（表格，延迟入场） -->
      <div
        v-if="filteredGoals.length > 0"
        class="overflow-hidden animate-in rounded-lg border fade-in slide-in-from-bottom-2 [animation-duration:400ms] [animation-delay:80ms]"
      >
        <Table class="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead class="w-[12%]">目标类型</TableHead>
              <TableHead class="w-[13%] whitespace-nowrap">起始 → 目标</TableHead>
              <TableHead class="w-[12%] whitespace-nowrap">当前体重</TableHead>
              <TableHead class="w-[12%] whitespace-nowrap">目标日期</TableHead>
              <TableHead class="w-[13%] whitespace-nowrap">达成日期</TableHead>
              <TableHead class="w-[16%] whitespace-nowrap">目标进度</TableHead>
              <TableHead class="w-[9%] whitespace-nowrap">状态</TableHead>
              <TableHead class="w-[13%] whitespace-nowrap text-center">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="g in filteredGoals" :key="g.id">
              <TableCell class="whitespace-nowrap font-medium">{{ goalTypeLabel(g) }}</TableCell>
              <TableCell class="whitespace-nowrap tabular-nums">
                {{ weightRoute(g) }}
              </TableCell>
              <!-- 当前体重（含已减/已增差值） -->
              <TableCell class="whitespace-nowrap">
                <template v-if="goalProgress(g).current !== null">
                  <p class="font-medium tabular-nums">{{ goalProgress(g).current }} kg</p>
                  <p v-if="goalProgress(g).changed !== null" class="text-xs text-muted-foreground">
                    {{ changedLabel(goalProgress(g).changed) }}
                  </p>
                </template>
                <span v-else class="text-muted-foreground">—</span>
              </TableCell>
              <TableCell class="whitespace-nowrap">
                <span v-if="g.target_date" class="text-sm tabular-nums">{{ g.target_date }}</span>
                <span v-else class="text-muted-foreground">—</span>
              </TableCell>
              <!-- 达成日期：已完成显示实际达成日；进行中显示倒计时（剩余/超出） -->
              <TableCell class="whitespace-nowrap">
                <template v-if="g.status === 'completed' && g.achieved_date">
                  <p class="text-sm font-medium tabular-nums text-emerald-600 dark:text-emerald-500">
                    {{ g.achieved_date }}
                  </p>
                </template>
                <template v-else-if="g.status === 'in_progress' && g.target_date">
                  <p
                    class="text-sm tabular-nums"
                    :class="(goalProgress(g).daysLeft ?? 0) < 0 ? 'text-red-500' : 'text-muted-foreground'"
                  >
                    {{ goalDaysLeftLabel(goalProgress(g).daysLeft) }}
                  </p>
                </template>
                <span v-else class="text-muted-foreground">—</span>
              </TableCell>
              <TableCell>
                <div v-if="goalProgress(g).start !== null && goalProgress(g).target !== null" class="flex items-center gap-2">
                  <!-- 渐变进度条：颜色随进度滑动（红→橙→黄→绿），越接近 100% 越绿 -->
                  <Progress
                    :model-value="goalProgress(g).progress ?? 0"
                    :indicator-style="goalProgressStyle(goalProgress(g).progress)"
                    class="h-1.5 flex-1"
                  />
                  <span class="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                    {{ goalProgress(g).progress }}%
                  </span>
                </div>
                <span v-else class="text-xs text-muted-foreground">—</span>
              </TableCell>
              <TableCell>
                <Badge variant="outline" :class="GOAL_STATUS_META[g.status].badgeClass" class="whitespace-nowrap">
                  {{ GOAL_STATUS_META[g.status].label }}
                </Badge>
              </TableCell>
              <TableCell>
                <div class="flex justify-center gap-0.5 whitespace-nowrap">
                  <template v-if="g.status === 'in_progress'">
                    <Button variant="ghost" size="icon" class="h-7 w-7" title="标记完成" @click="setStatus(g, 'completed')">
                      <CircleCheck class="h-4 w-4 text-emerald-500" />
                    </Button>
                    <Button variant="ghost" size="icon" class="h-7 w-7" title="取消目标" @click="setStatus(g, 'cancelled')">
                      <CircleX class="h-4 w-4" />
                    </Button>
                  </template>
                  <Button variant="ghost" size="icon" class="h-7 w-7" title="编辑" @click="openEdit(g)">
                    <Pencil class="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" class="h-7 w-7" title="删除" @click="deleteTarget = g">
                    <Trash2 class="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
            <TableRow v-if="filteredGoals.length === 0">
              <TableCell colspan="8" class="h-24 text-center text-muted-foreground">
                {{ tab === 'all' ? '还没有健康目标，点击右上角「新建目标」开始' : '该状态下暂无目标' }}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <!-- 空态 -->
      <div
        v-else
        class="flex animate-in flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center fade-in slide-in-from-bottom-2 [animation-duration:400ms]"
      >
        <Target class="h-10 w-10 text-muted-foreground/50" />
        <p class="text-sm text-muted-foreground">
          {{ tab === 'all' ? '还没有健康目标，设定一个开始跟踪吧' : '该状态下暂无目标' }}
        </p>
        <Button variant="outline" @click="openCreate">
          <Plus class="h-4 w-4" />
          新建目标
        </Button>
      </div>
    </template>

    <!-- 新建 / 编辑弹窗 -->
    <HealthGoalFormDialog
      v-model:open="formOpen"
      :goal="editingGoal"
      :submitting="submitting"
      @submit="handleSubmit"
    />

    <!-- 删除确认弹窗 -->
    <HealthGoalDeleteDialog
      :open="deleteTarget !== null"
      :goal-label="deleteTarget ? goalTypeLabel(deleteTarget) : undefined"
      :deleting="deleting"
      @update:open="(v) => !v && (deleteTarget = null)"
      @confirm="handleDeleteConfirm"
    />
  </div>
</template>

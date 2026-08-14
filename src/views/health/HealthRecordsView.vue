<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Activity, Plus, RotateCw } from '@lucide/vue'
import { Button, Skeleton } from '@/components/ui'
import { useHealthStore } from '@/modules/health/store'
import type { HealthRecord, HealthRecordInput } from '@/modules/health/types'
import {
  HealthRecordTable,
  HealthRecordFormDialog,
  HealthRecordDeleteDialog,
} from '@/modules/health/components'
import { toast } from '@/lib/toast'

const store = useHealthStore()

/** 表格骨架各列占位宽度（与真实列内容长短匹配，观感更真实） */
const SKELETON_COL_WIDTHS = [
  'w-3/4', // 日期
  'w-1/2', // 体重
  'w-2/3', // BMI
  'w-2/3', // BMI 分类
  'w-1/2', // 体脂率
  'w-1/2', // 肌肉量
  'w-3/4', // 备注
  'w-3/4', // 操作
]

const formOpen = ref(false)
const editingRecord = ref<HealthRecord | null>(null)
const deleteTarget = ref<HealthRecord | null>(null)
const submitting = ref(false)
const deleting = ref(false)
/** 刷新中（只驱动按钮图标旋转，不触发页面骨架屏） */
const refreshing = ref(false)

/** 分片展示：默认显示最近 PAGE_SIZE 条，避免列表无限延伸 */
const PAGE_SIZE = 30
const visibleCount = ref(PAGE_SIZE)

/** 当前展示的记录（store 保持全量缓存，前端切片） */
const visibleRecords = computed(() => store.records.slice(0, visibleCount.value))

/** 是否还有更多未加载 */
const hasMore = computed(() => visibleCount.value < store.records.length)

/** 自动加载更多（滚动到底触发；无剩余时忽略） */
function loadMore() {
  if (!hasMore.value) return
  visibleCount.value += PAGE_SIZE
}

onMounted(() => {
  store.fetchRecords()
  // BMI 依赖档案身高，一并加载
  store.fetchProfile()
})

/** 强制从服务端重新拉取数据（绕过本地缓存），并提示结果 */
async function handleRefresh() {
  refreshing.value = true
  try {
    const ok = await store.fetchRecords(true)
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

function openEdit(record: HealthRecord) {
  editingRecord.value = record
  formOpen.value = true
}

function openDelete(record: HealthRecord) {
  deleteTarget.value = record
}

async function handleSubmit(input: HealthRecordInput) {
  submitting.value = true
  try {
    if (editingRecord.value) {
      await store.updateRecord(editingRecord.value.id, input)
      toast('健康记录已更新', 'success')
    } else {
      await store.createRecord(input)
      toast('健康记录已创建', 'success')
    }
    formOpen.value = false
  } catch (e: any) {
    console.error('保存健康记录失败', e)
    toast(e?.message ?? '保存失败', 'error')
  } finally {
    submitting.value = false
  }
}

async function handleDeleteConfirm() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await store.deleteRecord(deleteTarget.value.id)
    deleteTarget.value = null
    toast('健康记录已删除', 'success')
  } catch (e: any) {
    console.error('删除健康记录失败', e)
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
          <Activity class="h-5 w-5" />
        </div>
        <div>
          <h2 class="text-lg font-semibold">健康记录</h2>
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <Button variant="outline" :disabled="store.loading || refreshing" @click="handleRefresh">
          <RotateCw class="h-4 w-4" :class="refreshing && 'animate-spin'" />
          刷新
        </Button>
        <Button @click="openCreate">
          <Plus class="h-4 w-4" />
          新建记录
        </Button>
      </div>
    </div>

    <!-- 记录列表 -->
    <div v-if="store.loading" class="overflow-hidden rounded-lg border bg-card">
      <!-- 表头骨架 -->
      <div class="flex h-12 items-center border-b bg-muted/30 px-2">
        <div v-for="i in 8" :key="`h-${i}`" class="w-[12.5%] px-2">
          <Skeleton class="h-4 w-16" />
        </div>
      </div>
      <!-- 数据行骨架（5 行 × 8 列，列宽差异化） -->
      <div v-for="r in 5" :key="`r-${r}`" class="flex h-12 items-center border-b px-2 last:border-0">
        <div v-for="(w, c) in SKELETON_COL_WIDTHS" :key="`c-${c}`" class="w-[12.5%] px-2">
          <Skeleton class="h-4" :class="w" />
        </div>
      </div>
    </div>
    <div v-else-if="store.error" class="rounded-lg border border-destructive/50 p-6 text-center text-sm text-destructive">
      加载失败：{{ store.error }}
    </div>
    <div v-else class="animate-in fade-in slide-in-from-bottom-2 [animation-duration:400ms]">
      <HealthRecordTable :records="visibleRecords" @edit="openEdit" @remove="openDelete" @load-more="loadMore" />
    </div>

    <!-- 新建/编辑弹窗 -->
    <HealthRecordFormDialog
      v-model:open="formOpen"
      :record="editingRecord"
      :submitting="submitting"
      @submit="handleSubmit"
    />

    <!-- 删除确认弹窗 -->
    <HealthRecordDeleteDialog
      :open="deleteTarget !== null"
      :record-date="deleteTarget?.record_date"
      :deleting="deleting"
      @update:open="(v) => !v && (deleteTarget = null)"
      @confirm="handleDeleteConfirm"
    />
  </div>
</template>

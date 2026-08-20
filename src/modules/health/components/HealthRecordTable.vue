<script setup lang="ts">
import { computed } from 'vue'
import { Pencil, TrendingDown, TrendingUp, Minus, Trash2 } from '@lucide/vue'
import { Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui'
import { useHealthStore } from '@/modules/health/store'
import { bmiMeta, resolveBMI, type HealthRecord } from '@/modules/health/types'

const props = defineProps<{ records: HealthRecord[] }>()

const store = useHealthStore()

const emit = defineEmits<{
  edit: [record: HealthRecord]
  remove: [record: HealthRecord]
  'load-more': []
}>()

/** 档案身高（BMI 派生计算统一使用；档案可能异步加载，用 computed 保持响应式，未建档为 null） */
const profileHeight = computed(() => store.profile?.height_cm ?? null)

/** 计算每条记录的体重趋势（与前一条记录对比） */
function getWeightTrend(record: HealthRecord, index: number): { diff: number | null; icon: typeof TrendingUp | typeof TrendingDown | typeof Minus | null; color: string } {
  if (record.weight_kg === null || index >= props.records.length - 1) {
    return { diff: null, icon: null, color: '' }
  }
  const prevRecord = props.records[index + 1]
  if (!prevRecord?.weight_kg) {
    return { diff: null, icon: null, color: '' }
  }
  const diff = Math.round((record.weight_kg - prevRecord.weight_kg) * 100) / 100
  if (diff > 0) {
    return { diff, icon: TrendingUp, color: 'text-rose-500' }
  }
  if (diff < 0) {
    return { diff, icon: TrendingDown, color: 'text-emerald-500' }
  }
  return { diff: 0, icon: Minus, color: 'text-muted-foreground' }
}

/** 滚动到底部自动加载更多（阈值 40px；300ms 防抖防连续触发） */
let lastLoadMore = 0
function handleScroll(e: Event) {
  const el = e.target as HTMLElement
  if (el.scrollHeight - el.scrollTop - el.clientHeight > 40) return
  const now = Date.now()
  if (now - lastLoadMore < 300) return
  lastLoadMore = now
  emit('load-more')
}

/** 数值展示：null → '—'，保留原始小数（如 18.5） */
function fmt(v: number | null): string {
  return v === null ? '—' : String(v)
}

/** 体重展示：固定两位小数（如 65.5 → 65.50），null → '—' */
function fmtWeight(v: number | null): string {
  return v === null ? '—' : v.toFixed(2)
}

/** BMI 展示：固定两位小数（如 30.1 → 30.10），null → '—' */
function fmtBMI(bmi: number | null): string {
  return bmi === null ? '—' : bmi.toFixed(2)
}
</script>

<template>
  <div class="overflow-hidden rounded-lg border">
    <!-- 固定高度容器：列表在内部滚动，滚动到底自动触发 load-more，页面本身不延伸 -->
    <div class="max-h-[80vh] overflow-y-auto" @scroll="handleScroll">
      <Table class="table-fixed">
        <TableHeader class="sticky top-0 z-10 bg-background">
          <TableRow>
            <TableHead class="w-[10%] whitespace-nowrap">日期</TableHead>
            <TableHead class="w-[10%] whitespace-nowrap">体重（kg）</TableHead>
            <TableHead class="w-[10%] whitespace-nowrap">BMI</TableHead>
            <TableHead class="w-[10%] whitespace-nowrap">BMI 分类</TableHead>
            <TableHead class="w-[10%] whitespace-nowrap">体脂率（%）</TableHead>
            <TableHead class="w-[10%] whitespace-nowrap">内脏脂肪</TableHead>
            <TableHead class="w-[10%] whitespace-nowrap">脂肪量（kg）</TableHead>
            <TableHead class="w-[10%] whitespace-nowrap">肌肉量（kg）</TableHead>
            <TableHead class="w-[10%]">备注</TableHead>
            <TableHead class="w-[10%] whitespace-nowrap text-center">操作</TableHead>
          </TableRow>
        </TableHeader>
      <TableBody>
        <TableRow v-for="(record, index) in records" :key="record.id">
          <TableCell class="whitespace-nowrap font-medium">{{ record.record_date }}</TableCell>
          <TableCell class="whitespace-nowrap">
            <div class="flex items-center gap-1">
              <span class="tabular-nums">{{ fmtWeight(record.weight_kg) }}</span>
              <template v-if="getWeightTrend(record, index).icon">
                <component
                  :is="getWeightTrend(record, index).icon"
                  class="h-3.5 w-3.5"
                  :class="getWeightTrend(record, index).color"
                />
                <span
                  class="text-xs tabular-nums"
                  :class="getWeightTrend(record, index).color"
                >
                  {{ Math.abs(getWeightTrend(record, index).diff!).toFixed(2) }}
                </span>
              </template>
            </div>
          </TableCell>
          <!-- BMI：手动录入优先，留空自动计算（title 提示来源） -->
          <TableCell class="whitespace-nowrap">
            <span
              v-if="resolveBMI(record.bmi, record.weight_kg, profileHeight) !== null"
              class="font-medium tabular-nums"
              :title="record.bmi !== null ? '手动录入' : '自动计算'"
            >
              {{ fmtBMI(resolveBMI(record.bmi, record.weight_kg, profileHeight)) }}
            </span>
            <span v-else class="text-muted-foreground">—</span>
          </TableCell>
          <!-- BMI 分类（偏瘦/正常/超重/肥胖） -->
          <TableCell class="whitespace-nowrap">
            <Badge
              v-if="resolveBMI(record.bmi, record.weight_kg, profileHeight) !== null"
              variant="outline"
              :class="bmiMeta(resolveBMI(record.bmi, record.weight_kg, profileHeight)).badgeClass"
              class="whitespace-nowrap"
            >
              {{ bmiMeta(resolveBMI(record.bmi, record.weight_kg, profileHeight)).label }}
            </Badge>
            <span v-else class="text-muted-foreground">—</span>
          </TableCell>
          <TableCell class="whitespace-nowrap tabular-nums text-muted-foreground">
            {{ fmt(record.body_fat_pct) }}
          </TableCell>
          <TableCell class="whitespace-nowrap tabular-nums text-muted-foreground">
            {{ fmt(record.visceral_fat) }}
          </TableCell>
          <TableCell class="whitespace-nowrap tabular-nums text-muted-foreground">
            {{ fmt(record.fat_mass_kg) }}
          </TableCell>
          <TableCell class="whitespace-nowrap tabular-nums text-muted-foreground">
            {{ fmt(record.muscle_kg) }}
          </TableCell>
          <TableCell class="truncate text-muted-foreground" :title="record.note || undefined">
            {{ record.note || '—' }}
          </TableCell>
          <TableCell>
            <div class="flex justify-center gap-1 whitespace-nowrap">
              <Button variant="ghost" size="icon" title="编辑" @click="emit('edit', record)">
                <Pencil class="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" title="删除" @click="emit('remove', record)">
                <Trash2 class="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        <TableRow v-if="records.length === 0">
          <TableCell colspan="8" class="h-24 text-center text-muted-foreground">
            暂无健康记录，点击右上角「新建记录」开始记录体重与 BMI。
          </TableCell>
        </TableRow>
      </TableBody>
      </Table>
    </div>
  </div>
</template>

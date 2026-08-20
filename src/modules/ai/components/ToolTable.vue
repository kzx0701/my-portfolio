<script setup lang="ts">
import { Globe, KeyRound, Pencil, RefreshCw, Trash2 } from '@lucide/vue'
import { Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui'
import {
  balanceFresh,
  TOOL_KIND_META,
  type AiService,
} from '@/modules/ai/types'

defineProps<{ services: AiService[]; refreshingBalanceId?: string | null }>()

const emit = defineEmits<{
  edit: [service: AiService]
  remove: [service: AiService]
  view: [service: AiService]
  refreshBalance: [service: AiService]
  openConsole: [url: string]
  'view-secrets': [service: AiService]
}>()

/** 余额展示：有周期额度显示 剩余/总额；否则单值 */
function balanceLabel(s: AiService): string {
  if (s.balance === null) return '未维护'
  const val = Number(s.balance).toFixed(2)
  return s.quota_limit !== null ? `${val} / ${s.quota_limit}` : val
}

function handleConsoleClick(_e: Event, s: AiService) {
  if (!s.console_url) return
  emit('openConsole', s.console_url)
}

/** 余额更新时间短展示 */
function updatedLabel(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const sameYear = d.getFullYear() === now.getFullYear()
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  if (sameDay) return `今天 ${time}`
  if (sameYear) return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${time}`
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${time}`
}
</script>

<template>
  <div class="overflow-hidden rounded-lg border">
    <Table class="table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead class="w-[20%]">工具名称</TableHead>
          <TableHead class="w-[15%]">工具类型</TableHead>
          <TableHead class="w-[20%]">余额</TableHead>
          <TableHead class="w-[15%]">状态</TableHead>
          <TableHead class="w-[15%]">更新时间</TableHead>
          <TableHead class="w-[15%] text-center">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="s in services"
          :key="s.id"
          class="cursor-pointer"
          @click="emit('view', s)"
        >
          <TableCell class="truncate font-medium" :title="s.name">
            {{ s.name }}
          </TableCell>
          <TableCell>
            <Badge variant="outline" :class="TOOL_KIND_META[s.kind ?? 'model_api']?.badgeClass" class="whitespace-nowrap">
              {{ TOOL_KIND_META[s.kind ?? 'model_api']?.label ?? '模型 API' }}
            </Badge>
          </TableCell>
          <TableCell class="whitespace-nowrap tabular-nums">
            <div class="flex items-center gap-1">
              <span v-if="s.balance !== null" class="text-emerald-600 dark:text-emerald-500">{{ balanceLabel(s) }}</span>
              <span v-else class="text-muted-foreground">未维护</span>
              <Button
                v-if="s.balance !== null && (s.kind === 'model_api' || s.kind === 'relay') && s.balance_query_url"
                variant="ghost"
                size="icon"
                class="h-6 w-6"
                title="刷新余量"
                :disabled="refreshingBalanceId === s.id"
                @click.stop="emit('refreshBalance', s)"
              >
                <RefreshCw class="h-3 w-3" :class="refreshingBalanceId === s.id && 'animate-spin'" />
              </Button>
            </div>
          </TableCell>
          <TableCell>
            <Badge
              v-if="balanceFresh(s)"
              variant="outline"
              :class="balanceFresh(s)!.badgeClass"
              class="whitespace-nowrap"
            >
              {{ balanceFresh(s)!.label }}
            </Badge>
            <span v-else class="text-muted-foreground">—</span>
          </TableCell>
          <TableCell class="whitespace-nowrap text-muted-foreground">
            {{ updatedLabel(s.balance_updated_at) }}
          </TableCell>
          <TableCell>
            <div class="flex justify-center gap-1 whitespace-nowrap">
              <Button
                variant="ghost"
                size="icon"
                :class="s.console_url ? '' : 'opacity-50'"
                title="打开控制台"
                @click.stop="handleConsoleClick($event, s)"
              >
                <Globe class="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" title="密钥管理" @click.stop="emit('view-secrets', s)">
                <KeyRound class="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" title="编辑" @click.stop="emit('edit', s)">
                <Pencil class="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" title="删除" @click.stop="emit('remove', s)">
                <Trash2 class="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        <TableRow v-if="services.length === 0">
          <TableCell colspan="8" class="h-24 text-center text-muted-foreground">
            暂无 AI 工具，点击右上角「添加工具」开始。
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>

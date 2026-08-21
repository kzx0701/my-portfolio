<script setup lang="ts">
import { Globe, KeyRound, MessageCircle, Pencil, Trash2 } from '@lucide/vue'
import { Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui'
import { TOOL_KIND_META, type AiService } from '@/modules/ai/types'

defineProps<{ services: AiService[] }>()

const emit = defineEmits<{
  edit: [service: AiService]
  remove: [service: AiService]
  view: [service: AiService]
  openConsole: [url: string]
  'view-secrets': [service: AiService]
  'manage-chat-models': [service: AiService]
}>()

function handleConsoleClick(_e: Event, service: AiService) {
  if (!service.console_url) return
  emit('openConsole', service.console_url)
}
</script>

<template>
  <div class="overflow-hidden rounded-lg border">
    <Table class="table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead class="w-[32%]">工具名称</TableHead>
          <TableHead class="w-[20%]">工具类型</TableHead>
          <TableHead class="w-[25%]">控制台</TableHead>
          <TableHead class="w-[23%] text-center">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="service in services"
          :key="service.id"
          class="cursor-pointer"
          @click="emit('view', service)"
        >
          <TableCell class="truncate font-medium" :title="service.name">{{ service.name }}</TableCell>
          <TableCell>
            <Badge
              variant="outline"
              :class="TOOL_KIND_META[service.kind ?? 'model_api']?.badgeClass"
              class="whitespace-nowrap"
            >
              {{ TOOL_KIND_META[service.kind ?? 'model_api']?.label ?? '模型 API' }}
            </Badge>
          </TableCell>
          <TableCell class="truncate text-sm text-muted-foreground" :title="service.console_url ?? undefined">
            {{ service.console_url || '未设置' }}
          </TableCell>
          <TableCell>
            <div class="flex justify-center gap-1 whitespace-nowrap">
              <Button
                variant="ghost"
                size="icon"
                :class="service.console_url ? '' : 'opacity-40'"
                title="打开控制台"
                :disabled="!service.console_url"
                @click.stop="handleConsoleClick($event, service)"
              >
                <Globe class="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" title="密钥管理" @click.stop="emit('view-secrets', service)">
                <KeyRound class="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" title="对话模型" @click.stop="emit('manage-chat-models', service)">
                <MessageCircle class="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" title="编辑工具" @click.stop="emit('edit', service)">
                <Pencil class="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" title="删除工具" @click.stop="emit('remove', service)">
                <Trash2 class="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        <TableRow v-if="services.length === 0">
          <TableCell colspan="4" class="h-24 text-center text-muted-foreground">
            暂无工具，点击右上角「添加工具」开始。
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>

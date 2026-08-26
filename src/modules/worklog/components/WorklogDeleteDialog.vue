<script setup lang="ts">
import { Button, Dialog } from '@/components/ui'

defineProps<{
  open: boolean
  title?: string
  deleting?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: []
}>()
</script>

<template>
  <Dialog
    :open="open"
    title="删除工作事项"
    description="删除后无法恢复；如果只是暂时不做，建议改为已取消。"
    @update:open="emit('update:open', $event)"
  >
    <div class="space-y-4">
      <p class="text-sm">确定要删除 <strong>{{ title || '该事项' }}</strong> 吗？</p>
      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="emit('update:open', false)">保留</Button>
        <Button variant="destructive" :disabled="deleting" @click="emit('confirm')">
          {{ deleting ? '删除中…' : '确认删除' }}
        </Button>
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { Button, Dialog } from '@/components/ui'

defineProps<{
  open: boolean
  usageLabel?: string
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
    title="删除消费记录"
    description="删除后不可恢复，请确认。"
    @update:open="emit('update:open', $event)"
  >
    <div class="space-y-4">
      <p class="text-sm">
        确定要删除 <strong>{{ usageLabel || '该记录' }}</strong> 吗？
      </p>
      <div class="flex justify-end gap-2">
        <Button type="button" variant="outline" @click="emit('update:open', false)">取消</Button>
        <Button type="button" variant="destructive" :disabled="deleting" @click="emit('confirm')">
          {{ deleting ? '删除中…' : '确认删除' }}
        </Button>
      </div>
    </div>
  </Dialog>
</template>

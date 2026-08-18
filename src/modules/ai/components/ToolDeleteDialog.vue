<script setup lang="ts">
import { Button, Dialog } from '@/components/ui'

defineProps<{
  open: boolean
  serviceName?: string
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
    title="删除 AI 工具"
    description="删除后该工具的消费记录一并删除；密钥将保留但不关联该工具。"
    @update:open="emit('update:open', $event)"
  >
    <div class="space-y-4">
      <p class="text-sm">
        确定要删除 <strong>{{ serviceName || '该工具' }}</strong> 吗？
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

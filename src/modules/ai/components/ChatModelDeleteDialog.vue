<script setup lang="ts">
import { Button, Dialog } from '@/components/ui'

defineProps<{
  open: boolean
  modelName?: string
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
    title="移除对话模型"
    description="移除配置不会删除 AI 工具或密钥。"
    @update:open="emit('update:open', $event)"
  >
    <div class="space-y-4">
      <p class="text-sm">确定要移除 <strong>{{ modelName || '该对话模型' }}</strong> 吗？</p>
      <div class="flex justify-end gap-2">
        <Button type="button" variant="outline" @click="emit('update:open', false)">取消</Button>
        <Button type="button" variant="destructive" :disabled="deleting" @click="emit('confirm')">
          {{ deleting ? '移除中…' : '确认移除' }}
        </Button>
      </div>
    </div>
  </Dialog>
</template>

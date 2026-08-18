<script setup lang="ts">
import { Button, Dialog } from '@/components/ui'

defineProps<{
  open: boolean
  secretName?: string
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
    title="删除密钥"
    description="删除后不可恢复，请确认。"
    @update:open="emit('update:open', $event)"
  >
    <div class="space-y-4">
      <p class="text-sm">
        确定要删除 <strong>{{ secretName || '该密钥' }}</strong> 吗？
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

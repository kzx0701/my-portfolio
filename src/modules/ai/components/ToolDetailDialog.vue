<script setup lang="ts">
import { computed, ref } from 'vue'
import { KeyRound, Pencil, Plus, Trash2 } from '@lucide/vue'
import { Button, Dialog, Skeleton } from '@/components/ui'
import { useAiStore } from '@/modules/ai/store'
import { type AiSecret, type AiSecretInput, type AiService } from '@/modules/ai/types'
import SecretDeleteDialog from './SecretDeleteDialog.vue'
import SecretFormDialog from './SecretFormDialog.vue'
import { toast } from '@/lib/toast'

const props = defineProps<{
  open: boolean
  service?: AiService | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const store = useAiStore()

/** 当前工具关联的密钥；弹窗只负责密钥保管，不展示额度或工具详情 */
const serviceSecrets = computed(() => (props.service ? store.secretsOf(props.service.id) : []))

const secretFormOpen = ref(false)
const editingSecret = ref<AiSecret | null>(null)
const deleteSecretTarget = ref<AiSecret | null>(null)
const submitting = ref(false)
const deleting = ref(false)

function openCreateSecret() {
  editingSecret.value = null
  secretFormOpen.value = true
}

function openEditSecret(secret: AiSecret) {
  editingSecret.value = secret
  secretFormOpen.value = true
}

async function handleSecretSubmit(input: AiSecretInput) {
  if (!props.service) return
  submitting.value = true
  try {
    if (editingSecret.value) {
      await store.updateSecret(editingSecret.value.id, input)
      toast('密钥已更新', 'success')
    } else {
      await store.createSecret({ ...input, service_id: props.service.id })
      toast('密钥已创建', 'success')
    }
    secretFormOpen.value = false
  } catch (e: any) {
    console.error('保存密钥失败', e)
    toast(e?.message ?? '保存失败', 'error')
  } finally {
    submitting.value = false
  }
}

async function handleSecretDeleteConfirm() {
  if (!deleteSecretTarget.value) return
  deleting.value = true
  try {
    await store.deleteSecret(deleteSecretTarget.value.id)
    deleteSecretTarget.value = null
    toast('密钥已删除', 'success')
  } catch (e: any) {
    console.error('删除密钥失败', e)
    toast(e?.message ?? '删除失败', 'error')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <Dialog
    :open="open"
    class="max-w-xl"
    @update:open="emit('update:open', $event)"
  >
    <div v-if="service" class="space-y-5">
      <!-- 标题与密钥操作分层，避开 Dialog 自带的右上角关闭按钮 -->
      <div class="min-w-0">
        <h2 class="pr-10 text-xl font-semibold tracking-tight">{{ service.name }}</h2>
        <div class="mt-4 flex items-center justify-between gap-3 border-b pb-3">
          <div class="flex items-center gap-1.5 text-sm font-medium">
            <KeyRound class="h-4 w-4 text-muted-foreground" />
            密钥
          </div>
          <Button variant="outline" size="sm" class="shrink-0" @click="openCreateSecret">
            <Plus class="h-4 w-4" />
            添加密钥
          </Button>
        </div>
      </div>

      <div v-if="serviceSecrets.length > 0" class="space-y-2">
        <div
          v-for="s in serviceSecrets"
          :key="s.id"
          class="group flex items-center gap-3 rounded-xl border bg-card/70 px-3 py-3 transition-colors hover:border-teal-500/30 hover:bg-teal-500/[0.03]"
        >
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-400">
            <KeyRound class="h-4 w-4" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium" :title="s.name">{{ s.name }}</p>
            <p class="mt-1 text-xs text-muted-foreground">密钥已安全保存，前端不再读取明文</p>
            <p v-if="s.note" class="mt-1 truncate text-xs text-muted-foreground" :title="s.note">{{ s.note }}</p>
          </div>
          <div class="flex shrink-0 items-center gap-0.5">
            <Button variant="ghost" size="icon" class="h-8 w-8" title="编辑密钥" aria-label="编辑密钥" @click="openEditSecret(s)">
              <Pencil class="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="h-8 w-8 text-destructive hover:text-destructive"
              title="删除密钥"
              aria-label="删除密钥"
              @click="deleteSecretTarget = s"
            >
              <Trash2 class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <div v-else class="rounded-xl border border-dashed px-5 py-10 text-center">
        <KeyRound class="mx-auto h-8 w-8 text-muted-foreground/60" />
        <p class="mt-3 text-sm font-medium">还没有密钥</p>
        <p class="mt-1 text-xs text-muted-foreground">添加 API Key、Token 等凭据</p>
        <Button class="mt-4" size="sm" @click="openCreateSecret">
          <Plus class="h-4 w-4" />
          添加密钥
        </Button>
      </div>
    </div>
    <div v-else class="space-y-2">
      <Skeleton v-for="i in 3" :key="i" class="h-12 rounded-md" />
    </div>

    <SecretFormDialog
      v-model:open="secretFormOpen"
      :secret="editingSecret"
      :submitting="submitting"
      @submit="handleSecretSubmit"
    />

    <SecretDeleteDialog
      :open="deleteSecretTarget !== null"
      :secret-name="deleteSecretTarget?.name"
      :deleting="deleting"
      @update:open="(v) => !v && (deleteSecretTarget = null)"
      @confirm="handleSecretDeleteConfirm"
    />
  </Dialog>
</template>

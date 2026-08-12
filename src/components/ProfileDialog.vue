<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Camera, Loader2, Trash2 } from '@lucide/vue'
import { Avatar, Button, Dialog, Input, Label } from '@/components/ui'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const auth = useAuthStore()

const form = reactive({ username: '' })
const avatarUrl = ref('')
const saving = ref(false)
const fileInput = ref<HTMLInputElement>()
let pendingFile: File | null = null

const userEmail = auth.user?.email ?? ''

const userInitial = computed(() => form.username.charAt(0).toUpperCase() || '客')

// 打开弹窗时从当前资料初始化表单
watch(
  () => props.open,
  (open) => {
    if (open) {
      form.username = auth.username
      avatarUrl.value = auth.avatarUrl
      pendingFile = null
    }
  },
)

function pickAvatar() {
  fileInput.value?.click()
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    toast('请选择图片文件', 'error')
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    toast('图片不能超过 2MB', 'error')
    return
  }
  pendingFile = file
  avatarUrl.value = URL.createObjectURL(file)
}

function removeAvatar() {
  pendingFile = null
  avatarUrl.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

/** 上传头像到 Storage avatars bucket，返回公开 URL */
async function uploadAvatar(file: File): Promise<string> {
  const userId = auth.user?.id
  if (!userId) throw new Error('未登录')
  const ext = file.name.split('.').pop() || 'png'
  const path = `${userId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: false, contentType: file.type })
  if (error) throw error
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}

async function handleSave() {
  if (!form.username.trim()) {
    toast('请输入用户名', 'error')
    return
  }
  saving.value = true
  try {
    let finalAvatar = avatarUrl.value
    if (pendingFile) {
      finalAvatar = await uploadAvatar(pendingFile)
    }
    await auth.updateProfile({
      username: form.username,
      avatarUrl: finalAvatar || null,
    })
    toast('资料已更新', 'success')
    emit('update:open', false)
  } catch (e: any) {
    console.error('保存资料失败', e)
    toast(e?.message ?? '保存失败，请重试', 'error')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog
    :open="open"
    title="编辑资料"
    description="更新你的头像与用户名"
    @update:open="emit('update:open', $event)"
  >
    <form class="space-y-5" @submit.prevent="handleSave">
      <!-- 头像区 -->
      <div class="flex flex-col items-center gap-3 pt-1">
        <Avatar
          :src="avatarUrl || undefined"
          :fallback="userInitial"
          class="h-20 w-20 text-xl"
        />
        <div class="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" @click="pickAvatar">
            <Camera class="h-4 w-4" />
            更换头像
          </Button>
          <Button v-if="avatarUrl" type="button" variant="ghost" size="sm" @click="removeAvatar">
            <Trash2 class="h-4 w-4" />
            移除
          </Button>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          class="hidden"
          @change="onFileChange"
        />
        <p class="text-xs text-muted-foreground">支持 JPG / PNG，大小不超过 2MB</p>
      </div>

      <div class="space-y-2">
        <Label for="profile-username">用户名</Label>
        <Input
          id="profile-username"
          v-model="form.username"
          placeholder="输入用户名"
          maxlength="20"
        />
      </div>

      <div class="space-y-2">
        <Label for="profile-email">邮箱</Label>
        <Input id="profile-email" :model-value="userEmail" disabled />
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" @click="emit('update:open', false)">
          取消
        </Button>
        <Button type="submit" :disabled="saving">
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          {{ saving ? '保存中…' : '保存' }}
        </Button>
      </div>
    </form>
  </Dialog>
</template>

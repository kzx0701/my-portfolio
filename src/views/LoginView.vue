<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui'
import { useAuthStore } from '@/stores/auth'
import logoUrl from '@/assets/images/logo.png'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const activeTab = ref('login')
const email = ref('')
const password = ref('')
const message = ref('')
const messageType = ref<'success' | 'error'>('error')
const submitting = ref(false)

async function handleSubmit() {
  message.value = ''
  submitting.value = true
  try {
    if (activeTab.value === 'login') {
      await auth.signInWithEmail(email.value, password.value)
    } else {
      await auth.signUp(email.value, password.value)
      activeTab.value = 'login'
      messageType.value = 'success'
      message.value = '注册成功！请查收邮箱完成验证后登录。'
      submitting.value = false
      return
    }

    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
  } catch (e: any) {
    messageType.value = 'error'
    message.value = e?.message || '操作失败，请重试'
  } finally {
    submitting.value = false
  }
}

function handleTabChange(value: string | number) {
  activeTab.value = String(value)
  message.value = ''
}
</script>

<template>
  <div class="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
    <div class="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(125,211,252,0.18),rgba(255,255,255,0.3)_45%,rgba(45,212,191,0.12))] dark:bg-[linear-gradient(to_bottom,rgba(14,116,144,0.16),rgba(15,23,42,0.08)_45%,rgba(13,148,136,0.12))]" />
    <div class="pointer-events-none absolute -right-20 -top-24 -z-10 h-80 w-80 rounded-full bg-amber-300/18 blur-3xl" />
    <div class="pointer-events-none absolute -bottom-28 -left-20 -z-10 h-80 w-80 rounded-full bg-teal-400/16 blur-3xl" />
    <Card class="w-full max-w-md border-white/70 bg-white/82 shadow-[0_20px_60px_-38px_rgba(14,116,144,0.5)] backdrop-blur-md dark:border-white/10 dark:bg-card/90">
      <CardHeader class="space-y-1 text-center">
        <img :src="logoUrl" alt="轩屿" class="mx-auto mb-2 h-14 w-auto object-contain" />
        <CardTitle class="text-2xl font-bold">轩屿工作台</CardTitle>
        <CardDescription>登录以进入你的个人工作台</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs :model-value="activeTab" default-value="login" @update:model-value="handleTabChange">
          <TabsList class="grid w-full grid-cols-2">
            <TabsTrigger value="login">登录</TabsTrigger>
            <TabsTrigger value="register">注册</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <form class="space-y-4 pt-4" @submit.prevent="handleSubmit">
              <div class="space-y-2">
                <Label for="login-email">邮箱</Label>
                <Input id="login-email" v-model="email" type="email" placeholder="you@example.com" required autocomplete="email" />
              </div>
              <div class="space-y-2">
                <Label for="login-password">密码</Label>
                <Input id="login-password" v-model="password" type="password" placeholder="••••••••" required autocomplete="current-password" />
              </div>
              <p
                v-if="message"
                class="rounded-md px-3 py-2 text-sm"
                :class="messageType === 'success' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-destructive/10 text-destructive'"
                :role="messageType === 'error' ? 'alert' : 'status'"
              >
                {{ message }}
              </p>
              <Button type="submit" class="w-full" :disabled="submitting">
                {{ submitting ? '登录中…' : '登录' }}
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="register">
            <form class="space-y-4 pt-4" @submit.prevent="handleSubmit">
              <div class="space-y-2">
                <Label for="reg-email">邮箱</Label>
                <Input id="reg-email" v-model="email" type="email" placeholder="you@example.com" required autocomplete="email" />
              </div>
              <div class="space-y-2">
                <Label for="reg-password">密码</Label>
                <Input id="reg-password" v-model="password" type="password" placeholder="至少 8 位" required minlength="8" autocomplete="new-password" />
              </div>
              <p
                v-if="message"
                class="rounded-md px-3 py-2 text-sm"
                :class="messageType === 'success' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-destructive/10 text-destructive'"
                :role="messageType === 'error' ? 'alert' : 'status'"
              >
                {{ message }}
              </p>
              <Button type="submit" class="w-full" :disabled="submitting">
                {{ submitting ? '注册中…' : '注册' }}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const activeTab = ref('login')
const email = ref('')
const password = ref('')
const error = ref('')
const submitting = ref(false)

async function handleSubmit() {
  error.value = ''
  submitting.value = true
  try {
    if (activeTab.value === 'login') {
      await auth.signInWithEmail(email.value, password.value)
    } else {
      await auth.signUp(email.value, password.value)
      error.value = '注册成功！请查收邮箱完成验证后登录。'
      activeTab.value = 'login'
      submitting.value = false
      return
    }

    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
  } catch (e: any) {
    error.value = e?.message || '操作失败，请重试'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-muted/40 p-4">
    <Card class="w-full max-w-md">
      <CardHeader class="space-y-1 text-center">
        <CardTitle class="text-2xl font-bold">轩屿工作台</CardTitle>
        <CardDescription>登录以进入你的个人工作台</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs v-model="activeTab" defaultValue="login">
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
              <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
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
                <Input id="reg-password" v-model="password" type="password" placeholder="至少 6 位" required minlength="6" autocomplete="new-password" />
              </div>
              <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
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
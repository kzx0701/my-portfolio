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
  <div class="login-page">
    <!-- 背景装饰 -->
    <div class="login-bg" />
    <div class="login-overlay" />
    <div class="login-orb login-orb-1" />
    <div class="login-orb login-orb-2" />
    <div class="login-orb login-orb-3" />

    <!-- 登录卡片 -->
    <div class="relative z-10 flex min-h-screen items-center justify-center p-4">
      <Card class="login-card w-full max-w-md">
        <CardHeader class="space-y-3 text-center pb-4">
          <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30 dark:shadow-indigo-500/20">
            <svg class="h-7 w-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div class="space-y-1">
            <CardTitle class="text-2xl font-bold tracking-tight">轩屿工作台</CardTitle>
            <CardDescription class="text-muted-foreground/80">登录以进入你的个人工作台</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs v-model="activeTab" defaultValue="login">
            <TabsList class="grid w-full grid-cols-2 mb-2">
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
  </div>
</template>

<style scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.login-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(ellipse 80% 60% at 50% -20%, oklch(0.7 0.15 260 / 0.25), transparent),
    radial-gradient(ellipse 60% 50% at 80% 50%, oklch(0.75 0.12 280 / 0.15), transparent),
    radial-gradient(ellipse 60% 50% at 20% 80%, oklch(0.8 0.1 240 / 0.12), transparent),
    linear-gradient(180deg, oklch(0.98 0.005 260) 0%, oklch(0.96 0.01 280) 100%);
}

.dark .login-bg {
  background:
    radial-gradient(ellipse 80% 60% at 50% -20%, oklch(0.35 0.15 260 / 0.4), transparent),
    radial-gradient(ellipse 60% 50% at 80% 50%, oklch(0.3 0.12 280 / 0.3), transparent),
    radial-gradient(ellipse 60% 50% at 20% 80%, oklch(0.4 0.1 240 / 0.25), transparent),
    linear-gradient(180deg, oklch(0.15 0.01 260) 0%, oklch(0.12 0.015 280) 100%);
}

.login-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  background-image:
    linear-gradient(oklch(0.5 0.02 260 / 0.03) 1px, transparent 1px),
    linear-gradient(90deg, oklch(0.5 0.02 260 / 0.03) 1px, transparent 1px);
  background-size: 48px 48px;
}

.dark .login-overlay {
  background-image:
    linear-gradient(oklch(0.5 0.02 260 / 0.06) 1px, transparent 1px),
    linear-gradient(90deg, oklch(0.5 0.02 260 / 0.06) 1px, transparent 1px);
}

.login-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  animation: float 12s ease-in-out infinite;
}

.login-orb-1 {
  width: 320px;
  height: 320px;
  top: -10%;
  right: -5%;
  background: oklch(0.7 0.14 260 / 0.2);
  animation-delay: 0s;
}

.login-orb-2 {
  width: 260px;
  height: 260px;
  bottom: -10%;
  left: -5%;
  background: oklch(0.75 0.12 290 / 0.18);
  animation-delay: -4s;
}

.login-orb-3 {
  width: 200px;
  height: 200px;
  top: 40%;
  right: 10%;
  background: oklch(0.8 0.08 200 / 0.12);
  animation-delay: -8s;
}

.login-card {
  border-radius: 1rem;
  background: oklch(1 0 0 / 0.7);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid oklch(1 0 0 / 0.3);
  box-shadow:
    0 0 0 1px oklch(0 0 0 / 0.03),
    0 2px 4px oklch(0 0 0 / 0.04),
    0 12px 28px oklch(0.3 0.1 260 / 0.08);
}

.dark .login-card {
  background: oklch(0.2 0.02 260 / 0.7);
  border: 1px solid oklch(1 0 0 / 0.08);
  box-shadow:
    0 0 0 1px oklch(0 0 0 / 0.1),
    0 2px 4px oklch(0 0 0 / 0.1),
    0 12px 28px oklch(0 0 0 / 0.3);
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(8px, -12px) scale(1.02); }
  66% { transform: translate(-6px, 8px) scale(0.98); }
}
</style>
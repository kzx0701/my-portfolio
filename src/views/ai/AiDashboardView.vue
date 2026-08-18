<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowRight, KeyRound, Plus, Receipt, Sparkles, Wrench } from '@lucide/vue'
import { Badge, Button, Card, Skeleton } from '@/components/ui'
import { useAiStore } from '@/modules/ai/store'
import { AiStatsCards, UsageFormDialog } from '@/modules/ai/components'
import {
  balanceFresh,
  serviceTypeMeta,
  type AiUsageRecordInput,
} from '@/modules/ai/types'
import { toast } from '@/lib/toast'

const store = useAiStore()

/** 仪表盘数据是否加载完成 */
const loaded = ref(false)

const usageFormOpen = ref(false)
const submitting = ref(false)

onMounted(async () => {
  await Promise.all([store.fetchServices(), store.fetchUsage(), store.fetchSecrets()])
  loaded.value = true
})

/** 是否有余额的工具（低余额预警用） */
const isEmpty = computed(() => store.services.length === 0)

/** 最近消费记录（5 条） */
const recentUsage = computed(() => store.usage.slice(0, 5))

/** 工具名映射 */
function serviceName(id: string): string {
  return store.services.find((s) => s.id === id)?.name ?? '未知工具'
}

/** 余额展示：有周期额度显示 剩余/总额 */
function balanceLabel(serviceId: string): string {
  const s = store.services.find((sv) => sv.id === serviceId)
  if (!s || s.balance === null) return '未维护'
  return s.quota_limit !== null ? `${s.balance} / ${s.quota_limit}` : `${s.balance}`
}

/** 消费记录金额展示（人民币） */
function usageValueLabel(u: (typeof store.usage)[number]): string {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(u.amount)
}

async function handleCreateUsage(input: AiUsageRecordInput) {
  submitting.value = true
  try {
    await store.createUsage(input)
    toast('消费记录已添加', 'success')
    usageFormOpen.value = false
  } catch (e: any) {
    console.error('添加消费失败', e)
    toast(e?.message ?? '添加失败', 'error')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-6">
    <!-- 标题区（logo 与首页卡片同 viewTransitionName，实现 VT 共享元素 morphing） -->
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-teal-500 text-white shadow-md shadow-sky-500/25"
          :style="{ viewTransitionName: 'vt-ai' }"
        >
          <Sparkles class="h-5 w-5" />
        </div>
        <div>
          <h2 class="text-lg font-semibold">仪表盘</h2>
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <RouterLink to="/ai/tools">
          <Button variant="outline" class="shrink-0">
            <Wrench class="h-4 w-4" />
            工具
          </Button>
        </RouterLink>
        <Button class="shrink-0" @click="usageFormOpen = true">
          <Plus class="h-4 w-4" />
          添加消费
        </Button>
      </div>
    </div>

    <!-- 加载中：骨架屏 -->
    <template v-if="!loaded">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton v-for="i in 4" :key="i" class="h-[104px] rounded-xl" />
      </div>
      <div class="grid items-start gap-4 lg:grid-cols-3">
        <Skeleton class="h-[360px] rounded-lg lg:col-span-2" />
        <Skeleton class="h-[360px] rounded-lg" />
      </div>
    </template>

    <!-- 加载完成 -->
    <template v-else>
      <!-- 完全无数据：引导 -->
      <Card
        v-if="isEmpty"
        class="flex animate-in flex-col items-center justify-center gap-4 border-dashed py-20 text-center fade-in [animation-duration:400ms]"
      >
        <Sparkles class="h-12 w-12 text-muted-foreground/60" />
        <div class="space-y-1">
          <p class="font-medium">AI 中心还是空的</p>
          <p class="text-sm text-muted-foreground">登记你常用的 AI 工具，统一管理密钥、余额与消费</p>
        </div>
        <div class="flex gap-3">
          <RouterLink to="/ai/tools">
            <Button>
              <Wrench class="h-4 w-4" />
              添加工具
            </Button>
          </RouterLink>
          <RouterLink to="/ai/usage">
            <Button variant="outline">
              <Receipt class="h-4 w-4" />
              消费记录
            </Button>
          </RouterLink>
        </div>
      </Card>

      <template v-else>
        <!-- 统计卡 -->
        <div class="animate-in fade-in slide-in-from-bottom-2 [animation-duration:400ms]">
          <AiStatsCards />
        </div>

        <!-- 主区：工具状态 + 最近消费 -->
        <div class="grid animate-in gap-4 fade-in slide-in-from-bottom-2 [animation-duration:400ms] [animation-delay:80ms] lg:grid-cols-3">
          <!-- 工具状态 -->
          <div class="rounded-lg border p-4 lg:col-span-2">
            <div class="mb-3 flex items-center justify-between">
              <h3 class="text-sm font-semibold">工具状态</h3>
              <RouterLink
                to="/ai/tools"
                class="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
              >
                查看全部
                <ArrowRight class="h-3.5 w-3.5" />
              </RouterLink>
            </div>
            <ul v-if="store.services.length > 0" class="divide-y">
              <li
                v-for="s in store.services"
                :key="s.id"
                class="flex items-center gap-3 py-2.5 text-sm"
              >
                <Badge variant="outline" :class="serviceTypeMeta(s.service_type).badgeClass" class="shrink-0">
                  {{ serviceTypeMeta(s.service_type).label }}
                </Badge>
                <div class="min-w-0 flex-1">
                  <p class="truncate font-medium">{{ s.name }}</p>
                  <p class="mt-0.5 text-xs text-muted-foreground">
                    余额更新于 {{ s.balance_updated_at ? new Date(s.balance_updated_at).toLocaleDateString('zh-CN') : '—' }}
                  </p>
                </div>
                <Badge
                  v-if="balanceFresh(s)"
                  variant="outline"
                  :class="balanceFresh(s)!.badgeClass"
                  class="hidden sm:inline-flex"
                >
                  {{ balanceFresh(s)!.label }}
                </Badge>
                <span class="shrink-0 font-semibold tabular-nums">{{ balanceLabel(s.id) }}</span>
              </li>
            </ul>
            <p v-else class="py-8 text-center text-sm text-muted-foreground">暂无工具</p>
          </div>

          <!-- 最近消费 + 密钥快捷入口 -->
          <div class="flex flex-col gap-4">
            <div class="rounded-lg border p-4">
              <div class="mb-2 flex items-center justify-between">
                <h3 class="text-sm font-semibold">最近消费</h3>
                <RouterLink
                  to="/ai/usage"
                  class="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
                >
                  查看全部
                  <ArrowRight class="h-3.5 w-3.5" />
                </RouterLink>
              </div>
              <ul v-if="recentUsage.length > 0" class="divide-y">
                <li
                  v-for="u in recentUsage"
                  :key="u.id"
                  class="flex items-center justify-between gap-2 py-2 text-sm"
                >
                  <div class="min-w-0">
                    <p class="truncate">{{ serviceName(u.service_id) }}</p>
                    <p class="text-xs text-muted-foreground tabular-nums">{{ u.usage_date }}</p>
                  </div>
                  <span class="shrink-0 font-medium tabular-nums">{{ usageValueLabel(u) }}</span>
                </li>
              </ul>
              <p v-else class="py-6 text-center text-sm text-muted-foreground">暂无消费记录</p>
            </div>

            <div class="rounded-lg border p-4">
              <div class="mb-3 flex items-center justify-between">
                <h3 class="text-sm font-semibold">密钥管理</h3>
                <RouterLink
                  to="/ai/tools"
                  class="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
                >
                  管理
                  <ArrowRight class="h-3.5 w-3.5" />
                </RouterLink>
              </div>
              <p class="text-sm text-muted-foreground">
                已存 <strong class="tabular-nums">{{ store.secrets.length }}</strong> 个密钥，
                在工具列表中点击工具即可查看与维护。
              </p>
              <div class="mt-4 flex items-center gap-2 rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
                <KeyRound class="h-4 w-4 shrink-0" />
                密钥仅存于你的账号数据中，列表打码展示，复制才取用明文
              </div>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- 添加消费弹窗 -->
    <UsageFormDialog
      v-model:open="usageFormOpen"
      :submitting="submitting"
      @submit="handleCreateUsage"
    />
  </div>
</template>

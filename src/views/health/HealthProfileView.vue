<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Pencil, UserRound } from '@lucide/vue'
import { Button, Card, Skeleton } from '@/components/ui'
import { useHealthStore } from '@/modules/health/store'
import { HealthProfileFormDialog } from '@/modules/health/components'
import { BLOOD_TYPE_META, GENDER_META, calcAge, type HealthProfileInput } from '@/modules/health/types'
import { toast } from '@/lib/toast'

const store = useHealthStore()

/** 档案是否已加载完成（区分「加载中」与「未建档」） */
const loaded = ref(false)
const formOpen = ref(false)
const submitting = ref(false)

onMounted(async () => {
  await store.fetchProfile()
  loaded.value = true
})

const profile = computed(() => store.profile)

/** 派生：BMI 正常范围对应的体重区间（中国标准 18.5-23.9，用档案身高计算） */
const normalWeightRange = computed<{ min: number; max: number } | null>(() => {
  const h = profile.value?.height_cm
  if (!h || h <= 0) return null
  const m = h / 100
  return {
    min: Math.round(18.5 * m * m * 10) / 10,
    max: Math.round(23.9 * m * m * 10) / 10,
  }
})

function genderLabel(): string {
  const g = profile.value?.gender
  return g ? GENDER_META[g].label : '—'
}

function bloodLabel(): string {
  const b = profile.value?.blood_type
  return b ? BLOOD_TYPE_META[b].label : '—'
}

async function handleSubmit(input: HealthProfileInput) {
  submitting.value = true
  try {
    await store.saveProfile(input)
    formOpen.value = false
    toast('档案已保存', 'success')
  } catch (e: any) {
    console.error('保存档案失败', e)
    toast(e?.message ?? '保存失败', 'error')
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
          :style="{ viewTransitionName: 'vt-health' }"
        >
          <UserRound class="h-5 w-5" />
        </div>
        <div>
          <h2 class="text-lg font-semibold">个人档案</h2>
        </div>
      </div>
      <Button
        v-if="profile"
        variant="outline"
        class="shrink-0"
        @click="formOpen = true"
      >
        <Pencil class="h-4 w-4" />
        编辑档案
      </Button>
    </div>

    <!-- 加载中 -->
    <Card v-if="!loaded" class="max-w-2xl space-y-3 p-6">
      <Skeleton class="h-5 w-24" />
      <Skeleton class="h-10 w-32" />
      <Skeleton class="h-4 w-40" />
    </Card>

    <!-- 未建档：引导建档 -->
    <Card
      v-else-if="!profile"
      class="flex max-w-2xl animate-in flex-col items-center justify-center gap-4 border-dashed py-24 text-center fade-in slide-in-from-bottom-2 [animation-duration:400ms]"
    >
      <UserRound class="h-12 w-12 text-muted-foreground/60" />
      <div class="space-y-1">
        <p class="font-medium">还没有个人档案</p>
        <p class="text-sm text-muted-foreground">填写身高等固定信息后，健康记录的 BMI 将自动使用档案数据</p>
      </div>
      <Button @click="formOpen = true">立即建档</Button>
    </Card>

    <!-- 已建档：展示基本信息 -->
    <Card
      v-else
      class="max-w-2xl animate-in p-6 fade-in slide-in-from-bottom-2 [animation-duration:400ms]"
    >
      <h3 class="mb-4 text-sm font-semibold text-muted-foreground">基本信息</h3>
      <div class="flex items-baseline gap-2">
        <span class="text-3xl font-semibold tabular-nums">{{ profile.height_cm }}</span>
        <span class="text-sm text-muted-foreground">cm</span>
      </div>
      <div class="mt-6 grid grid-cols-3 gap-4 text-sm">
        <div>
          <p class="text-muted-foreground">年龄</p>
          <p class="mt-1 font-medium tabular-nums">
            {{ calcAge(profile.birth_date) !== null ? `${calcAge(profile.birth_date)} 岁` : '—' }}
          </p>
        </div>
        <div>
          <p class="text-muted-foreground">性别</p>
          <p class="mt-1 font-medium">{{ genderLabel() }}</p>
        </div>
        <div>
          <p class="text-muted-foreground">血型</p>
          <p class="mt-1 font-medium">{{ bloodLabel() }}</p>
        </div>
      </div>
      <div class="mt-6 rounded-lg border border-dashed p-4 text-sm">
        <p class="text-muted-foreground">BMI 正常范围（中国标准 18.5–23.9）</p>
        <p v-if="normalWeightRange" class="mt-1 font-medium tabular-nums">
          {{ normalWeightRange.min }} – {{ normalWeightRange.max }} kg
        </p>
        <p v-else class="mt-1 text-muted-foreground">需先填写身高</p>
      </div>
    </Card>

    <!-- 建档 / 编辑弹窗 -->
    <HealthProfileFormDialog
      v-model:open="formOpen"
      :profile="profile"
      :submitting="submitting"
      @submit="handleSubmit"
    />
  </div>
</template>

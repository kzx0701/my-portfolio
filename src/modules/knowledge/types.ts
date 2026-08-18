import type { Database } from '@/lib/database.types'

/** 知识库笔记（对应 Supabase 表 knowledge_articles） */
export type KnowledgeArticle = Database['public']['Tables']['knowledge_articles']['Row']

/** 新建 / 编辑笔记的入参 */
export type KnowledgeArticleInput = Omit<
  KnowledgeArticle,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>

/** 笔记分类（单选；前端预设，库中 category 无 check 约束，扩展分类无需改库） */
export const CATEGORY_META: Record<string, { label: string; badgeClass: string }> = {
  frontend: {
    label: '前端',
    badgeClass: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400',
  },
  backend: {
    label: '后端',
    badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  ai: {
    label: 'AI',
    badgeClass: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  },
  tools: {
    label: '工具',
    badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  },
  notes: {
    label: '杂记',
    badgeClass: 'border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-400',
  },
}

export const CATEGORY_OPTIONS = Object.keys(CATEGORY_META).map((value) => ({
  value,
  label: CATEGORY_META[value].label,
}))

/** 分类标签文案与徽章样式；未分类返回「未分类」 */
export function categoryMeta(category: string | null): { label: string; badgeClass: string } {
  if (category && CATEGORY_META[category]) return CATEGORY_META[category]
  return { label: '未分类', badgeClass: 'border-border bg-muted text-muted-foreground' }
}

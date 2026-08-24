import type { Database } from '@/lib/database.types'

/** 知识库笔记（对应 Supabase 表 knowledge_articles） */
export type KnowledgeArticle = Database['public']['Tables']['knowledge_articles']['Row']

/** 知识库分类（对应 Supabase 表 knowledge_categories） */
export type KnowledgeCategory = Database['public']['Tables']['knowledge_categories']['Row']

/** 知识库目录（对应 Supabase 表 knowledge_directories） */
export type KnowledgeDirectory = Database['public']['Tables']['knowledge_directories']['Row']

/** 新建分类的入参 */
export type KnowledgeCategoryInput = Pick<KnowledgeCategory, 'name' | 'color'>

/** 新建目录的入参；空值表示根目录，目录最多支持两级。 */
export type KnowledgeDirectoryInput = Pick<KnowledgeDirectory, 'name' | 'color'> & {
  parent_id?: string | null
}

/** 新建 / 编辑笔记的入参 */
export type KnowledgeArticleInput = Omit<
  KnowledgeArticle,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>

/** 分类颜色选项；颜色只负责展示，不影响分类值的稳定性 */
export const CATEGORY_COLOR_OPTIONS = [
  { value: 'sky', label: '天空蓝' },
  { value: 'emerald', label: '薄荷绿' },
  { value: 'indigo', label: '靛青' },
  { value: 'amber', label: '琥珀' },
  { value: 'rose', label: '玫瑰' },
  { value: 'violet', label: '紫罗兰' },
]

export type KnowledgeCategoryColor = (typeof CATEGORY_COLOR_OPTIONS)[number]['value']

const CATEGORY_BADGE_CLASSES: Record<string, string> = {
  sky: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400',
  emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  indigo: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  rose: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400',
  violet: 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400',
}

const CATEGORY_DOT_CLASSES: Record<string, string> = {
  sky: 'bg-sky-500',
  emerald: 'bg-emerald-500',
  indigo: 'bg-indigo-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  violet: 'bg-violet-500',
}

const DIRECTORY_ICON_CLASSES: Record<string, string> = {
  sky: 'fill-sky-500/15 text-sky-600 dark:text-sky-400',
  emerald: 'fill-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  indigo: 'fill-indigo-500/15 text-indigo-600 dark:text-indigo-400',
  amber: 'fill-amber-500/15 text-amber-600 dark:text-amber-400',
  rose: 'fill-rose-500/15 text-rose-600 dark:text-rose-400',
  violet: 'fill-violet-500/15 text-violet-600 dark:text-violet-400',
}

export function categoryBadgeClass(color: string | null | undefined): string {
  return CATEGORY_BADGE_CLASSES[color ?? ''] ?? 'border-border bg-muted text-muted-foreground'
}

export function categoryDotClass(color: string | null | undefined): string {
  return CATEGORY_DOT_CLASSES[color ?? ''] ?? 'bg-muted-foreground'
}

/** 文件夹图标颜色；旧数据没有颜色时使用中性色。 */
export function directoryIconClass(color: string | null | undefined): string {
  return DIRECTORY_ICON_CLASSES[color ?? ''] ?? 'fill-muted/60 text-muted-foreground'
}

/** 分类标签文案与徽章样式；分类不存在时返回「未分类」。 */
export function categoryMeta(
  category: string | null,
  categories: KnowledgeCategory[] = [],
): { label: string; badgeClass: string } {
  const match = category ? categories.find((item) => item.slug === category) : undefined
  return match
    ? { label: match.name, badgeClass: categoryBadgeClass(match.color) }
    : { label: '未分类', badgeClass: 'border-border bg-muted text-muted-foreground' }
}

export function categoryOptions(categories: KnowledgeCategory[]) {
  return categories.map((category) => ({
    value: category.slug,
    label: categoryMeta(category.slug, categories).label,
  }))
}

/** 目录展示路径；根目录显示名称，子目录显示「根目录 / 子目录」。 */
export function directoryPath(
  directoryId: string | null,
  directories: KnowledgeDirectory[] = [],
): string {
  const directory = directoryId ? directories.find((item) => item.id === directoryId) : undefined
  if (!directory) return '未归档目录'
  const parent = directory.parent_id
    ? directories.find((item) => item.id === directory.parent_id)
    : undefined
  return parent ? `${parent.name} / ${directory.name}` : directory.name
}

export function directoryOptions(directories: KnowledgeDirectory[]) {
  return directories.map((directory) => ({
    value: directory.id,
    label: directoryPath(directory.id, directories),
  }))
}

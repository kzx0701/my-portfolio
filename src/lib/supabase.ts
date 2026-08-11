import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// 类型：后续可导入 Supabase 生成的 Database 类型（从 Supabase CLI 生成）
export type Database = any

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

if (!supabaseUrl || !supabaseKey) {
  // eslint-disable-next-line no-console
  console.warn(
    'Supabase 环境变量缺失：请检查 .env 中的 VITE_SUPABASE_URL 与 VITE_SUPABASE_PUBLISHABLE_KEY',
  )
}

export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)
/**
 * 手动维护的 Supabase Database 类型（对应 supabase/schema.sql）
 *
 * 说明：本文件模拟 `supabase gen types typescript` 的输出结构。
 * 若后续用 Supabase CLI 生成，可直接用生成的 database.types.ts 替换本文件
 * （CLI 生成命令：supabase gen types typescript --project-id <ref> > src/lib/database.types.ts）
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

/** 订单状态（orders.status check 约束） */
export type OrderStatusLiteral =
  | 'pending' // 待报价
  | 'negotiating' // 洽谈中
  | 'in_progress' // 进行中
  | 'completed' // 已完成
  | 'paid' // 已回款
  | 'cancelled' // 已取消

export type Database = {
  public: {
    Tables: {
      orders: {
        Row: {
          id: string
          user_id: string
          project_name: string
          client_name: string | null
          amount: number | null
          status: OrderStatusLiteral
          progress: number
          description: string | null
          start_date: string | null
          due_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_name: string
          client_name?: string | null
          amount?: number | null
          status?: OrderStatusLiteral
          progress?: number
          description?: string | null
          start_date?: string | null
          due_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_name?: string
          client_name?: string | null
          amount?: number | null
          status?: OrderStatusLiteral
          progress?: number
          description?: string | null
          start_date?: string | null
          due_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'orders_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

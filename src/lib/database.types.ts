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
  | 'negotiating' // 洽谈中
  | 'quoted' // 已报价
  | 'in_progress' // 进行中
  | 'completed' // 已完成
  | 'cancelled' // 已取消

/** 渠道来源（orders.channel check 约束） */
export type OrderChannelLiteral = 'xianyu' | 'wechat'

/** 项目类型（orders.project_type check 约束） */
export type ProjectTypeLiteral = 'web' | 'app' | 'miniapp' | 'other'

/** 性别（health_profile.gender check 约束） */
export type HealthGenderLiteral = 'male' | 'female'

/** 血型（health_profile.blood_type check 约束） */
export type HealthBloodTypeLiteral = 'A' | 'B' | 'AB' | 'O'

/** 健康目标类型（health_goal.goal_type check 约束） */
export type HealthGoalTypeLiteral = 'fat_loss' | 'muscle_gain' | 'maintain'

/** 健康目标状态（health_goal.status check 约束） */
export type HealthGoalStatusLiteral = 'in_progress' | 'completed' | 'cancelled'

export type Database = {
  public: {
    Tables: {
      orders: {
        Row: {
          id: string
          user_id: string
          project_name: string
          client_name: string | null
          project_type: ProjectTypeLiteral | null
          amount: number | null
          status: OrderStatusLiteral
          channel: OrderChannelLiteral | null
          repo_url: string | null
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
          project_type?: ProjectTypeLiteral | null
          amount?: number | null
          status?: OrderStatusLiteral
          channel?: OrderChannelLiteral | null
          repo_url?: string | null
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
          project_type?: ProjectTypeLiteral | null
          amount?: number | null
          status?: OrderStatusLiteral
          channel?: OrderChannelLiteral | null
          repo_url?: string | null
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
          {
            foreignKeyName: 'payments_order_id_fkey'
            columns: ['id']
            isOneToOne: false
            referencedRelation: 'payments'
            referencedColumns: ['order_id']
          },
        ]
      }
      payments: {
        Row: {
          id: string
          order_id: string
          user_id: string
          stage: string
          amount: number
          paid_at: string | null
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          user_id: string
          stage?: string
          amount: number
          paid_at?: string | null
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          user_id?: string
          stage?: string
          amount?: number
          paid_at?: string | null
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'payments_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
        ]
      }
      health_records: {
        Row: {
          id: string
          user_id: string
          record_date: string
          weight_kg: number | null
          body_fat_pct: number | null
          muscle_kg: number | null
          bmi: number | null
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          record_date?: string
          weight_kg?: number | null
          body_fat_pct?: number | null
          muscle_kg?: number | null
          bmi?: number | null
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          record_date?: string
          weight_kg?: number | null
          body_fat_pct?: number | null
          muscle_kg?: number | null
          bmi?: number | null
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'health_records_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      health_profile: {
        Row: {
          user_id: string
          height_cm: number | null
          birth_date: string | null
          gender: HealthGenderLiteral | null
          blood_type: HealthBloodTypeLiteral | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          height_cm?: number | null
          birth_date?: string | null
          gender?: HealthGenderLiteral | null
          blood_type?: HealthBloodTypeLiteral | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          height_cm?: number | null
          birth_date?: string | null
          gender?: HealthGenderLiteral | null
          blood_type?: HealthBloodTypeLiteral | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'health_profile_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      health_goal: {
        Row: {
          id: string
          user_id: string
          goal_type: HealthGoalTypeLiteral | null
          start_weight_kg: number | null
          start_date: string | null
          target_weight_kg: number | null
          target_body_fat_pct: number | null
          target_date: string | null
          achieved_date: string | null
          status: HealthGoalStatusLiteral
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          goal_type?: HealthGoalTypeLiteral | null
          start_weight_kg?: number | null
          start_date?: string | null
          target_weight_kg?: number | null
          target_body_fat_pct?: number | null
          target_date?: string | null
          achieved_date?: string | null
          status?: HealthGoalStatusLiteral
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          goal_type?: HealthGoalTypeLiteral | null
          start_weight_kg?: number | null
          start_date?: string | null
          target_weight_kg?: number | null
          target_body_fat_pct?: number | null
          target_date?: string | null
          achieved_date?: string | null
          status?: HealthGoalStatusLiteral
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'health_goal_user_id_fkey'
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

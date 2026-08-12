-- ============================================================
-- 轩屿工作台 · 接单平台 数据表结构
-- 在 Supabase 控制台 → SQL Editor 中执行本脚本
-- ============================================================

-- ---------- 1. 创建 orders 表 ----------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_name text not null,
  client_name text,
  amount numeric(12, 2),
  status text not null default 'pending'
    check (status in ('pending','negotiating','in_progress','completed','paid','cancelled')),
  progress smallint not null default 0 check (progress between 0 and 100),
  description text,
  start_date date,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- 2. 更新时间触发器（updated_at 自动刷新） ----------
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
  before update on public.orders
  for each row
  execute function public.handle_updated_at();

-- ---------- 3. 索引 ----------
create index if not exists idx_orders_user_id on public.orders (user_id);
create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_orders_created_at on public.orders (created_at desc);

-- ---------- 4. 行级安全（RLS）：每个用户只能读写自己的数据 ----------
alter table public.orders enable row level security;

drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders
  for select using (auth.uid() = user_id);

drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own" on public.orders
  for insert with check (auth.uid() = user_id);

drop policy if exists "orders_update_own" on public.orders;
create policy "orders_update_own" on public.orders
  for update using (auth.uid() = user_id);

drop policy if exists "orders_delete_own" on public.orders;
create policy "orders_delete_own" on public.orders
  for delete using (auth.uid() = user_id);

-- ---------- 5. 权限：仅授予登录用户（authenticated）表权限，anon 保持无权限（最小权限原则，RLS 兜底） ----------
grant select, insert, update, delete on table public.orders to authenticated;

-- ============================================================
-- 头像存储（Supabase Storage）
-- 说明：avatar_url 存于 auth.users.user_metadata；图片文件存 Storage
-- ============================================================

-- ---------- 6. 创建公开的 avatars bucket（图片经公开 URL 访问） ----------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- ---------- 7. avatars RLS：每个用户只能读写自己目录（avatars/{user_id}/...）下的文件 ----------
drop policy if exists "avatars_own" on storage.objects;
create policy "avatars_own" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
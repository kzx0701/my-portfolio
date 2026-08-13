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
  project_type text
    check (project_type in ('web','app','miniapp','other')),
  channel text
    check (channel in ('xianyu','wechat')),
  amount numeric(12, 2),
  status text not null default 'negotiating'
    check (status in ('negotiating','quoted','in_progress','completed','cancelled')),
  repo_url text,
  description text,
  start_date date,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- 1.1 存量表迁移（若此前已按旧结构建表） ----------
-- 状态 6 态 → 4 态：待报价并入洽谈中，已回款并入已完成
alter table public.orders drop constraint if exists orders_status_check;
update public.orders set status = 'negotiating' where status = 'pending';
update public.orders set status = 'completed' where status = 'paid';
alter table public.orders
  add constraint orders_status_check check (status in ('negotiating','quoted','in_progress','completed','cancelled'));
-- 新增渠道来源列（闲鱼 / 微信）
alter table public.orders add column if not exists channel text
  check (channel in ('xianyu','wechat'));
-- 项目类型恢复为下拉单选：text[] → text（临时列 + UPDATE 拍平取第一个标量，兼容已是 text 的情况，幂等）
alter table public.orders drop constraint if exists orders_project_type_check;
alter table public.orders add column if not exists project_type text;
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders'
      and column_name = 'project_type' and data_type = 'ARRAY'
  ) then
    alter table public.orders drop column if exists project_type_new;
    alter table public.orders add column project_type_new text;
    update public.orders
    set project_type_new = (
      select regexp_replace(e, '[{}[\]]', '', 'g')
      from unnest(project_type) e
      where regexp_replace(e, '[{}[\]]', '', 'g') <> ''
      limit 1
    )
    where project_type is not null and cardinality(project_type) > 0;
    alter table public.orders drop column project_type;
    alter table public.orders rename column project_type_new to project_type;
  end if;
end $$;
alter table public.orders
  add constraint orders_project_type_check check (project_type in ('web','app','miniapp','other'));
-- 新增项目地址列（GitHub / Gitee 仓库链接，可空）
alter table public.orders add column if not exists repo_url text;
-- 移除进度列（字段规范后不再记录百分比进度）
alter table public.orders drop column if exists progress;

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

-- ============================================================
-- 回款记录（payments）
-- ============================================================

-- ---------- 8. 创建 payments 表 ----------
-- stage：回款阶段标识（deposit 定金 / final 尾款），不做 check 约束以便未来扩展新阶段（如中期款）
-- 前端通过 PAYMENT_STAGE_META 控制可选阶段；"定金+尾款=订单金额"由前端校验（已回款合计不得超过订单金额）
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  stage text not null default 'deposit',
  amount numeric(12, 2) not null check (amount > 0),
  paid_at date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- 9. payments 索引 ----------
create index if not exists idx_payments_order_id on public.payments (order_id);
create index if not exists idx_payments_user_id on public.payments (user_id);

-- ---------- 10. payments RLS：每个用户只能读写自己的回款记录 ----------
alter table public.payments enable row level security;

drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own" on public.payments
  for select using (auth.uid() = user_id);

drop policy if exists "payments_insert_own" on public.payments;
create policy "payments_insert_own" on public.payments
  for insert with check (auth.uid() = user_id);

drop policy if exists "payments_update_own" on public.payments;
create policy "payments_update_own" on public.payments
  for update using (auth.uid() = user_id);

drop policy if exists "payments_delete_own" on public.payments;
create policy "payments_delete_own" on public.payments
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on table public.payments to authenticated;
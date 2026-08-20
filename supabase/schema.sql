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

-- ============================================================
-- 健康记录（health_records）
-- ============================================================

-- ---------- 11. 创建 health_records 表 ----------
-- 一行一次测量；核心为体重体系（weight/body_fat/muscle），BMI 可手动录入（bmi 列），留空时由前端按档案身高自动计算（weight ÷ height²）
create table if not exists public.health_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  record_date date not null default current_date,
  weight_kg numeric(5, 2),
  height_cm numeric(5, 2),
  body_fat_pct numeric(4, 1),
  muscle_kg numeric(5, 2),
  bmi numeric(5, 2),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint health_records_weight_check check (weight_kg is null or weight_kg between 20 and 300),
  constraint health_records_height_check check (height_cm is null or height_cm between 50 and 250),
  constraint health_records_body_fat_check check (body_fat_pct is null or body_fat_pct between 3 and 70),
  constraint health_records_muscle_check check (muscle_kg is null or muscle_kg between 10 and 150),
  constraint health_records_bmi_check check (bmi is null or bmi between 10 and 60)
);

-- ---------- 11.1 BMI 列迁移（幂等；兼容已建表的场景） ----------
-- bmi：手动录入的 BMI（选填），留空时前端自动计算
alter table public.health_records add column if not exists bmi numeric(5, 2)
  check (bmi is null or bmi between 10 and 60);

-- ---------- 11.2 一天一条记录约束（幂等；兼容已有重复数据的场景） ----------
-- 业务规则：同一用户同一天仅能有一条健康记录（前端校验 + 数据库唯一约束兜底）
-- 先清理同 user+date 的重复记录（保留最早创建的一条），再建唯一约束
delete from public.health_records a
using public.health_records b
where a.user_id = b.user_id
  and a.record_date = b.record_date
  and a.id <> b.id
  and a.created_at > b.created_at;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'health_records_user_date_unique'
      and conrelid = 'public.health_records'::regclass
  ) then
    alter table public.health_records
      add constraint health_records_user_date_unique unique (user_id, record_date);
  end if;
end $$;

-- ---------- 12. health_records 更新时间触发器（复用 handle_updated_at 函数） ----------
drop trigger if exists set_health_records_updated_at on public.health_records;
create trigger set_health_records_updated_at
  before update on public.health_records
  for each row
  execute function public.handle_updated_at();

-- ---------- 13. health_records 索引 ----------
create index if not exists idx_health_records_user_id on public.health_records (user_id);
create index if not exists idx_health_records_record_date on public.health_records (record_date desc);

-- ---------- 14. health_records RLS：每个用户只能读写自己的健康记录 ----------
alter table public.health_records enable row level security;

drop policy if exists "health_records_select_own" on public.health_records;
create policy "health_records_select_own" on public.health_records
  for select using (auth.uid() = user_id);

drop policy if exists "health_records_insert_own" on public.health_records;
create policy "health_records_insert_own" on public.health_records
  for insert with check (auth.uid() = user_id);

drop policy if exists "health_records_update_own" on public.health_records;
create policy "health_records_update_own" on public.health_records
  for update using (auth.uid() = user_id);

drop policy if exists "health_records_delete_own" on public.health_records;
create policy "health_records_delete_own" on public.health_records
  for delete using (auth.uid() = user_id);

-- ---------- 15. 权限：仅授予登录用户（authenticated），anon 保持无权限（最小权限原则，RLS 兜底） ----------
grant select, insert, update, delete on table public.health_records to authenticated;

-- ============================================================
-- 个人健康档案（health_profile）
-- ============================================================

-- ---------- 16. 健康记录移除身高列 ----------
-- 身高改为在个人档案中统一维护（固定属性），健康记录的 BMI 用档案身高计算；
-- 幂等迁移，可重复执行（注意：会删除 health_records 中已存在的 height_cm 数据）
alter table public.health_records drop column if exists height_cm;

-- ---------- 17. 创建 health_profile 表（每用户一条，user_id 即主键；仅存固定生理属性） ----------
create table if not exists public.health_profile (
  user_id uuid primary key references auth.users (id) on delete cascade,
  height_cm numeric(5, 2),
  birth_date date,
  gender text check (gender in ('male', 'female')),
  blood_type text check (blood_type in ('A', 'B', 'AB', 'O')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint health_profile_height_check check (height_cm is null or height_cm between 50 and 250)
);

-- ---------- 18. 创建 health_goal 表（每用户可多个目标：id 主键 + user_id 外键；目标与档案拆分） ----------
create table if not exists public.health_goal (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_type text check (goal_type in ('fat_loss', 'muscle_gain', 'maintain')),
  start_weight_kg numeric(5, 2),
  start_date date,
  target_weight_kg numeric(5, 2),
  target_body_fat_pct numeric(4, 1),
  target_date date,
  achieved_date date,
  status text not null default 'in_progress',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint health_goal_status_check check (status in ('in_progress', 'completed', 'cancelled')),
  constraint health_goal_start_weight_check check (start_weight_kg is null or start_weight_kg between 20 and 300),
  constraint health_goal_target_weight_check check (target_weight_kg is null or target_weight_kg between 20 and 300),
  constraint health_goal_target_body_fat_check check (target_body_fat_pct is null or target_body_fat_pct between 3 and 70)
);

-- ---------- 18.1a 达成日期列迁移（幂等；兼容已建表的场景） ----------
-- achieved_date：实际达成日期（计划期限为 target_date）；标记完成时自动写入，可在表单调整
alter table public.health_goal add column if not exists achieved_date date;

-- ---------- 18.1 旧 1:1 结构迁移（兼容已按 user_id 主键建的 health_goal，幂等可重复执行） ----------
-- 旧结构无 id/status 列：drop user_id 主键 → 补 id 主键 + status 默认列
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'health_goal' and column_name = 'id'
  ) and exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'health_goal'
  ) then
    alter table public.health_goal drop constraint if exists health_goal_pkey;
    alter table public.health_goal add column id uuid;
    update public.health_goal set id = gen_random_uuid() where id is null;
    alter table public.health_goal alter column id set not null;
    alter table public.health_goal add constraint health_goal_pkey primary key (id);
    alter table public.health_goal add column status text not null default 'in_progress';
  end if;
end $$;
alter table public.health_goal drop constraint if exists health_goal_status_check;
alter table public.health_goal add constraint health_goal_status_check check (status in ('in_progress', 'completed', 'cancelled'));

-- ---------- 18.2 health_goal 索引 ----------
create index if not exists idx_health_goal_user_id on public.health_goal (user_id);
create index if not exists idx_health_goal_status on public.health_goal (status);
create index if not exists idx_health_goal_created_at on public.health_goal (created_at desc);

-- ---------- 19. health_goal 更新时间触发器（复用 handle_updated_at 函数） ----------
drop trigger if exists set_health_goal_updated_at on public.health_goal;
create trigger set_health_goal_updated_at
  before update on public.health_goal
  for each row
  execute function public.handle_updated_at();

-- ---------- 20. health_goal RLS：每个用户只能读写自己的目标 ----------
alter table public.health_goal enable row level security;

drop policy if exists "health_goal_select_own" on public.health_goal;
create policy "health_goal_select_own" on public.health_goal
  for select using (auth.uid() = user_id);

drop policy if exists "health_goal_insert_own" on public.health_goal;
create policy "health_goal_insert_own" on public.health_goal
  for insert with check (auth.uid() = user_id);

drop policy if exists "health_goal_update_own" on public.health_goal;
create policy "health_goal_update_own" on public.health_goal
  for update using (auth.uid() = user_id);

drop policy if exists "health_goal_delete_own" on public.health_goal;
create policy "health_goal_delete_own" on public.health_goal
  for delete using (auth.uid() = user_id);

-- ---------- 21. 权限：仅授予登录用户（authenticated） ----------
grant select, insert, update, delete on table public.health_goal to authenticated;

-- ---------- 21.1 旧档案目标数据迁移（目标从 health_profile 拆出到 health_goal，幂等可重复执行） ----------
-- 仅当 health_profile 仍含目标列（旧结构）时执行一次；执行后列被删除，再次运行自动跳过
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'health_profile' and column_name = 'goal_type'
  ) then
    insert into public.health_goal
      (user_id, goal_type, start_weight_kg, start_date, target_weight_kg, target_body_fat_pct, target_date)
    select user_id, goal_type, start_weight_kg, start_date, target_weight_kg, target_body_fat_pct, target_date
    from public.health_profile
    where goal_type is not null
       or target_weight_kg is not null
       or start_weight_kg is not null;
  end if;
end $$;

alter table public.health_profile drop column if exists goal_type;
alter table public.health_profile drop column if exists target_weight_kg;
alter table public.health_profile drop column if exists target_body_fat_pct;
alter table public.health_profile drop column if exists start_weight_kg;
alter table public.health_profile drop column if exists start_date;
alter table public.health_profile drop column if exists target_date;

-- ---------- 22. health_profile 更新时间触发器（复用 handle_updated_at 函数） ----------
drop trigger if exists set_health_profile_updated_at on public.health_profile;
create trigger set_health_profile_updated_at
  before update on public.health_profile
  for each row
  execute function public.handle_updated_at();

-- ---------- 23. health_profile RLS：每个用户只能读写自己的档案 ----------
alter table public.health_profile enable row level security;

drop policy if exists "health_profile_select_own" on public.health_profile;
create policy "health_profile_select_own" on public.health_profile
  for select using (auth.uid() = user_id);

drop policy if exists "health_profile_insert_own" on public.health_profile;
create policy "health_profile_insert_own" on public.health_profile
  for insert with check (auth.uid() = user_id);

drop policy if exists "health_profile_update_own" on public.health_profile;
create policy "health_profile_update_own" on public.health_profile
  for update using (auth.uid() = user_id);

drop policy if exists "health_profile_delete_own" on public.health_profile;
create policy "health_profile_delete_own" on public.health_profile
  for delete using (auth.uid() = user_id);

-- ---------- 24. 权限：仅授予登录用户（authenticated） ----------
grant select, insert, update, delete on table public.health_profile to authenticated;

-- ============================================================
-- 知识库（knowledge_articles / knowledge_secrets）
-- ============================================================

-- ---------- 25. 创建 knowledge_articles 表（笔记：开发心得 / 知识沉淀） ----------
-- category：单选分类（前端 CATEGORY_META 预设：frontend/backend/ai/tools/notes，可扩展故不加 check，与 payments.stage 同思路）
-- tags：多标签（text[]，自由组织）
-- content：Markdown 正文
-- is_pinned：置顶（列表置顶展示）
-- is_archived：归档（从默认列表隐藏，保留数据可查）
create table if not exists public.knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  category text,
  tags text[] not null default '{}',
  content text not null default '',
  is_pinned boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- 26. knowledge_articles 更新时间触发器（复用 handle_updated_at 函数） ----------
drop trigger if exists set_knowledge_articles_updated_at on public.knowledge_articles;
create trigger set_knowledge_articles_updated_at
  before update on public.knowledge_articles
  for each row
  execute function public.handle_updated_at();

-- ---------- 27. knowledge_articles 索引 ----------
create index if not exists idx_knowledge_articles_user_id on public.knowledge_articles (user_id);
create index if not exists idx_knowledge_articles_created_at on public.knowledge_articles (created_at desc);
create index if not exists idx_knowledge_articles_pinned on public.knowledge_articles (user_id, is_pinned);

-- ---------- 28. knowledge_articles RLS：每个用户只能读写自己的笔记 ----------
alter table public.knowledge_articles enable row level security;

drop policy if exists "knowledge_articles_select_own" on public.knowledge_articles;
create policy "knowledge_articles_select_own" on public.knowledge_articles
  for select using (auth.uid() = user_id);

drop policy if exists "knowledge_articles_insert_own" on public.knowledge_articles;
create policy "knowledge_articles_insert_own" on public.knowledge_articles
  for insert with check (auth.uid() = user_id);

drop policy if exists "knowledge_articles_update_own" on public.knowledge_articles;
create policy "knowledge_articles_update_own" on public.knowledge_articles
  for update using (auth.uid() = user_id);

drop policy if exists "knowledge_articles_delete_own" on public.knowledge_articles;
create policy "knowledge_articles_delete_own" on public.knowledge_articles
  for delete using (auth.uid() = user_id);

-- ---------- 28.1 权限：仅授予登录用户（authenticated），anon 保持无权限（最小权限原则，RLS 兜底） ----------
grant select, insert, update, delete on table public.knowledge_articles to authenticated;

-- ============================================================
-- AI 中心（ai_services / ai_usage_records / ai_secrets）
-- 说明：密钥管理自知识库迁出至本模块（knowledge_secrets 段已移除，
-- 因其未在线上建表，直接重定义为 ai_secrets，无数据迁移负担）
-- ============================================================

-- ---------- 29. 创建 ai_services 表（AI 工具账号：余额与周期配额手工维护） ----------
-- balance：当前剩余额度（积分 / 金额，手工维护）
-- balance_updated_at：余额最后更新时间（仪表盘按此做新鲜度提示：超 7 天提醒可能过期）
-- quota_limit / quota_reset_time：周期配额模型（如 WorkBuddy 企业版每月额度 + 重置时间；非周期制工具可空）
-- service_type：前端 SERVICE_TYPE_META 预设（workbuddy/trae/relay/other），无 check 可扩展
create table if not exists public.ai_services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  service_type text,
  kind text,
  plan text,
  base_url text,
  balance_query_url text,
  balance numeric(12, 2),
  balance_updated_at timestamptz,
  quota_limit numeric(12, 2),
  quota_reset_time timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- 29.1 幂等迁移：kind / balance_query_url 列（兼容已建表） ----------
-- kind：工具形态（model_api 官方模型 API / agent Agent 工具），前端 TOOL_KIND_META 预设
-- balance_query_url：余额查询接口地址（模型 API 类自动查余量用；Agent 类可空）
alter table public.ai_services add column if not exists kind text;
alter table public.ai_services add column if not exists balance_query_url text;

-- ---------- 30. ai_services 更新时间触发器（复用 handle_updated_at 函数） ----------
drop trigger if exists set_ai_services_updated_at on public.ai_services;
create trigger set_ai_services_updated_at
  before update on public.ai_services
  for each row
  execute function public.handle_updated_at();

-- ---------- 31. ai_services 索引 ----------
create index if not exists idx_ai_services_user_id on public.ai_services (user_id);
create index if not exists idx_ai_services_created_at on public.ai_services (created_at desc);

-- ---------- 32. ai_services RLS：每个用户只能读写自己的 AI 工具 ----------
alter table public.ai_services enable row level security;

drop policy if exists "ai_services_select_own" on public.ai_services;
create policy "ai_services_select_own" on public.ai_services
  for select using (auth.uid() = user_id);

drop policy if exists "ai_services_insert_own" on public.ai_services;
create policy "ai_services_insert_own" on public.ai_services
  for insert with check (auth.uid() = user_id);

drop policy if exists "ai_services_update_own" on public.ai_services;
create policy "ai_services_update_own" on public.ai_services
  for update using (auth.uid() = user_id);

drop policy if exists "ai_services_delete_own" on public.ai_services;
create policy "ai_services_delete_own" on public.ai_services
  for delete using (auth.uid() = user_id);

-- ---------- 32.1 权限：仅授予登录用户（authenticated），anon 保持无权限（最小权限原则，RLS 兜底） ----------
grant select, insert, update, delete on table public.ai_services to authenticated;

-- ---------- 33. 创建 ai_usage_records 表（AI 消费记录：手动逐笔添加，统计聚合） ----------
-- usage_date：消费日期（YYYY-MM-DD，按天记录；同天可多条，不做唯一约束；统计按月聚合取前 7 位）
-- amount：消费金额（固定人民币，必填，≥0）
-- payment_method：支付方式（前端 PAYMENT_METHOD_META 预设：alipay/wechat/bank/company/other，无 check 可扩展）
create table if not exists public.ai_usage_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  service_id uuid not null references public.ai_services (id) on delete cascade,
  usage_date date not null default current_date,
  amount numeric(12, 2) not null default 0 check (amount >= 0),
  payment_method text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- 33.1 幂等迁移：usage_month → usage_date、移除 tokens（兼容已按旧结构建表） ----------
alter table public.ai_usage_records add column if not exists usage_date date;
alter table public.ai_usage_records alter column usage_date set default current_date;
alter table public.ai_usage_records alter column usage_date set not null;
alter table public.ai_usage_records alter column amount set default 0;
alter table public.ai_usage_records alter column amount set not null;
alter table public.ai_usage_records drop column if exists tokens;
-- 仅当旧表存在 usage_month 列时迁移数据并删除该列（新表结构无此列，直接跳过，避免 42703）
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ai_usage_records'
      and column_name = 'usage_month'
  ) then
    update public.ai_usage_records
    set usage_date = to_date(usage_month || '-01', 'YYYY-MM-DD')
    where usage_date is null and usage_month is not null;
    alter table public.ai_usage_records drop column usage_month;
  end if;
end $$;

-- ---------- 33.2 幂等迁移：payment_method 列（兼容已按旧结构建表） ----------
alter table public.ai_usage_records add column if not exists payment_method text;

-- ---------- 34. ai_usage_records 更新时间触发器（复用 handle_updated_at 函数） ----------
drop trigger if exists set_ai_usage_records_updated_at on public.ai_usage_records;
create trigger set_ai_usage_records_updated_at
  before update on public.ai_usage_records
  for each row
  execute function public.handle_updated_at();

-- ---------- 35. ai_usage_records 索引 ----------
create index if not exists idx_ai_usage_records_user_id on public.ai_usage_records (user_id);
create index if not exists idx_ai_usage_records_service_id on public.ai_usage_records (service_id);
create index if not exists idx_ai_usage_records_date on public.ai_usage_records (usage_date desc);

-- ---------- 36. ai_usage_records RLS：每个用户只能读写自己的消费记录 ----------
alter table public.ai_usage_records enable row level security;

drop policy if exists "ai_usage_records_select_own" on public.ai_usage_records;
create policy "ai_usage_records_select_own" on public.ai_usage_records
  for select using (auth.uid() = user_id);

drop policy if exists "ai_usage_records_insert_own" on public.ai_usage_records;
create policy "ai_usage_records_insert_own" on public.ai_usage_records
  for insert with check (auth.uid() = user_id);

drop policy if exists "ai_usage_records_update_own" on public.ai_usage_records;
create policy "ai_usage_records_update_own" on public.ai_usage_records
  for update using (auth.uid() = user_id);

drop policy if exists "ai_usage_records_delete_own" on public.ai_usage_records;
create policy "ai_usage_records_delete_own" on public.ai_usage_records
  for delete using (auth.uid() = user_id);

-- ---------- 36.1 权限：仅授予登录用户（authenticated） ----------
grant select, insert, update, delete on table public.ai_usage_records to authenticated;

-- ---------- 37. 创建 ai_secrets 表（AI 密钥：自知识库迁出，挂所属工具） ----------
-- service_id：关联 ai_services（可空，on delete set null —— 工具删除后密钥保留）
-- key_value：明文存储（已确认方案 A：RLS 隔离 + 前端打码展示 + 复制后不残留）
create table if not exists public.ai_secrets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  service_id uuid references public.ai_services (id) on delete set null,
  name text not null,
  service text,
  key_value text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- 38. ai_secrets 更新时间触发器（复用 handle_updated_at 函数） ----------
drop trigger if exists set_ai_secrets_updated_at on public.ai_secrets;
create trigger set_ai_secrets_updated_at
  before update on public.ai_secrets
  for each row
  execute function public.handle_updated_at();

-- ---------- 39. ai_secrets 索引 ----------
create index if not exists idx_ai_secrets_user_id on public.ai_secrets (user_id);
create index if not exists idx_ai_secrets_service_id on public.ai_secrets (service_id);
create index if not exists idx_ai_secrets_created_at on public.ai_secrets (created_at desc);

-- ---------- 40. ai_secrets RLS：每个用户只能读写自己的密钥 ----------
alter table public.ai_secrets enable row level security;

drop policy if exists "ai_secrets_select_own" on public.ai_secrets;
create policy "ai_secrets_select_own" on public.ai_secrets
  for select using (auth.uid() = user_id);

drop policy if exists "ai_secrets_insert_own" on public.ai_secrets;
create policy "ai_secrets_insert_own" on public.ai_secrets
  for insert with check (auth.uid() = user_id);

drop policy if exists "ai_secrets_update_own" on public.ai_secrets;
create policy "ai_secrets_update_own" on public.ai_secrets
  for update using (auth.uid() = user_id);

drop policy if exists "ai_secrets_delete_own" on public.ai_secrets;
create policy "ai_secrets_delete_own" on public.ai_secrets
  for delete using (auth.uid() = user_id);

-- ---------- 40.1 权限：仅授予登录用户（authenticated） ----------
grant select, insert, update, delete on table public.ai_secrets to authenticated;
-- ---------- 29.2 添加控制台 URL 字段 ----------
alter table public.ai_services add column if not exists console_url text;

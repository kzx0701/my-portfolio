-- 工作日志：每条记录代表某一天的一项工作事项。
create table public.work_log_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  work_date date not null,
  title text not null,
  description text,
  status text not null default 'pending',
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint work_log_items_title_check check (char_length(btrim(title)) between 1 and 200),
  constraint work_log_items_status_check check (status in ('pending', 'completed', 'cancelled'))
);

create index idx_work_log_items_user_date
  on public.work_log_items (user_id, work_date);
create index idx_work_log_items_user_status_date
  on public.work_log_items (user_id, status, work_date);
create index idx_work_log_items_user_completed_at
  on public.work_log_items (user_id, completed_at desc)
  where status = 'completed';

create trigger set_work_log_items_updated_at
  before update on public.work_log_items
  for each row execute function public.handle_updated_at();

alter table public.work_log_items enable row level security;

revoke all on table public.work_log_items from anon, authenticated;
grant select, insert, update, delete on table public.work_log_items to authenticated;

create policy "work_log_items_select_own" on public.work_log_items
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "work_log_items_insert_own" on public.work_log_items
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "work_log_items_update_own" on public.work_log_items
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "work_log_items_delete_own" on public.work_log_items
  for delete to authenticated using ((select auth.uid()) = user_id);

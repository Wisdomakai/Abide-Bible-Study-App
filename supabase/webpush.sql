-- ============================================================================
-- Web Push (PWA) subscriptions. Run AFTER schema.sql + notifications.sql.
-- The notify-group Edge Function reads these (service role) to send web pushes.
-- ============================================================================
create table if not exists public.web_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete cascade,
  group_code  text,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists web_sub_user_idx on public.web_subscriptions (user_id);

alter table public.web_subscriptions enable row level security;

-- A user manages only their own subscriptions; the admin/notify functions use
-- the service role (which bypasses RLS) to read them when fanning out pushes.
drop policy if exists web_sub_own on public.web_subscriptions;
create policy web_sub_own on public.web_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

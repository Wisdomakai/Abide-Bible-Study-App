-- ============================================================================
-- Admin: track logins so the super-admin page can show activity, a per-open
-- audit log, and per-group/per-user stats. Run AFTER schema.sql. Safe to re-run.
-- ============================================================================

-- 1. Most-recent app open per user.
alter table public.profiles add column if not exists last_seen timestamptz default now();

-- 2. Full login audit log — one row per app open.
create table if not exists public.logins (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete cascade,
  name        text,
  group_code  text,
  created_at  timestamptz not null default now()
);
create index if not exists logins_created_idx on public.logins (created_at desc);

alter table public.logins enable row level security;
-- Users may only insert their own login rows; reading is done by the admin
-- Edge Function via the service-role key (which bypasses RLS).
drop policy if exists logins_insert on public.logins;
create policy logins_insert on public.logins for insert to authenticated
  with check (user_id = auth.uid());

-- 3. join_group now stamps last_seen AND records a login each time the app connects.
create or replace function public.join_group (p_code text, p_name text, p_group_name text default 'Our Bible Study')
returns uuid language plpgsql security definer set search_path = public as $$
declare gid uuid;
begin
  insert into public.profiles (id, name, last_seen) values (auth.uid(), p_name, now())
    on conflict (id) do update set name = excluded.name, last_seen = now();

  select id into gid from public.groups where code = p_code;
  if gid is null then
    insert into public.groups (name, code) values (p_group_name, p_code) returning id into gid;
  end if;

  insert into public.memberships (group_id, user_id) values (gid, auth.uid())
    on conflict do nothing;

  insert into public.logins (user_id, name, group_code) values (auth.uid(), p_name, p_code);

  return gid;
end;
$$;

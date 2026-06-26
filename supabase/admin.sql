-- ============================================================================
-- Admin: track when users open the app, so the super-admin page can list logins.
-- Run AFTER schema.sql. Safe to run again.
-- ============================================================================

-- 1. Record each user's most recent app open.
alter table public.profiles add column if not exists last_seen timestamptz default now();

-- 2. Update join_group so it stamps last_seen every time the app connects.
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

  return gid;
end;
$$;

-- profiles_read (from schema.sql) already lets any signed-in client read profile
-- rows, which is what the admin page uses (anon key + anonymous session).

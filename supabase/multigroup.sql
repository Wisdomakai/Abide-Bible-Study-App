-- ============================================================================
-- Multi-group support: group name + admin name, and a way to list YOUR groups.
-- Run AFTER schema.sql + admin.sql. Safe to re-run.
-- ============================================================================

-- 1. Each group records who created it (the admin) — shown alongside the code.
alter table public.groups add column if not exists admin_name text;

-- 2. join_group now also stores the admin name when a group is first created.
create or replace function public.join_group (
  p_code text, p_name text,
  p_group_name text default 'Our Bible Study',
  p_admin_name text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare gid uuid;
begin
  insert into public.profiles (id, name, last_seen) values (auth.uid(), p_name, now())
    on conflict (id) do update set name = excluded.name, last_seen = now();

  select id into gid from public.groups where code = p_code;
  if gid is null then
    insert into public.groups (name, code, admin_name)
      values (p_group_name, p_code, coalesce(p_admin_name, p_name)) returning id into gid;
  end if;

  insert into public.memberships (group_id, user_id) values (gid, auth.uid())
    on conflict do nothing;

  insert into public.logins (user_id, name, group_code) values (auth.uid(), p_name, p_code);

  return gid;
end;
$$;

-- 3. List the groups the current user belongs to, with member + activity counts.
create or replace function public.my_groups ()
returns table (id uuid, name text, code text, admin_name text, members bigint, last_post timestamptz)
language sql security definer set search_path = public stable as $$
  select g.id, g.name, g.code, g.admin_name,
    (select count(*) from public.memberships m2 where m2.group_id = g.id) as members,
    (select max(p.created_at) from public.posts p where p.group_id = g.id) as last_post
  from public.groups g
  join public.memberships m on m.group_id = g.id and m.user_id = auth.uid()
  order by last_post desc nulls last, g.name;
$$;

-- 4. Optional: let a member leave a group.
create or replace function public.leave_group (p_group_id uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.memberships where group_id = p_group_id and user_id = auth.uid();
$$;

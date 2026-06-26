-- ============================================================================
-- Abide — Bible Study Journal: backend schema for the shared Group feed.
-- Paste this whole file into Supabase → SQL Editor → Run. Safe to run again.
-- ============================================================================

-- ── Tables ──────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  code        text not null unique,
  created_at  timestamptz not null default now()
);

create table if not exists public.memberships (
  group_id    uuid not null references public.groups (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.groups (id) on delete cascade,
  author_id   uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  type        text not null check (type in ('reflection', 'note', 'prayer')),
  text        text not null,
  ref         text,
  created_at  timestamptz not null default now()
);
create index if not exists posts_group_created_idx on public.posts (group_id, created_at desc);

create table if not exists public.amens (
  post_id     uuid not null references public.posts (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  voter_name  text not null,
  created_at  timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ── Helper: is the current user a member of this group? ──────────────────────
create or replace function public.is_member (gid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.group_id = gid and m.user_id = auth.uid()
  );
$$;

-- ── Row Level Security ───────────────────────────────────────────────────────
alter table public.profiles    enable row level security;
alter table public.groups      enable row level security;
alter table public.memberships enable row level security;
alter table public.posts       enable row level security;
alter table public.amens       enable row level security;

-- profiles: anyone signed in can read names; you manage only your own row
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (true);
drop policy if exists profiles_write on public.profiles;
create policy profiles_write on public.profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- groups / memberships: members can read their groups
drop policy if exists groups_read on public.groups;
create policy groups_read on public.groups for select to authenticated
  using (public.is_member(id));
drop policy if exists memberships_read on public.memberships;
create policy memberships_read on public.memberships for select to authenticated
  using (user_id = auth.uid());

-- posts: read/write only within groups you belong to; you author as yourself
drop policy if exists posts_read on public.posts;
create policy posts_read on public.posts for select to authenticated
  using (public.is_member(group_id));
drop policy if exists posts_insert on public.posts;
create policy posts_insert on public.posts for insert to authenticated
  with check (author_id = auth.uid() and public.is_member(group_id));
drop policy if exists posts_delete on public.posts;
create policy posts_delete on public.posts for delete to authenticated
  using (author_id = auth.uid());

-- amens: read within your groups; add/remove only your own
drop policy if exists amens_read on public.amens;
create policy amens_read on public.amens for select to authenticated using (
  exists (select 1 from public.posts p where p.id = post_id and public.is_member(p.group_id))
);
drop policy if exists amens_write on public.amens;
create policy amens_write on public.amens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Join-or-create a group by code, and upsert your display name. ────────────
-- SECURITY DEFINER so a brand-new member can join before any membership exists.
create or replace function public.join_group (p_code text, p_name text, p_group_name text default 'Our Bible Study')
returns uuid language plpgsql security definer set search_path = public as $$
declare gid uuid;
begin
  insert into public.profiles (id, name) values (auth.uid(), p_name)
    on conflict (id) do update set name = excluded.name;

  select id into gid from public.groups where code = p_code;
  if gid is null then
    insert into public.groups (name, code) values (p_group_name, p_code) returning id into gid;
  end if;

  insert into public.memberships (group_id, user_id) values (gid, auth.uid())
    on conflict do nothing;

  return gid;
end;
$$;

-- ── Feed view: posts with their amens collapsed into a name array. ───────────
-- security_invoker = the caller's RLS applies (so you only see your group).
drop view if exists public.feed_with_amens;
create view public.feed_with_amens with (security_invoker = on) as
  select
    p.id, p.group_id, p.author_name as author, p.type, p.text, p.ref, p.created_at,
    coalesce(
      array_agg(a.voter_name order by a.created_at) filter (where a.voter_name is not null),
      '{}'
    ) as amens
  from public.posts p
  left join public.amens a on a.post_id = p.id
  group by p.id;

-- ── Realtime: broadcast inserts/updates/deletes on posts & amens. ────────────
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.amens;

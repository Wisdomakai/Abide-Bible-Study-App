-- Private group directory, mentions, and enforced voice limits.
-- Safe to run repeatedly after pwa.sql.

alter table public.posts
  add column if not exists mentioned_user_ids uuid[] not null default '{}'::uuid[];

alter table public.posts drop constraint if exists posts_audio_duration_check;
alter table public.posts add constraint posts_audio_duration_check
  check (audio_duration is null or audio_duration between 1 and 900);

-- A signed-in user may only read their own profile row directly. Shared-group
-- names are exposed through the membership-checked RPC below.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid());

create or replace function public.group_members(p_group_id uuid)
returns table(user_id uuid, name text, joined_at timestamptz, is_admin boolean)
language sql security definer stable set search_path = public as $$
  select m.user_id, coalesce(nullif(trim(p.name), ''), 'Member') as name,
    m.created_at as joined_at,
    m.created_at = min(m.created_at) over (partition by m.group_id) as is_admin
  from public.memberships m
  left join public.profiles p on p.id = m.user_id
  where m.group_id = p_group_id and public.is_member(p_group_id)
  order by is_admin desc, lower(coalesce(p.name, 'Member')), m.created_at;
$$;
revoke all on function public.group_members(uuid) from public;
grant execute on function public.group_members(uuid) to authenticated;

create or replace function public.valid_group_mentions(p_group_id uuid, p_user_ids uuid[])
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce(cardinality(p_user_ids), 0) <= 20
    and not exists (
      select 1 from unnest(coalesce(p_user_ids, '{}'::uuid[])) mentioned(user_id)
      where not exists (
        select 1 from public.memberships m
        where m.group_id = p_group_id and m.user_id = mentioned.user_id
      )
    );
$$;

drop policy if exists posts_insert on public.posts;
create policy posts_insert on public.posts for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.is_member(group_id)
    and public.valid_group_mentions(group_id, mentioned_user_ids)
  );

drop view if exists public.feed_with_amens;
create view public.feed_with_amens with (security_invoker = on) as
  select p.id, p.group_id, p.author_id, p.author_name as author, p.type, p.text, p.ref,
    p.audio_url, p.audio_duration, p.mentioned_user_ids, p.created_at,
    coalesce(array_agg(a.voter_name order by a.created_at) filter (where a.voter_name is not null), '{}') as amens
  from public.posts p left join public.amens a on a.post_id = p.id
  group by p.id;

-- The UI permits 15 minutes and 20 MiB. Enforce the byte ceiling at storage too.
update storage.buckets set file_size_limit = 20971520 where id = 'voice';

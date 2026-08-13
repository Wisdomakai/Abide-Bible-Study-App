-- Ardent PWA consolidated migration. Run after schema.sql on an existing project.
-- Idempotent: safe to run repeatedly.
create extension if not exists pgcrypto;

-- Web-only accounts keep their private journal in a user-owned cloud row.
create table if not exists public.journal_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.journal_state enable row level security;
drop policy if exists journal_state_own on public.journal_state;
create policy journal_state_own on public.journal_state for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Voice is a first-class post type.
alter table public.posts drop constraint if exists posts_type_check;
alter table public.posts add constraint posts_type_check
  check (type in ('reflection', 'note', 'prayer', 'voice'));
alter table public.posts add column if not exists audio_url text;
alter table public.posts add column if not exists audio_duration int;

-- Creating and joining are deliberately separate. A create can never silently
-- join an existing group, and a join can never create a typo-group.
drop function if exists public.join_group(text, text, text);
drop function if exists public.join_group(text, text, text, text);
create or replace function public.create_group(p_code text, p_name text, p_group_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare gid uuid;
begin
  if lower(trim(p_code)) !~ '^[a-z]{3,10}[0-9]{2}$' then
    raise exception 'Invite code must contain one Bible word and two digits';
  end if;
  insert into public.profiles(id, name, last_seen) values(auth.uid(), left(trim(p_name), 80), now())
    on conflict(id) do update set name = excluded.name, last_seen = now();
  insert into public.groups(name, code, admin_name)
    values(left(trim(p_group_name), 80), lower(trim(p_code)), left(trim(p_name), 80))
    returning id into gid;
  insert into public.memberships(group_id, user_id) values(gid, auth.uid());
  return gid;
exception when unique_violation then
  raise exception 'Invite code collision; generate a new code';
end;
$$;
revoke all on function public.create_group(text, text, text) from public;
grant execute on function public.create_group(text, text, text) to authenticated;

create or replace function public.join_group(p_code text, p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare gid uuid;
begin
  select id into gid from public.groups where code = lower(trim(p_code));
  if gid is null then raise exception 'Group not found'; end if;
  insert into public.profiles(id, name, last_seen) values(auth.uid(), left(trim(p_name), 80), now())
    on conflict(id) do update set name = excluded.name, last_seen = now();
  insert into public.memberships(group_id, user_id) values(gid, auth.uid()) on conflict do nothing;
  return gid;
end;
$$;
revoke all on function public.join_group(text, text) from public;
grant execute on function public.join_group(text, text) to authenticated;

-- Presence is recorded at most once per 30 minutes, independent of tab focus.
create or replace function public.touch_presence(p_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set last_seen = now(), name = left(trim(p_name), 80) where id = auth.uid();
  if not exists (
    select 1 from public.logins where user_id = auth.uid() and created_at > now() - interval '30 minutes'
  ) then
    insert into public.logins(user_id, name, group_code)
    select auth.uid(), left(trim(p_name), 80), g.code
    from public.memberships m join public.groups g on g.id = m.group_id
    where m.user_id = auth.uid() order by m.created_at limit 1;
  end if;
end;
$$;
revoke all on function public.touch_presence(text) from public;
grant execute on function public.touch_presence(text) to authenticated;

-- Private voice bucket. Users can read/delete their own folder. Group members
-- can read a recording only when a visible post references that exact path.
insert into storage.buckets(id, name, public) values('voice', 'voice', false)
  on conflict(id) do update set public = false;
drop policy if exists voice_upload on storage.objects;
drop policy if exists voice_read on storage.objects;
drop policy if exists voice_delete on storage.objects;
create policy voice_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'voice' and (storage.foldername(name))[1] = auth.uid()::text);
create policy voice_read on storage.objects for select to authenticated using (
  bucket_id = 'voice' and (
    (storage.foldername(name))[1] = auth.uid()::text or exists (
      select 1 from public.posts p
      where p.audio_url = name and public.is_member(p.group_id)
    )
  )
);
create policy voice_delete on storage.objects for delete to authenticated
  using (bucket_id = 'voice' and (storage.foldername(name))[1] = auth.uid()::text);

-- Web push and local-time reminder preferences.
alter table public.web_subscriptions add column if not exists reminder_enabled boolean not null default false;
alter table public.web_subscriptions add column if not exists reminder_hour smallint not null default 7 check (reminder_hour between 0 and 23);
alter table public.web_subscriptions add column if not exists reminder_minute smallint not null default 30 check (reminder_minute between 0 and 59);
alter table public.web_subscriptions add column if not exists timezone text not null default 'UTC';
alter table public.web_subscriptions add column if not exists last_reminded_on date;

create or replace function public.claim_web_subscription(
  p_endpoint text, p_p256dh text, p_auth text, p_timezone text,
  p_reminder_enabled boolean default false, p_reminder_hour smallint default 7, p_reminder_minute smallint default 30
)
returns void language sql security definer set search_path = public as $$
  insert into public.web_subscriptions(user_id, endpoint, p256dh, auth, timezone, reminder_enabled, reminder_hour, reminder_minute)
  values(auth.uid(), p_endpoint, p_p256dh, p_auth, p_timezone, p_reminder_enabled, p_reminder_hour, p_reminder_minute)
  on conflict(endpoint) do update set
    user_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth, timezone = excluded.timezone,
    reminder_enabled = excluded.reminder_enabled, reminder_hour = excluded.reminder_hour, reminder_minute = excluded.reminder_minute;
$$;
revoke all on function public.claim_web_subscription(text, text, text, text, boolean, smallint, smallint) from public;
grant execute on function public.claim_web_subscription(text, text, text, text, boolean, smallint, smallint) to authenticated;

-- Feed view exposes voice metadata and the stable author id.
drop view if exists public.feed_with_amens;
create view public.feed_with_amens with (security_invoker = on) as
  select p.id, p.group_id, p.author_id, p.author_name as author, p.type, p.text, p.ref,
    p.audio_url, p.audio_duration, p.created_at,
    coalesce(array_agg(a.voter_name order by a.created_at) filter (where a.voter_name is not null), '{}') as amens
  from public.posts p left join public.amens a on a.post_id = p.id
  group by p.id;

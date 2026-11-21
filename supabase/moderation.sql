-- ============================================================================
-- Moderation: report a group post, block a member.
-- Google Play and the App Store both require apps with user-generated content
-- to let people report objectionable posts and block abusive users.
-- Run after group-collaboration.sql. Safe to run again.
-- ============================================================================

-- ── Reports ─────────────────────────────────────────────────────────────────
-- The post text is copied at report time so the evidence survives if the
-- author deletes the post before an admin reviews it.
create table if not exists public.post_reports (
  id               uuid primary key default gen_random_uuid(),
  post_id          uuid references public.posts (id) on delete set null,
  group_id         uuid references public.groups (id) on delete cascade,
  reporter_id      uuid not null references auth.users (id) on delete cascade,
  reported_user_id uuid references auth.users (id) on delete set null,
  reported_name    text,
  post_type        text,
  post_snapshot    text,
  reason           text not null check (reason in ('spam', 'harassment', 'hateful', 'sexual', 'violence', 'other')),
  details          text check (char_length(details) <= 1000),
  status           text not null default 'open' check (status in ('open', 'removed', 'dismissed')),
  created_at       timestamptz not null default now(),
  resolved_at      timestamptz
);
create index if not exists post_reports_status_idx on public.post_reports (status, created_at desc);
-- One report per person per post; reporting again only updates the reason.
create unique index if not exists post_reports_once_idx on public.post_reports (post_id, reporter_id);

alter table public.post_reports enable row level security;
-- Reporters may see their own reports. Inserts go through report_post() and
-- review happens server-side in the admin-data function (service role).
drop policy if exists post_reports_read_own on public.post_reports;
create policy post_reports_read_own on public.post_reports for select to authenticated
  using (reporter_id = auth.uid());

create or replace function public.report_post (p_post_id uuid, p_reason text, p_details text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_post public.posts%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in to report a post'; end if;
  select * into v_post from public.posts where id = p_post_id;
  if not found or not public.is_member(v_post.group_id) then
    raise exception 'Post not found';
  end if;
  if v_post.author_id = auth.uid() then raise exception 'You cannot report your own post'; end if;

  insert into public.post_reports
    (post_id, group_id, reporter_id, reported_user_id, reported_name, post_type, post_snapshot, reason, details)
  values
    (v_post.id, v_post.group_id, auth.uid(), v_post.author_id, v_post.author_name, v_post.type,
     left(coalesce(v_post.text, ''), 4000), p_reason, nullif(left(trim(coalesce(p_details, '')), 1000), ''))
  on conflict (post_id, reporter_id) do update
    set reason = excluded.reason, details = excluded.details, status = 'open', resolved_at = null;
end;
$$;
revoke all on function public.report_post (uuid, text, text) from public, anon;
grant execute on function public.report_post (uuid, text, text) to authenticated;

-- ── Blocks ──────────────────────────────────────────────────────────────────
create table if not exists public.user_blocks (
  blocker_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  blocked_id   uuid not null references auth.users (id) on delete cascade,
  blocked_name text,
  created_at   timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.user_blocks enable row level security;
drop policy if exists user_blocks_own on public.user_blocks;
create policy user_blocks_own on public.user_blocks for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

-- ── Feed hides posts from members you have blocked ───────────────────────────
-- Same columns as group-collaboration.sql, plus the block filter.
drop view if exists public.feed_with_amens;
create view public.feed_with_amens with (security_invoker = on) as
  select p.id, p.group_id, p.author_id, p.author_name as author, p.type, p.text, p.ref,
    p.audio_url, p.audio_duration, p.mentioned_user_ids, p.created_at,
    coalesce(array_agg(a.voter_name order by a.created_at) filter (where a.voter_name is not null), '{}') as amens
  from public.posts p left join public.amens a on a.post_id = p.id
  where not exists (
    select 1 from public.user_blocks b
    where b.blocker_id = auth.uid() and b.blocked_id = p.author_id
  )
  group by p.id;

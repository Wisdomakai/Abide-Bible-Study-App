-- ============================================================================
-- Voice messages: audio columns on posts, a Storage bucket, and an updated feed
-- view. Run AFTER schema.sql (and the other migrations). Safe to re-run.
-- ============================================================================

-- 1. Posts can carry an audio recording.
alter table public.posts add column if not exists audio_url text;
alter table public.posts add column if not exists audio_duration int; -- seconds

-- 2. Feed view must expose the new columns (recreate it).
drop view if exists public.feed_with_amens;
create view public.feed_with_amens with (security_invoker = on) as
  select
    p.id, p.group_id, p.author_name as author, p.type, p.text, p.ref,
    p.audio_url, p.audio_duration, p.created_at,
    coalesce(array_agg(a.voter_name order by a.created_at) filter (where a.voter_name is not null), '{}') as amens
  from public.posts p
  left join public.amens a on a.post_id = p.id
  group by p.id;

-- 3. Public Storage bucket for the audio files.
insert into storage.buckets (id, name, public) values ('voice', 'voice', true)
  on conflict (id) do nothing;

-- 4. Signed-in users may upload; anyone may read (bucket is public).
drop policy if exists voice_upload on storage.objects;
create policy voice_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'voice');

drop policy if exists voice_read on storage.objects;
create policy voice_read on storage.objects for select
  using (bucket_id = 'voice');

drop policy if exists voice_delete on storage.objects;
create policy voice_delete on storage.objects for delete to authenticated
  using (bucket_id = 'voice');

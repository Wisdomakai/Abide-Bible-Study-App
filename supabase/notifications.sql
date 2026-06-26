-- ============================================================================
-- Push notifications add-on. Run AFTER schema.sql.
-- Sends an Expo push to the other group members when someone posts.
-- Requires the Edge Function `notify-group` to be deployed (see BUILD.md).
-- ============================================================================

-- 1. Store each member's Expo push token.
alter table public.profiles add column if not exists push_token text;

-- 2. Let the app save its own token (already covered by profiles_write policy).

-- 3. When a post is inserted, call the Edge Function to fan out notifications.
--    Uses pg_net (enabled by default on Supabase) to make the HTTP call.
create extension if not exists pg_net;

-- Values are hardcoded here because Supabase's managed `postgres` role can't
-- set custom database parameters. The function URL is public and the key below
-- is the publishable (anon) key — both are safe to embed.
create or replace function public.on_new_post_notify()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post(
    url     := 'https://udnczmdjjiltpehtvtas.functions.supabase.co/notify-group',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_sp9QVgDEqcd0YBpyL8h9xQ__84AG-1I'
    ),
    body    := jsonb_build_object('post_id', new.id)
  );
  return new;
end;
$$;

drop trigger if exists trg_new_post_notify on public.posts;
create trigger trg_new_post_notify
  after insert on public.posts
  for each row execute function public.on_new_post_notify();

-- ============================================================================
-- PWA Web Push trigger. Run after pwa.sql.
-- Requires the Edge Function `notify-group` to be deployed (see BUILD.md).
-- ============================================================================

-- When a post is inserted, call the Edge Function to fan out notifications.
--    Uses pg_net (enabled by default on Supabase) to make the HTTP call.
create extension if not exists pg_net;

-- The shared webhook secret is stored in Supabase Vault. This prevents callers
-- from invoking the unauthenticated Edge Function with arbitrary post IDs.
create or replace function public.on_new_post_notify()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  notify_secret text;
begin
  select decrypted_secret into notify_secret
  from vault.decrypted_secrets
  where name = 'notify_secret'
  limit 1;

  if notify_secret is null then
    raise warning 'notify_group webhook skipped: notify_secret is missing from Vault';
    return new;
  end if;

  perform net.http_post(
    url     := 'https://udnczmdjjiltpehtvtas.functions.supabase.co/notify-group',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', notify_secret
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

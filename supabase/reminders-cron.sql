-- ============================================================================
-- Daily reminder schedule for the installed PWA. Run after notifications.sql
-- (which stores `notify_secret` in Vault) and deploy notify-reminders with
-- verify_jwt = false. Safe to run again.
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Every minute, ask notify-reminders to push to anyone whose local reminder
-- time is now. The function skips people already reminded today, so a minute
-- with nothing due costs one cheap query. The secret is read from Vault at run
-- time, never written into the job.
select cron.unschedule(jobid) from cron.job where jobname = 'notify-reminders';
select cron.schedule(
  'notify-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url     := 'https://udnczmdjjiltpehtvtas.functions.supabase.co/notify-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'notify_secret' limit 1)
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);

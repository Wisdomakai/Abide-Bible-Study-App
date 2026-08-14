-- ============================================================================
-- Country tracking for the admin dashboard. Run AFTER admin.sql. Safe to re-run.
--
-- Country is resolved server-side by the record-login Edge Function, from the
-- edge network's own header. The client never supplies it, so it cannot be
-- spoofed by a caller, and no IP address is stored anywhere — only the
-- two-letter country code.
-- ============================================================================

-- ISO 3166-1 alpha-2, or null when the edge network could not resolve one.
alter table public.logins add column if not exists country text;
create index if not exists logins_country_idx on public.logins (country);

-- The Edge Function becomes the only writer of public.logins, since it is the
-- only place that can see the request's country. touch_presence still stamps
-- presence, but no longer records the login itself — leaving the insert here
-- would produce a second, countryless row for every app open.
create or replace function public.touch_presence(p_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set last_seen = now(), name = left(trim(p_name), 80)
  where id = auth.uid();
end;
$$;
revoke all on function public.touch_presence(text) from public;
grant execute on function public.touch_presence(text) to authenticated;

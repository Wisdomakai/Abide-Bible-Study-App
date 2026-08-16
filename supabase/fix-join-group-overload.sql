-- ============================================================================
-- Joining a group failed for everyone with PostgREST error PGRST203:
--
--   Could not choose the best candidate function between:
--     public.join_group(p_code, p_name)
--     public.join_group(p_code, p_name, p_group_name)
--     public.join_group(p_code, p_name, p_group_name, p_admin_name)
--
-- Successive migrations each defined join_group with a different argument list,
-- and `create or replace` cannot replace a function whose signature differs —
-- it adds an overload instead. All three ended up live, so PostgREST refused to
-- pick one and every join request failed before reaching the database.
--
-- The app only ever calls the two-argument form (src/data/api.js sends
-- p_code and p_name), so the wider ones are dropped. Safe to re-run.
-- ============================================================================

drop function if exists public.join_group(text, text, text);
drop function if exists public.join_group(text, text, text, text);

-- Leaves exactly one candidate: public.join_group(p_code text, p_name text),
-- defined in pwa.sql. Verify with:
--
--   select p.oid::regprocedure
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public' and p.proname = 'join_group';
--
-- Exactly one row should come back.

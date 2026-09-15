-- Supabase's "auto-enable RLS" project option installs public.rls_auto_enable()
-- as a SECURITY DEFINER event-trigger function (fired by the `ensure_rls` event
-- trigger on CREATE TABLE in `public`). Living in the exposed `public` schema,
-- it is reachable at /rest/v1/rpc/rls_auto_enable, which the security advisor
-- flags (lints 0028, 0029). No API role has any reason to call it, so take
-- EXECUTE away from them. The owner (`postgres`) holds its own explicit grant,
-- so the trigger keeps firing for migrations.
--
-- The trigger only turns RLS on. It adds no policies — every table migration
-- still ships its own (CLAUDE.md non-negotiable #5).

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- M1-09 · Counting failed sign-ins, atomically.
--
-- `public.rate_limits` was created in M0-10 as "the Postgres fallback behind the
-- Durable Object counter (M1-10)". This is the function that makes it usable:
-- read-modify-write from application code would lose counts under exactly the
-- conditions that matter — many attempts arriving at once — so the increment
-- happens in one statement, in the database.
--
-- Fixed windows, not a rolling log. A rolling window needs a row per attempt;
-- this needs one row per key per window, and the imprecision it buys (someone
-- can spend their allowance at the end of one window and the start of the next)
-- costs an attacker a pause and costs us nothing.
--
-- service_role only: the keys contain IP addresses, and a caller who could
-- choose their own key could reset their own lockout.

create function public.bump_rate_limit(
  p_key            text,
  p_window_seconds integer,
  p_limit          integer
)
returns table (attempts integer, window_start timestamptz, locked boolean)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_window timestamptz;
  v_count  integer;
begin
  -- Floor `now()` to the start of its window, so every caller in the same
  -- window addresses the same row.
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.rate_limits (key, window_start, count)
  values (p_key, v_window, 1)
  on conflict (key, window_start)
  do update set count = public.rate_limits.count + 1
  returning count into v_count;

  return query select v_count, v_window, v_count >= p_limit;
end;
$$;

comment on function public.bump_rate_limit(text, integer, integer) is
  'Increments the counter for `key` in the current fixed window and reports whether it has reached `p_limit`.';

revoke execute on function public.bump_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.bump_rate_limit(text, integer, integer) to service_role;

-- ─── Reading without incrementing ────────────────────────────────────────────
-- The login screen needs to know it is locked *before* spending an attempt.

create function public.peek_rate_limit(
  p_key            text,
  p_window_seconds integer,
  p_limit          integer
)
returns table (attempts integer, window_start timestamptz, locked boolean)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_window timestamptz;
  v_count  integer;
begin
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  select count into v_count
  from public.rate_limits
  where key = p_key and window_start = v_window;

  v_count := coalesce(v_count, 0);
  return query select v_count, v_window, v_count >= p_limit;
end;
$$;

revoke execute on function public.peek_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.peek_rate_limit(text, integer, integer) to service_role;

-- ─── Clearing on success ─────────────────────────────────────────────────────

create function public.clear_rate_limit(p_key text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.rate_limits where key = p_key
$$;

revoke execute on function public.clear_rate_limit(text) from public, anon, authenticated;
grant execute on function public.clear_rate_limit(text) to service_role;

-- ─── Housekeeping ────────────────────────────────────────────────────────────
-- Windows older than a day are of no further interest and the table is not a
-- history: nothing reads them, and the keys contain IP addresses (DPDP, M9-08).

create function public.purge_old_rate_limits()
returns integer
language sql
security definer
set search_path = ''
as $$
  with deleted as (
    delete from public.rate_limits where window_start < now() - interval '1 day' returning 1
  )
  select count(*)::integer from deleted
$$;

revoke execute on function public.purge_old_rate_limits() from public, anon, authenticated;
grant execute on function public.purge_old_rate_limits() to service_role;

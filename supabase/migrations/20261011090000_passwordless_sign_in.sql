-- M10-10 · Signing in without a password: an emailed 6-digit code.
--
-- Class tests happen on lab PCs. A student who has forgotten their password,
-- or locked it with wrong guesses, should not have to sign into their email
-- on a shared machine to get back in. So the code is emailed, read on their
-- own phone, and typed on the PC. Self-serve from `/login/code`, and staff can
-- send one. (A sign-in-by-QR option was designed and dropped by the user on
-- 2026-10-11 — the code alone is enough.)
--
-- Same shape as `password_resets`, for the same reasons: only hashes stored,
-- single use, short life, and **no API access at all** — no grants, no
-- policies. Everything goes through server code holding the secret key.

-- ─── Emailed codes ───────────────────────────────────────────────────────────

create table public.sign_in_codes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users (id) on delete cascade,
  code_hash    text not null,
  attempts     integer not null default 0 check (attempts >= 0),
  expires_at   timestamptz not null,
  used_at      timestamptz,
  -- Staff member who sent it from a student's page; null when self-requested.
  sent_by      uuid references public.users (id) on delete set null,
  requested_ip inet,
  created_at   timestamptz not null default now(),
  constraint sign_in_codes_expires_after_created check (expires_at > created_at)
);

comment on table public.sign_in_codes is 'One-time emailed sign-in codes (M10-10). Only a hash of the code is stored. No API access: server code with the secret key only.';
comment on column public.sign_in_codes.code_hash is 'SHA-256 of user id + code. Never the code. Not readable through the API.';
comment on column public.sign_in_codes.attempts is 'Wrong guesses against this code. It stops working at the limit the server passes in.';

create index sign_in_codes_user_id_idx on public.sign_in_codes (user_id);
create index sign_in_codes_expires_at_idx on public.sign_in_codes (expires_at);

revoke all on public.sign_in_codes from anon, authenticated;
alter table public.sign_in_codes enable row level security;

-- Issuing a code retires every earlier live one, so only the newest email
-- works. Two live codes would double the guesses an attacker gets.
create function public.issue_sign_in_code(
  p_user           uuid,
  p_code_hash      text,
  p_ttl_seconds    integer,
  p_sent_by        uuid,
  p_requested_ip   inet
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.sign_in_codes
     set used_at = now()
   where user_id = p_user
     and used_at is null;

  insert into public.sign_in_codes (user_id, code_hash, expires_at, sent_by, requested_ip)
  values (p_user, p_code_hash, now() + make_interval(secs => p_ttl_seconds), p_sent_by, p_requested_ip);
end;
$$;

revoke execute on function public.issue_sign_in_code(uuid, text, integer, uuid, inet) from public, anon, authenticated;
grant execute on function public.issue_sign_in_code(uuid, text, integer, uuid, inet) to service_role;

-- Checking a code, atomically. The row is locked while it is checked, so two
-- guesses arriving together cannot both be counted as the first.
--
--   'ok'    — right code; it is spent.
--   'wrong' — a live code exists and this wasn't it; one guess used.
--   'none'  — no live code: never sent, expired, spent, or out of guesses.
create function public.redeem_sign_in_code(
  p_user          uuid,
  p_code_hash     text,
  p_max_attempts  integer
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.sign_in_codes%rowtype;
begin
  select * into v_row
    from public.sign_in_codes
   where user_id = p_user
     and used_at is null
     and expires_at > now()
     and attempts < p_max_attempts
   order by created_at desc
   limit 1
   for update;

  if not found then
    return 'none';
  end if;

  if v_row.code_hash = p_code_hash then
    update public.sign_in_codes set used_at = now() where id = v_row.id;
    return 'ok';
  end if;

  update public.sign_in_codes set attempts = attempts + 1 where id = v_row.id;
  return 'wrong';
end;
$$;

revoke execute on function public.redeem_sign_in_code(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.redeem_sign_in_code(uuid, text, integer) to service_role;

-- ─── Housekeeping ────────────────────────────────────────────────────────────
-- Not a history. A day after expiry a row is of no use and only holds an IP
-- address (DPDP, M9-08).

create function public.purge_old_sign_in_codes()
returns integer
language sql
security definer
set search_path = ''
as $$
  with deleted as (
    delete from public.sign_in_codes where expires_at < now() - interval '1 day' returning 1
  )
  select count(*)::integer from deleted
$$;

revoke execute on function public.purge_old_sign_in_codes() from public, anon, authenticated;
grant execute on function public.purge_old_sign_in_codes() to service_role;

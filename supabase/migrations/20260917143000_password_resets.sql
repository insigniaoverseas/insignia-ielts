-- M1-15 · Password reset.
--
-- `MVP-1.md` §9 said there is no self-serve reset: a locked-out student is
-- standing in a building with their teacher in it, and a fresh invitation is
-- faster and safer than an email round trip.
--
-- That reasoning holds for students and **fails completely for the Owner**,
-- who has nobody above them — nobody can invite an Owner, by design. A
-- forgotten Owner password meant the Supabase dashboard was the only way back
-- into the product, permanently. The user hit exactly that on 2026-09-17 and
-- chose to open the reset to every role. §9 is corrected to match.
--
-- Same shape as `invitations`, for the same reasons: only the hash is stored,
-- single use, short TTL. Two deliberate differences:
--
--   * **One hour, not seven days.** An invitation is pushed at someone who was
--     not expecting it, so it has to survive a weekend. A reset is requested by
--     someone sitting at the screen right now, so a long life is pure exposure.
--   * **No API access at all** — no grants, no policies, like `rate_limits`.
--     An invitation's details are shown to admins; a reset token is shown to
--     nobody, ever.

create table public.password_resets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users (id) on delete cascade,
  token_hash   text not null unique,
  expires_at   timestamptz not null,
  used_at      timestamptz,
  requested_ip inet,
  created_at   timestamptz not null default now(),
  constraint password_resets_expires_after_created check (expires_at > created_at)
);

comment on table public.password_resets is 'Self-serve password reset (M1-15). Only the hash of the emailed token is stored. No API access: server code with the secret key only.';
comment on column public.password_resets.token_hash is 'SHA-256 of the emailed token. Never the raw token. Not readable through the API.';
comment on column public.password_resets.requested_ip is 'For abuse investigation. DPDP: purged with the row (M9-08).';

create index password_resets_user_id_idx on public.password_resets (user_id);
create index password_resets_expires_at_idx on public.password_resets (expires_at);

-- Default-deny and *stay* denied: nothing is granted to anon or authenticated,
-- and no policy is written, so the table is unreachable through PostgREST.
revoke all on public.password_resets from anon, authenticated;
alter table public.password_resets enable row level security;

-- ─── Completing a reset ──────────────────────────────────────────────────────
-- Marks the token used and revokes **every** session that user holds, in one
-- transaction. The session revocation is the half people forget: if someone
-- else is signed in as this user, changing the password has to put them out,
-- or a reset "fixes" an account the intruder is still inside (MVP-1 §8).
--
-- Called *after* the Supabase Auth password update, not before. Consuming the
-- token first would burn it whenever Auth rejects the new password — most
-- often for appearing in a breach corpus — and force the person to request a
-- fresh email over a recoverable mistake. Replay is still refused, because a
-- token whose `used_at` is set fails `find_password_reset` on the way in.

create function public.complete_password_reset(p_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  update public.password_resets
     set used_at = now()
   where token_hash = p_token_hash
     and used_at is null
     and expires_at > now()
  returning user_id into v_user;

  if v_user is null then
    raise exception 'unusable_token' using errcode = 'P0002';
  end if;

  -- Any other reset this person requested is now moot, and each one is a live
  -- way into the account.
  update public.password_resets
     set used_at = now()
   where user_id = v_user
     and used_at is null;

  update public.user_sessions
     set revoked_at = now()
   where user_id = v_user
     and revoked_at is null;

  return v_user;
end;
$$;

comment on function public.complete_password_reset(text) is
  'Marks the token used, invalidates that user''s other reset tokens, and revokes all their sessions. service_role only.';

revoke execute on function public.complete_password_reset(text) from public, anon, authenticated;
grant execute on function public.complete_password_reset(text) to service_role;

-- ─── Reading a token ─────────────────────────────────────────────────────────
-- Separate from completing it so the screen can tell "expired" from "already
-- used" from "never existed" and keep its own sentence for each — the same
-- courtesy `/invite/[token]` extends.

create function public.find_password_reset(p_token_hash text)
returns table (user_id uuid, email text, name text, expired boolean, used boolean)
language sql
security definer
set search_path = ''
as $$
  select r.user_id,
         u.email,
         u.name,
         r.expires_at <= now() as expired,
         r.used_at is not null as used
  from public.password_resets r
  join public.users u on u.id = r.user_id
  where r.token_hash = p_token_hash
$$;

revoke execute on function public.find_password_reset(text) from public, anon, authenticated;
grant execute on function public.find_password_reset(text) to service_role;

-- ─── Housekeeping ────────────────────────────────────────────────────────────
-- A spent or expired token has no further use, and the row carries an IP.

create function public.purge_old_password_resets()
returns integer
language sql
security definer
set search_path = ''
as $$
  with deleted as (
    delete from public.password_resets
     where expires_at < now() - interval '7 days'
    returning 1
  )
  select count(*)::integer from deleted
$$;

revoke execute on function public.purge_old_password_resets() from public, anon, authenticated;
grant execute on function public.purge_old_password_resets() to service_role;

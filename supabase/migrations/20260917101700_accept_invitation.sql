-- M1-05 / M1-06 · Accepting an invitation, atomically.
--
-- Acceptance creates several rows that must all exist or none of them: the
-- profile, the batch membership, the plan, and the invitation's own closure.
-- A half-accepted invitation is the worst outcome available — the student has
-- a password that signs them in to an account with no branch, no batch and no
-- plan, and the link that would have fixed it is spent.
--
-- The Supabase Auth user is created *first*, by the Server Action, because that
-- is an API call and cannot join a Postgres transaction. If this function then
-- fails, the action deletes that auth user again, so a retry is clean.
--
-- Callable by **service_role only**. It takes the user id as an argument rather
-- than reading auth.uid(), because at this moment the new user is not signed
-- in yet — so it must never be reachable by `authenticated`, which could
-- otherwise pass somebody else's id.

create function public.accept_invitation(
  p_token_hash text,
  p_user_id    uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite  public.invitations;
  v_role    text;
  v_start   date;
  v_months  integer;
begin
  select * into v_invite
  from public.invitations
  where token_hash = p_token_hash
  for update;

  if v_invite.id is null then
    raise exception 'unknown_invitation' using errcode = 'P0002';
  end if;
  if v_invite.status <> 'pending' then
    raise exception '%', v_invite.status using errcode = 'P0002';
  end if;
  if v_invite.expires_at <= now() then
    raise exception 'expired' using errcode = 'P0002';
  end if;

  select key into v_role from public.roles where id = v_invite.role_id;

  insert into public.users (id, email, name, phone, country_code, role_id, branch_id, status, created_by)
  values (
    p_user_id,
    v_invite.email,
    v_invite.name,
    v_invite.phone,
    v_invite.country_code,
    v_invite.role_id,
    v_invite.branch_id,
    'active',
    v_invite.invited_by
  );

  if v_invite.batch_id is not null then
    insert into public.batch_students (batch_id, student_id)
    values (v_invite.batch_id, p_user_id)
    on conflict do nothing;
  end if;

  -- The plan the admin chose on the invite screen. Students only: staff have
  -- no plan, and a plan row for a teacher would show up in plan workqueues.
  if v_role = 'student' and v_invite.plan_template is not null then
    v_start  := coalesce((v_invite.plan_template ->> 'starts_on')::date, current_date);
    v_months := coalesce((v_invite.plan_template ->> 'months')::integer, 3);

    insert into public.student_plans (student_id, plan_name, starts_on, expires_on, test_quota, created_by)
    values (
      p_user_id,
      coalesce(nullif(trim(v_invite.plan_template ->> 'plan_name'), ''), v_months || '-month plan'),
      v_start,
      v_start + (v_months || ' months')::interval,
      (v_invite.plan_template ->> 'test_quota')::integer,
      v_invite.invited_by
    );
  end if;

  update public.invitations
     set status = 'accepted', accepted_at = now()
   where id = v_invite.id;

  return v_role;
end;
$$;

comment on function public.accept_invitation(text, uuid) is
  'Turns a pending invitation into a user, batch membership and plan in one transaction. service_role only: it trusts the user id it is given.';

revoke execute on function public.accept_invitation(text, uuid) from public, anon, authenticated;
grant execute on function public.accept_invitation(text, uuid) to service_role;

-- ─── Expiring invitations ────────────────────────────────────────────────────
-- `status` stays 'pending' after expires_at passes, so that the accept screen
-- can tell "expired" apart from "never existed" and say so. This marks them
-- for the admin list; the acceptance path checks the timestamp regardless.

create function public.expire_stale_invitations()
returns integer
language sql
security definer
set search_path = ''
as $$
  with expired as (
    update public.invitations
       set status = 'expired'
     where status = 'pending'
       and expires_at <= now()
    returning 1
  )
  select count(*)::integer from expired
$$;

comment on function public.expire_stale_invitations() is
  'Housekeeping for the admin list. Acceptance never relies on this having run.';

revoke execute on function public.expire_stale_invitations() from public, anon, authenticated;
grant execute on function public.expire_stale_invitations() to service_role;

-- M1 · Bootstrap: the first Owner, and the one-time first-run setup.
--
-- D9 (MVP-1 §9) says every account begins as an invitation, and the permission
-- matrix says nobody can be invited into or assigned the Owner role through the
-- app (PROJECT-MEMORY §4, `canInviteRole`). Together those leave the very first
-- account with no way to exist: there is no one to send its invitation.
--
-- So it is created by hand in the Supabase dashboard, and this migration is the
-- *link* between that auth.users row and the application. The owner set the
-- password there; it was never known to anyone else and is not recorded here.
--
-- The owner asked (2026-09-17) that the app carry the institute's details
-- rather than this file, so **nothing about the branch or the person is
-- hardcoded**. They fill both in on a first-run setup screen. What *is* pinned
-- is the single uuid allowed to complete that setup, and that pin is the whole
-- security argument: first-run is not a signup route by another name, it is a
-- link to one specific, already-existing, hand-created row.
--
-- After this runs once there is an Owner, and every subsequent account —
-- admin, teacher, invigilator, student — goes through invitations as D9 says.

-- ─── The pinned identity ─────────────────────────────────────────────────────

create function private.bootstrap_owner_id()
returns uuid
language sql
immutable
set search_path = ''
as $$
  select '1b7d0ff5-e86a-4050-8870-9fd80ed0a3ce'::uuid
$$;

comment on function private.bootstrap_owner_id() is
  'The auth.users id created by hand in the Supabase dashboard (PROJECT-MEMORY §6). An identifier, not a credential: knowing it grants nothing without that account''s password.';

revoke execute on function private.bootstrap_owner_id() from public;
grant execute on function private.bootstrap_owner_id() to authenticated, service_role;

-- ─── First-run setup ─────────────────────────────────────────────────────────

create function public.complete_first_run_setup(
  p_branch_name    text,
  p_branch_address text,
  p_owner_name     text,
  p_phone          text default null,
  p_country_code   text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller   uuid := (select auth.uid());
  v_email    text;
  v_role_id  uuid;
  v_branch   uuid;
begin
  -- Serialise: two concurrent calls must not both pass the "no users yet"
  -- check and create two branches. The lock is released with the transaction.
  perform pg_advisory_xact_lock(hashtext('complete_first_run_setup'));

  if v_caller is null then
    raise exception 'Not signed in.' using errcode = '42501';
  end if;

  if v_caller <> private.bootstrap_owner_id() then
    raise exception 'This account cannot run first-run setup.' using errcode = '42501';
  end if;

  -- Runs exactly once in the life of the database. Once an Owner exists,
  -- every further account is an invitation.
  if exists (select 1 from public.users) then
    raise exception 'Setup has already been completed.' using errcode = '42501';
  end if;

  select lower(email) into v_email from auth.users where id = v_caller;
  if v_email is null then
    raise exception 'That account no longer exists.' using errcode = '42501';
  end if;

  if coalesce(length(trim(p_branch_name)), 0) = 0 then
    raise exception 'A centre name is required.' using errcode = '22023';
  end if;
  if coalesce(length(trim(p_owner_name)), 0) = 0 then
    raise exception 'Your name is required.' using errcode = '22023';
  end if;

  select id into v_role_id from public.roles where key = 'super_admin';
  if v_role_id is null then
    raise exception 'Roles are not seeded; run the reference-data migration first.' using errcode = 'P0002';
  end if;

  insert into public.branches (name, address)
  values (trim(p_branch_name), nullif(trim(coalesce(p_branch_address, '')), ''))
  returning id into v_branch;

  insert into public.users (id, email, name, phone, country_code, role_id, branch_id, status)
  values (
    v_caller,
    v_email,
    trim(p_owner_name),
    nullif(trim(coalesce(p_phone, '')), ''),
    nullif(trim(coalesce(p_country_code, '')), ''),
    v_role_id,
    v_branch,
    'active'
  );

  return v_branch;
end;
$$;

comment on function public.complete_first_run_setup(text, text, text, text, text) is
  'Runs once: creates the first branch and the Owner profile for the pinned bootstrap uuid. Refuses if any user already exists. The email comes from auth.users, never from the caller.';

revoke execute on function public.complete_first_run_setup(text, text, text, text, text) from public, anon;
grant execute on function public.complete_first_run_setup(text, text, text, text, text) to authenticated;

-- ─── Is setup still pending? ─────────────────────────────────────────────────
-- The app needs to answer this for a signed-in user who has no public.users row
-- yet, which is a state `getActor()` deliberately reports as "nobody".

create function public.first_run_pending()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) = private.bootstrap_owner_id()
     and not exists (select 1 from public.users)
$$;

comment on function public.first_run_pending() is
  'True only for the pinned bootstrap account, and only while no user exists. Everyone else always gets false.';

revoke execute on function public.first_run_pending() from public, anon;
grant execute on function public.first_run_pending() to authenticated;

-- M0-06 · Identity: branches, roles, users, invitations, user_devices, user_sessions
--
-- Access model (MVP-1 §6, §13; PROJECT-MEMORY §4):
--   * RLS on every table, default-deny. No permissive fallback policy.
--   * `anon` gets nothing. `authenticated` gets SELECT only, and only on the
--     columns it needs, so secret hashes stay unreadable even to someone
--     calling the Data API with their own valid JWT.
--   * Identity tables are read-only through the API. Every write (accepting an
--     invite, changing a role/status/branch, issuing a device or session) is
--     server code using the service role, behind lib/rbac.ts, audit-logged.
--   * RLS helpers live in `private`, which the Data API does not expose.
--   * Teachers and invigilators see only their own row until the batch tables
--     arrive in M0-07, which adds "teacher reads students in own batches".

-- ─── Defaults ────────────────────────────────────────────────────────────────
-- Stop new tables and sequences in `public` from being granted to `anon`
-- automatically. Each migration grants what it needs, explicitly.
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;

-- ─── Private schema for RLS helpers ─────────────────────────────────────────
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- ─── Tables ──────────────────────────────────────────────────────────────────

create table public.branches (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  address     text,
  created_at  timestamptz not null default now()
);
comment on table public.branches is 'Institute branches. Every user and batch belongs to one.';

create table public.roles (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique check (key ~ '^[a-z][a-z_]*$'),
  name        text not null check (length(trim(name)) > 0),
  permissions jsonb not null default '{}'::jsonb check (jsonb_typeof(permissions) = 'object'),
  created_at  timestamptz not null default now()
);
comment on table public.roles is 'Roles as data (super_admin, admin, teacher, invigilator, student). Seeded in M0-19.';

create table public.users (
  id               uuid primary key references auth.users (id) on delete cascade,
  email            text not null unique check (email = lower(email) and position('@' in email) > 1),
  name             text not null check (length(trim(name)) > 0),
  phone            text,
  country_code     text,
  role_id          uuid not null references public.roles (id),
  branch_id        uuid not null references public.branches (id),
  status           text not null default 'active' check (status in ('active', 'inactive', 'suspended')),
  dob              date,
  guardian_consent boolean not null default false,
  guardian_name    text,
  guardian_phone   text,
  created_by       uuid references public.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
comment on table public.users is 'App profile for each auth.users row. Email is the identifier (D9). No password or PIN here.';
comment on column public.users.dob is 'DPDP Act 2023: under-18s need verifiable guardian consent.';
create index users_role_id_idx    on public.users (role_id);
create index users_branch_id_idx  on public.users (branch_id);
create index users_created_by_idx on public.users (created_by);

create table public.invitations (
  id            uuid primary key default gen_random_uuid(),
  email         text not null check (email = lower(email) and position('@' in email) > 1),
  role_id       uuid not null references public.roles (id),
  branch_id     uuid not null references public.branches (id),
  batch_id      uuid, -- foreign key to public.batches added in M0-07
  plan_template jsonb check (plan_template is null or jsonb_typeof(plan_template) = 'object'),
  token_hash    text not null unique,
  expires_at    timestamptz not null,
  invited_by    uuid not null references public.users (id),
  accepted_at   timestamptz,
  status        text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  created_at    timestamptz not null default now(),
  constraint invitations_accepted_at_matches_status check ((status = 'accepted') = (accepted_at is not null)),
  constraint invitations_expires_after_created check (expires_at > created_at)
);
comment on table public.invitations is 'Every account starts here (D9). Only the hash of the invite token is stored.';
comment on column public.invitations.token_hash is 'Hash of the emailed token. Never the raw token. Not readable through the API.';
create unique index invitations_one_pending_per_email on public.invitations (email) where status = 'pending';
create index invitations_role_id_idx    on public.invitations (role_id);
create index invitations_branch_id_idx  on public.invitations (branch_id);
create index invitations_invited_by_idx on public.invitations (invited_by);

create table public.user_devices (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users (id) on delete cascade,
  device_secret_hash  text not null unique,
  pin_hash            text not null,
  label               text,
  user_agent          text,
  failed_pin_attempts integer not null default 0 check (failed_pin_attempts >= 0),
  locked_until        timestamptz,
  last_used_at        timestamptz,
  revoked_at          timestamptz,
  created_at          timestamptz not null default now()
);
comment on table public.user_devices is 'A PIN is only valid together with this device''s secret (D9).';
comment on column public.user_devices.device_secret_hash is 'Not readable through the API.';
comment on column public.user_devices.pin_hash is 'Not readable through the API.';
create index user_devices_user_id_idx on public.user_devices (user_id);

create table public.user_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users (id) on delete cascade,
  device_id    uuid references public.user_devices (id) on delete set null,
  issued_at    timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at   timestamptz,
  ip           inet,
  user_agent   text
);
comment on table public.user_sessions is 'One active session per student: a new login revokes the old (enforced in M1-12).';
create index user_sessions_user_id_idx   on public.user_sessions (user_id);
create index user_sessions_device_id_idx on public.user_sessions (device_id);

-- ─── updated_at ──────────────────────────────────────────────────────────────

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke execute on function private.set_updated_at() from public;

create trigger users_set_updated_at
  before update on public.users
  for each row execute function private.set_updated_at();

-- ─── RLS helpers ─────────────────────────────────────────────────────────────
-- SECURITY DEFINER so they can read public.users without recursing through its
-- own policies. Each one only ever answers about the caller (auth.uid()).
-- A suspended or inactive user gets NULL, so every staff policy denies them.

create function private.auth_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select r.key
  from public.users u
  join public.roles r on r.id = u.role_id
  where u.id = (select auth.uid())
    and u.status = 'active'
$$;

create function private.auth_branch()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.branch_id
  from public.users u
  where u.id = (select auth.uid())
    and u.status = 'active'
$$;

create function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.auth_role() in ('super_admin', 'admin', 'teacher', 'invigilator'), false)
$$;

create function private.same_branch(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users u
    where u.id = target_user
      and u.branch_id = private.auth_branch()
  )
$$;

revoke execute on function private.auth_role(), private.auth_branch(), private.is_staff(), private.same_branch(uuid) from public;
grant execute on function private.auth_role(), private.auth_branch(), private.is_staff(), private.same_branch(uuid) to authenticated, service_role;

-- ─── Grants: read-only, column-limited ──────────────────────────────────────

revoke all on public.branches, public.roles, public.users, public.invitations, public.user_devices, public.user_sessions
  from anon, authenticated;

grant select on public.branches, public.roles, public.users, public.user_sessions to authenticated;
grant select (id, email, role_id, branch_id, batch_id, plan_template, expires_at, invited_by, accepted_at, status, created_at)
  on public.invitations to authenticated;
grant select (id, user_id, label, user_agent, failed_pin_attempts, locked_until, last_used_at, revoked_at, created_at)
  on public.user_devices to authenticated;

-- ─── Row-level security ──────────────────────────────────────────────────────

alter table public.branches      enable row level security;
alter table public.roles         enable row level security;
alter table public.users         enable row level security;
alter table public.invitations   enable row level security;
alter table public.user_devices  enable row level security;
alter table public.user_sessions enable row level security;

-- branches
create policy "Users read their own branch" on public.branches
  for select to authenticated
  using (id = (select private.auth_branch()));

create policy "Super admins read every branch" on public.branches
  for select to authenticated
  using ((select private.auth_role()) = 'super_admin');

-- roles
create policy "Active users read roles" on public.roles
  for select to authenticated
  using ((select private.auth_role()) is not null);

-- users
create policy "Users read their own row" on public.users
  for select to authenticated
  using (id = (select auth.uid()));

create policy "Admins read users in their branch" on public.users
  for select to authenticated
  using ((select private.auth_role()) = 'admin' and branch_id = (select private.auth_branch()));

create policy "Super admins read every user" on public.users
  for select to authenticated
  using ((select private.auth_role()) = 'super_admin');

-- invitations: staff only; students never see any
create policy "Admins read invitations in their branch" on public.invitations
  for select to authenticated
  using ((select private.auth_role()) = 'admin' and branch_id = (select private.auth_branch()));

create policy "Super admins read every invitation" on public.invitations
  for select to authenticated
  using ((select private.auth_role()) = 'super_admin');

-- user_devices
create policy "Users read their own devices" on public.user_devices
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Admins read devices in their branch" on public.user_devices
  for select to authenticated
  using ((select private.auth_role()) = 'admin' and private.same_branch(user_id));

create policy "Super admins read every device" on public.user_devices
  for select to authenticated
  using ((select private.auth_role()) = 'super_admin');

-- user_sessions
create policy "Users read their own sessions" on public.user_sessions
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Admins read sessions in their branch" on public.user_sessions
  for select to authenticated
  using ((select private.auth_role()) = 'admin' and private.same_branch(user_id));

create policy "Super admins read every session" on public.user_sessions
  for select to authenticated
  using ((select private.auth_role()) = 'super_admin');

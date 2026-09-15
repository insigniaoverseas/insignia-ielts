-- M0-07 · Cohorts & plans: batches, batch_teachers, batch_students, student_plans, plan_history
--
-- Same access model as M0-06 (PROJECT-MEMORY §4):
--   * RLS default-deny; `anon` gets nothing; `authenticated` gets SELECT only.
--   * Every write is server code with the service role, behind lib/rbac.ts.
--   * Cross-table checks go through SECURITY DEFINER helpers in `private`, so
--     policies never query each other's tables (which would recurse).
--
-- Also in this migration:
--   * Teachers can now read the students in their batches (users, plans).
--   * invitations.batch_id gets its foreign key.
--   * Every table ends up with ONE select policy (conditions OR-ed), replacing
--     M0-06's 2–3 per table — the performance advisor's
--     multiple_permissive_policies warning.
--
-- Dates (`starts_on`, `ends_on`, `expires_on`) are calendar dates in
-- Asia/Kolkata; timestamps are timestamptz (UTC), per rule #9.

-- ─── Tables ──────────────────────────────────────────────────────────────────

create table public.batches (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) > 0),
  branch_id  uuid not null references public.branches (id),
  starts_on  date not null,
  ends_on    date,
  status     text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  constraint batches_ends_after_starts check (ends_on is null or ends_on >= starts_on)
);
comment on table public.batches is 'A class group in one branch. Tests are assigned to batches (M0-08).';
create index batches_branch_id_idx on public.batches (branch_id);

create table public.batch_teachers (
  batch_id   uuid not null references public.batches (id) on delete cascade,
  teacher_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (batch_id, teacher_id)
);
comment on table public.batch_teachers is 'Who teaches a batch. That the user has the teacher role is checked in server code.';
create index batch_teachers_teacher_id_idx on public.batch_teachers (teacher_id);

create table public.batch_students (
  batch_id   uuid not null references public.batches (id) on delete cascade,
  student_id uuid not null references public.users (id) on delete cascade,
  joined_at  timestamptz not null default now(),
  left_at    timestamptz,
  primary key (batch_id, student_id),
  constraint batch_students_left_after_joined check (left_at is null or left_at >= joined_at)
);
comment on table public.batch_students is 'Batch membership. left_at set = no longer in the batch; the row stays as history.';
create index batch_students_student_id_idx on public.batch_students (student_id);

create table public.student_plans (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.users (id) on delete cascade,
  plan_name   text not null check (length(trim(plan_name)) > 0),
  starts_on   date not null,
  expires_on  date not null,
  test_quota  integer check (test_quota is null or test_quota >= 0),
  tests_used  integer not null default 0 check (tests_used >= 0),
  status      text not null default 'active' check (status in ('active', 'expired', 'suspended')),
  created_by  uuid references public.users (id) on delete set null,
  notes       text,
  created_at  timestamptz not null default now(),
  constraint student_plans_expires_after_starts check (expires_on >= starts_on)
);
comment on table public.student_plans is 'What a student has paid for. test_quota NULL = time-based only (PROJECT-MEMORY §7 Q4).';
comment on column public.student_plans.notes is 'Visible to the student — staff should write nothing they would not show them.';
create unique index student_plans_one_active_per_student on public.student_plans (student_id) where status = 'active';
create index student_plans_student_id_idx on public.student_plans (student_id);
create index student_plans_created_by_idx on public.student_plans (created_by);

create table public.plan_history (
  id         uuid primary key default gen_random_uuid(),
  plan_id    uuid not null references public.student_plans (id) on delete cascade,
  action     text not null check (action in ('create', 'extend', 'suspend', 'resume')),
  old_expiry date,
  new_expiry date,
  reason     text,
  actor_id   uuid references public.users (id) on delete set null,
  at         timestamptz not null default now()
);
comment on table public.plan_history is 'Append-only audit trail of plan changes. Rows cannot be updated.';
create index plan_history_plan_id_idx  on public.plan_history (plan_id);
create index plan_history_actor_id_idx on public.plan_history (actor_id);

-- plan_history is append-only. Deletes are still allowed so a user's data can
-- be erased (cascade from student_plans, DPDP — M9-08).
create function private.forbid_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% is append-only', tg_table_name using errcode = 'insufficient_privilege';
end;
$$;
revoke execute on function private.forbid_update() from public;

create trigger plan_history_append_only
  before update on public.plan_history
  for each row execute function private.forbid_update();

-- The FK M0-06 left for this migration.
alter table public.invitations
  add constraint invitations_batch_id_fkey foreign key (batch_id) references public.batches (id) on delete set null;
create index invitations_batch_id_idx on public.invitations (batch_id);

-- ─── Helpers (private, SECURITY DEFINER, answer only about the caller) ──────

-- The caller is an active teacher of a batch that this student is currently in.
create function private.is_teacher_of(target_student uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.auth_role() = 'teacher'
     and exists (
       select 1
       from public.batch_teachers bt
       join public.batch_students bs on bs.batch_id = bt.batch_id
       where bt.teacher_id = (select auth.uid())
         and bs.student_id = target_student
         and bs.left_at is null
     )
$$;

-- The caller is an active teacher of this batch.
create function private.teaches_batch(target_batch uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.auth_role() = 'teacher'
     and exists (
       select 1 from public.batch_teachers bt
       where bt.batch_id = target_batch
         and bt.teacher_id = (select auth.uid())
     )
$$;

-- The caller is currently a student in this batch.
create function private.in_batch(target_batch uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.batch_students bs
    where bs.batch_id = target_batch
      and bs.student_id = (select auth.uid())
      and bs.left_at is null
  )
$$;

-- This batch is in the caller's branch.
create function private.batch_in_my_branch(target_batch uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.batches b
    where b.id = target_batch
      and b.branch_id = private.auth_branch()
  )
$$;

-- This plan belongs to a student in the caller's branch.
create function private.plan_in_my_branch(target_plan uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.student_plans sp
    where sp.id = target_plan
      and private.same_branch(sp.student_id)
  )
$$;

revoke execute on function
  private.is_teacher_of(uuid), private.teaches_batch(uuid), private.in_batch(uuid),
  private.batch_in_my_branch(uuid), private.plan_in_my_branch(uuid)
  from public;
grant execute on function
  private.is_teacher_of(uuid), private.teaches_batch(uuid), private.in_batch(uuid),
  private.batch_in_my_branch(uuid), private.plan_in_my_branch(uuid)
  to authenticated, service_role;

-- ─── Grants: read-only ──────────────────────────────────────────────────────

revoke all on public.batches, public.batch_teachers, public.batch_students, public.student_plans, public.plan_history
  from anon, authenticated;
grant select on public.batches, public.batch_teachers, public.batch_students, public.student_plans, public.plan_history
  to authenticated;

-- ─── Row-level security: one select policy per table ────────────────────────

alter table public.batches        enable row level security;
alter table public.batch_teachers enable row level security;
alter table public.batch_students enable row level security;
alter table public.student_plans  enable row level security;
alter table public.plan_history   enable row level security;

create policy "Read: own batch, taught batch, admin's branch, super admin" on public.batches
  for select to authenticated
  using (
    private.in_batch(id)
    or private.teaches_batch(id)
    or ((select private.auth_role()) = 'admin' and branch_id = (select private.auth_branch()))
    or (select private.auth_role()) = 'super_admin'
  );

-- Students don't see teacher assignments; teachers see their own and co-teachers'.
create policy "Read: own, co-teachers, admin's branch, super admin" on public.batch_teachers
  for select to authenticated
  using (
    teacher_id = (select auth.uid())
    or private.teaches_batch(batch_id)
    or ((select private.auth_role()) = 'admin' and private.batch_in_my_branch(batch_id))
    or (select private.auth_role()) = 'super_admin'
  );

-- A student sees only their own membership rows, never classmates'.
create policy "Read: own membership, taught batch, admin's branch, super admin" on public.batch_students
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or private.teaches_batch(batch_id)
    or ((select private.auth_role()) = 'admin' and private.batch_in_my_branch(batch_id))
    or (select private.auth_role()) = 'super_admin'
  );

create policy "Read: own plan, teacher's students, admin's branch, super admin" on public.student_plans
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or private.is_teacher_of(student_id)
    or ((select private.auth_role()) = 'admin' and private.same_branch(student_id))
    or (select private.auth_role()) = 'super_admin'
  );

-- Plan history is for staff who manage plans: admins and super admins.
create policy "Read: admin's branch, super admin" on public.plan_history
  for select to authenticated
  using (
    ((select private.auth_role()) = 'admin' and private.plan_in_my_branch(plan_id))
    or (select private.auth_role()) = 'super_admin'
  );

-- ─── Identity tables: fold M0-06's policies into one per table ──────────────
-- Same rules as before, plus teacher → students in own batches on users.

drop policy "Users read their own branch"    on public.branches;
drop policy "Super admins read every branch" on public.branches;
create policy "Read: own branch, super admin" on public.branches
  for select to authenticated
  using (
    id = (select private.auth_branch())
    or (select private.auth_role()) = 'super_admin'
  );

drop policy "Users read their own row"          on public.users;
drop policy "Admins read users in their branch" on public.users;
drop policy "Super admins read every user"      on public.users;
create policy "Read: self, teacher's students, admin's branch, super admin" on public.users
  for select to authenticated
  using (
    id = (select auth.uid())
    or private.is_teacher_of(id)
    or ((select private.auth_role()) = 'admin' and branch_id = (select private.auth_branch()))
    or (select private.auth_role()) = 'super_admin'
  );

drop policy "Admins read invitations in their branch" on public.invitations;
drop policy "Super admins read every invitation"      on public.invitations;
create policy "Read: admin's branch, super admin" on public.invitations
  for select to authenticated
  using (
    ((select private.auth_role()) = 'admin' and branch_id = (select private.auth_branch()))
    or (select private.auth_role()) = 'super_admin'
  );

drop policy "Users read their own devices"        on public.user_devices;
drop policy "Admins read devices in their branch" on public.user_devices;
drop policy "Super admins read every device"      on public.user_devices;
create policy "Read: own, admin's branch, super admin" on public.user_devices
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or ((select private.auth_role()) = 'admin' and private.same_branch(user_id))
    or (select private.auth_role()) = 'super_admin'
  );

drop policy "Users read their own sessions"        on public.user_sessions;
drop policy "Admins read sessions in their branch" on public.user_sessions;
drop policy "Super admins read every session"      on public.user_sessions;
create policy "Read: own, admin's branch, super admin" on public.user_sessions
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or ((select private.auth_role()) = 'admin' and private.same_branch(user_id))
    or (select private.auth_role()) = 'super_admin'
  );

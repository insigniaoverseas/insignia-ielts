-- M0-08 · Content & assignment: tests, band_scales, band_scale_rows,
--          assignments, assignment_targets, assignment_unlocks
--
-- Same access model as M0-06/07 (PROJECT-MEMORY §4): RLS default-deny, `anon`
-- gets nothing, `authenticated` gets SELECT only, every write is service-role
-- server code behind lib/rbac.ts, cross-table checks via `private` helpers,
-- one select policy per table.
--
-- Test content and answer keys live in R2, never here (D4). The r2_* columns
-- hold object paths; they are not granted to `authenticated`, so no API
-- caller can even learn where key.json lives (MVP-1 §14).
--
-- Additions to MVP-1 §6, recorded in PROJECT-MEMORY §4:
--   * band_scales.variant — Academic and General Training reading use
--     different conversion ladders.
--   * assignments.branch_id — "admin sees own branch" needs a branch.
--   * assignment_targets uses real FKs (batch_id | student_id), not a
--     polymorphic target_type/target_id pair.
--   * assignment_unlocks.extra_attempts — what a "retake" unlock grants.

create extension if not exists btree_gist with schema extensions;

-- ─── Content catalogue ──────────────────────────────────────────────────────

create table public.tests (
  id                     uuid primary key default gen_random_uuid(),
  title                  text not null check (length(trim(title)) > 0),
  skill                  text not null check (skill in ('listening', 'reading', 'writing', 'speaking')),
  variant                text not null check (variant in ('academic', 'general', 'n_a')),
  difficulty             text not null check (difficulty in ('easy', 'medium', 'hard')),
  kind                   text not null check (kind in ('mock', 'class', 'practice')),
  practice_question_type text check (practice_question_type ~ '^[a-z][a-z_]*$'),
  duration_seconds       integer not null check (duration_seconds > 0),
  transfer_seconds       integer not null default 0 check (transfer_seconds >= 0),
  total_questions        integer not null check (total_questions > 0),
  section_count          integer not null check (section_count > 0),
  status                 text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  tags                   text[] not null default '{}',
  content_version        integer not null default 1 check (content_version >= 1),
  r2_content_key         text,
  r2_key_key             text,
  r2_transcript_key      text,
  r2_audio_key           text,
  r2_assets_prefix       text,
  audio_duration_seconds integer check (audio_duration_seconds > 0),
  created_by             uuid references public.users (id) on delete set null,
  published_at           timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  -- Listening has no variant; Reading is Academic or General Training.
  constraint tests_variant_matches_skill check (
    (skill = 'listening' and variant = 'n_a')
    or (skill = 'reading' and variant in ('academic', 'general'))
    or skill in ('writing', 'speaking')
  ),
  -- A practice set drills exactly one question type; other kinds have none.
  constraint tests_practice_type_iff_practice check ((kind = 'practice') = (practice_question_type is not null)),
  -- Published means complete: content and key uploaded, audio for listening.
  constraint tests_published_is_complete check (
    status <> 'published' or (
      published_at is not null
      and r2_content_key is not null
      and r2_key_key is not null
      and (skill <> 'listening' or r2_audio_key is not null)
    )
  )
);
comment on table public.tests is 'Test metadata. Content, key, transcript and audio live in R2 (D4); mock, class and practice are separate pools (kind).';
comment on column public.tests.practice_question_type is 'A type key from lib/question-types.ts (the single source of truth); validated by the importer.';
comment on column public.tests.r2_key_key is 'Path to key.json. Never granted to API roles; read only by server code.';
create index tests_status_kind_idx on public.tests (status, kind);
create index tests_created_by_idx  on public.tests (created_by);

create trigger tests_set_updated_at
  before update on public.tests
  for each row execute function private.set_updated_at();

create table public.band_scales (
  id         uuid primary key default gen_random_uuid(),
  skill      text not null check (skill in ('listening', 'reading')),
  variant    text not null check (variant in ('academic', 'general', 'n_a')),
  name       text not null check (length(trim(name)) > 0),
  is_default boolean not null default false,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint band_scales_variant_matches_skill check (
    (skill = 'listening' and variant = 'n_a') or (skill = 'reading' and variant in ('academic', 'general'))
  )
);
comment on table public.band_scales is 'Raw score → band ladders. Editable, never hardcoded — conversions vary by paper. Seeded in M0-19.';
create unique index band_scales_one_default on public.band_scales (skill, variant) where is_default;
create index band_scales_created_by_idx on public.band_scales (created_by);

create table public.band_scale_rows (
  scale_id uuid not null references public.band_scales (id) on delete cascade,
  raw_min  integer not null check (raw_min >= 0),
  raw_max  integer not null,
  band     numeric(2,1) not null check (band between 0 and 9 and band * 2 = trunc(band * 2)),
  primary key (scale_id, raw_min),
  constraint band_scale_rows_range check (raw_max >= raw_min),
  -- No two rows of one scale may cover the same raw score.
  constraint band_scale_rows_no_overlap exclude using gist (
    scale_id with =,
    int4range(raw_min, raw_max, '[]') with &&
  )
);
comment on column public.band_scale_rows.band is 'Half-band steps only: 0, 0.5 … 9.';

-- ─── Assignment ──────────────────────────────────────────────────────────────

create table public.assignments (
  id                  uuid primary key default gen_random_uuid(),
  test_id             uuid not null references public.tests (id),
  branch_id           uuid not null references public.branches (id),
  available_from      timestamptz not null default now(),
  due_by              timestamptz,
  max_attempts        integer not null default 1 check (max_attempts between 1 and 100),
  allow_review        boolean not null default true,
  results_release     text not null default 'manual' check (results_release in ('immediate', 'scheduled', 'manual')),
  results_released_at timestamptz,
  released_by         uuid references public.users (id) on delete set null,
  band_scale_id       uuid references public.band_scales (id),
  created_by          uuid references public.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  constraint assignments_due_after_available check (due_by is null or due_by > available_from),
  -- scheduled needs a time; immediate never uses one; manual gets one when released.
  constraint assignments_release_time check (
    (results_release <> 'scheduled' or results_released_at is not null)
    and (results_release <> 'immediate' or results_released_at is null)
  )
);
comment on table public.assignments is 'A test given to batches and/or students. The test''s kind is the mode.';
comment on column public.assignments.results_released_at is 'Release gate (MVP-1 §6): immediate, or this time has passed on the server clock.';
create index assignments_test_id_idx       on public.assignments (test_id);
create index assignments_branch_id_idx     on public.assignments (branch_id);
create index assignments_band_scale_id_idx on public.assignments (band_scale_id);
create index assignments_created_by_idx    on public.assignments (created_by);
create index assignments_released_by_idx   on public.assignments (released_by);

create table public.assignment_targets (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  batch_id      uuid references public.batches (id) on delete cascade,
  student_id    uuid references public.users (id) on delete cascade,
  constraint assignment_targets_exactly_one check (num_nonnulls(batch_id, student_id) = 1),
  constraint assignment_targets_batch_once   unique (assignment_id, batch_id),
  constraint assignment_targets_student_once unique (assignment_id, student_id)
);
comment on table public.assignment_targets is 'Who an assignment is for: a whole batch or one student per row.';
create index assignment_targets_batch_id_idx   on public.assignment_targets (batch_id);
create index assignment_targets_student_id_idx on public.assignment_targets (student_id);

create table public.assignment_unlocks (
  id             uuid primary key default gen_random_uuid(),
  assignment_id  uuid not null references public.assignments (id) on delete cascade,
  student_id     uuid not null references public.users (id) on delete cascade,
  unlocked_by    uuid references public.users (id) on delete set null,
  until          timestamptz not null,
  extra_attempts integer not null default 0 check (extra_attempts between 0 and 10),
  reason         text,
  at             timestamptz not null default now(),
  constraint assignment_unlocks_until_after_at check (until > at)
);
comment on table public.assignment_unlocks is 'Per-student override: a late start window and/or extra attempts (retake).';
create index assignment_unlocks_assignment_student_idx on public.assignment_unlocks (assignment_id, student_id);
create index assignment_unlocks_student_id_idx         on public.assignment_unlocks (student_id);
create index assignment_unlocks_unlocked_by_idx        on public.assignment_unlocks (unlocked_by);

-- ─── Helpers (private, SECURITY DEFINER, answer only about the caller) ──────

-- This assignment targets the caller directly, or a batch they are currently in.
create function private.assigned_to_me(target_assignment uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.assignment_targets t
    where t.assignment_id = target_assignment
      and (
        t.student_id = (select auth.uid())
        or (t.batch_id is not null and private.in_batch(t.batch_id))
      )
  )
$$;

-- Some assignment of this test targets the caller.
create function private.test_assigned_to_me(target_test uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.assignments a
    where a.test_id = target_test
      and private.assigned_to_me(a.id)
  )
$$;

-- The caller is an active teacher who created this assignment, teaches a
-- targeted batch, or teaches a targeted student.
create function private.teacher_sees_assignment(target_assignment uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.auth_role() = 'teacher'
     and (
       exists (
         select 1 from public.assignments a
         where a.id = target_assignment and a.created_by = (select auth.uid())
       )
       or exists (
         select 1 from public.assignment_targets t
         where t.assignment_id = target_assignment
           and (
             (t.batch_id is not null and private.teaches_batch(t.batch_id))
             or (t.student_id is not null and private.is_teacher_of(t.student_id))
           )
       )
     )
$$;

-- This assignment belongs to the caller's branch.
create function private.assignment_in_my_branch(target_assignment uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.assignments a
    where a.id = target_assignment
      and a.branch_id = private.auth_branch()
  )
$$;

revoke execute on function
  private.assigned_to_me(uuid), private.test_assigned_to_me(uuid),
  private.teacher_sees_assignment(uuid), private.assignment_in_my_branch(uuid)
  from public;
grant execute on function
  private.assigned_to_me(uuid), private.test_assigned_to_me(uuid),
  private.teacher_sees_assignment(uuid), private.assignment_in_my_branch(uuid)
  to authenticated, service_role;

-- ─── Grants: read-only; tests without the R2 paths ──────────────────────────

revoke all on public.tests, public.band_scales, public.band_scale_rows,
              public.assignments, public.assignment_targets, public.assignment_unlocks
  from anon, authenticated;

grant select (
  id, title, skill, variant, difficulty, kind, practice_question_type,
  duration_seconds, transfer_seconds, total_questions, section_count, status, tags,
  content_version, audio_duration_seconds, created_by, published_at, created_at, updated_at
) on public.tests to authenticated;

grant select on public.band_scales, public.band_scale_rows,
                public.assignments, public.assignment_targets, public.assignment_unlocks
  to authenticated;

-- ─── Row-level security: one select policy per table ────────────────────────

alter table public.tests              enable row level security;
alter table public.band_scales        enable row level security;
alter table public.band_scale_rows    enable row level security;
alter table public.assignments        enable row level security;
alter table public.assignment_targets enable row level security;
alter table public.assignment_unlocks enable row level security;

-- Students: published practice sets (the home library), and mock/class tests
-- only when assigned to them (still visible if later archived).
-- Staff: every published test plus their own drafts. Admins: everything —
-- the test library is shared across branches.
create policy "Read: assigned or practice (students), published + own (staff), all (admins)" on public.tests
  for select to authenticated
  using (
    (status = 'published' and kind = 'practice' and (select private.auth_role()) = 'student')
    or (status <> 'draft' and private.test_assigned_to_me(id))
    or ((select private.is_staff()) and (status = 'published' or created_by = (select auth.uid())))
    or (select private.auth_role()) in ('admin', 'super_admin')
  );

-- Scoring reads band scales server-side; students only ever see the band.
create policy "Read: staff" on public.band_scales
  for select to authenticated
  using ((select private.is_staff()));

create policy "Read: staff" on public.band_scale_rows
  for select to authenticated
  using ((select private.is_staff()));

create policy "Read: assigned to me, teacher's, admin's branch, super admin" on public.assignments
  for select to authenticated
  using (
    private.assigned_to_me(id)
    or private.teacher_sees_assignment(id)
    or ((select private.auth_role()) = 'admin' and branch_id = (select private.auth_branch()))
    or (select private.auth_role()) = 'super_admin'
  );

-- A student sees only the target rows that point at them or their batch.
create policy "Read: my targets, teacher's, admin's branch, super admin" on public.assignment_targets
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or (batch_id is not null and private.in_batch(batch_id))
    or private.teacher_sees_assignment(assignment_id)
    or ((select private.auth_role()) = 'admin' and private.assignment_in_my_branch(assignment_id))
    or (select private.auth_role()) = 'super_admin'
  );

create policy "Read: my unlocks, teacher's, admin's branch, super admin" on public.assignment_unlocks
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or private.teacher_sees_assignment(assignment_id)
    or ((select private.auth_role()) = 'admin' and private.assignment_in_my_branch(assignment_id))
    or (select private.auth_role()) = 'super_admin'
  );

-- M0-09 · Assessment: attempts, answers, answer_marks, attempt_scores, attempt_events
--
-- The rules this migration enforces in the database itself (MVP-1 §7):
--   * The server owns the timer: started_at / expires_at are set by a trigger
--     from the test's duration. Nobody — not even server code — picks them.
--     expires_at can only grow (extra time), and only while in progress.
--   * Attempt state machine: in_progress → submitted | expired | voided;
--     submitted | expired → voided. Nothing else.
--   * Answers can only be written while the attempt is in progress and before
--     expires_at — for every role, service role included.
--   * Replay/rewind: an answer update must carry a higher `revision`.
--   * Correctness and scores are hidden until the release gate opens.
--
-- Deviation from MVP-1 §6, recorded in PROJECT-MEMORY §4: RLS hides rows, not
-- columns, so a student's correctness and score cannot sit on the rows they
-- must read during the test. They move to their own tables:
--   answers.is_correct / marks_awarded / question_type / overrides → answer_marks
--   attempts.raw_score / band / section_scores                      → attempt_scores
-- answer_marks and attempt_scores only show a student a row once the attempt
-- is finished and the assignment's release gate is open (practice: at once).
--
-- Students write their own answers through RLS (insert/update policies +
-- column grants), so a bug in server code still cannot write into someone
-- else's attempt or past the deadline. Everything else is service-role
-- server code behind lib/rbac.ts.

-- ─── Tables ──────────────────────────────────────────────────────────────────

create table public.attempts (
  id                     uuid primary key default gen_random_uuid(),
  assignment_id          uuid references public.assignments (id),
  test_id                uuid not null references public.tests (id),
  student_id             uuid not null references public.users (id) on delete cascade,
  kind                   text not null check (kind in ('mock', 'class', 'practice')),
  content_version        integer not null check (content_version >= 1),
  started_at             timestamptz not null default now(),
  expires_at             timestamptz not null,
  submitted_at           timestamptz,
  time_remaining_seconds integer check (time_remaining_seconds >= 0),
  last_autosave_at       timestamptz,
  audio_downloaded_at    timestamptz,
  audio_started_at       timestamptz,
  audio_completed_at     timestamptz,
  status                 text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'expired', 'voided')),
  tab_switches           integer not null default 0 check (tab_switches >= 0),
  device_info            jsonb check (device_info is null or jsonb_typeof(device_info) = 'object'),
  created_at             timestamptz not null default now(),
  constraint attempts_expires_after_start check (expires_at > started_at),
  -- Only self-started practice has no assignment.
  constraint attempts_assignment_or_practice check (assignment_id is not null or kind = 'practice'),
  constraint attempts_submitted_at_matches_status check (
    (status = 'in_progress' and submitted_at is null)
    or (status in ('submitted', 'expired') and submitted_at is not null)
    or status = 'voided'
  )
);
comment on table public.attempts is 'One sitting of a test. Timing and state are enforced by triggers (MVP-1 §7). Scores live in attempt_scores.';
comment on column public.attempts.expires_at is 'The server clock. Set by trigger at start; only extra time may move it later.';
create unique index attempts_one_open_per_test on public.attempts (student_id, test_id) where status = 'in_progress';
create index attempts_student_id_idx           on public.attempts (student_id);
create index attempts_test_id_idx              on public.attempts (test_id);
create index attempts_assignment_status_idx    on public.attempts (assignment_id, status);

-- The student's own inputs. Readable by them at any time (crash recovery).
create table public.answers (
  attempt_id   uuid not null references public.attempts (id) on delete cascade,
  q_number     smallint not null check (q_number between 1 and 200),
  section_no   smallint not null check (section_no between 1 and 10),
  given_answer text check (length(given_answer) <= 500),
  flagged      boolean not null default false,
  revision     integer not null default 1 check (revision >= 1),
  answered_at  timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (attempt_id, q_number)
);
comment on table public.answers is 'What the student entered. No correctness here — see answer_marks.';
comment on column public.answers.revision is 'Optimistic concurrency: an update must raise it, so a replayed or out-of-order save is rejected.';

-- Per-question marking, written by the scorer. One row per question, answered or not.
create table public.answer_marks (
  attempt_id    uuid not null references public.attempts (id) on delete cascade,
  q_number      smallint not null check (q_number between 1 and 200),
  section_no    smallint not null check (section_no between 1 and 10),
  question_type text not null check (question_type ~ '^[a-z][a-z_]*$'),
  is_correct    boolean not null,
  marks_awarded numeric(3,1) not null default 0 check (marks_awarded >= 0),
  overridden_by uuid references public.users (id) on delete set null,
  override_note text,
  overridden_at timestamptz,
  scored_at     timestamptz not null default now(),
  primary key (attempt_id, q_number),
  constraint answer_marks_override_complete check ((overridden_by is null) = (overridden_at is null))
);
comment on table public.answer_marks is 'Correctness per question, denormalised with question_type for analytics (D4). Hidden from the student until review is released.';
create index answer_marks_overridden_by_idx on public.answer_marks (overridden_by);

create table public.attempt_scores (
  attempt_id     uuid primary key references public.attempts (id) on delete cascade,
  raw_score      numeric(4,1) not null check (raw_score >= 0),
  band           numeric(2,1) not null check (band between 0 and 9 and band * 2 = trunc(band * 2)),
  section_scores jsonb not null default '[]'::jsonb check (jsonb_typeof(section_scores) = 'array'),
  scored_at      timestamptz not null default now()
);
comment on table public.attempt_scores is 'Raw score and band. Hidden from the student until the release gate opens.';

-- Append-only integrity log. Written only by server code; read only by staff.
create table public.attempt_events (
  id         uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  type       text not null check (type in (
               'start', 'resume', 'tab_blur', 'tab_focus', 'paste_blocked', 'audio_error',
               'clock_skew', 'cache_purged', 'force_submit', 'extra_time')),
  meta       jsonb not null default '{}'::jsonb check (jsonb_typeof(meta) = 'object'),
  at         timestamptz not null default now()
);
create index attempt_events_attempt_at_idx on public.attempt_events (attempt_id, at);

create trigger attempt_events_append_only
  before update on public.attempt_events
  for each row execute function private.forbid_update();

-- ─── Triggers: the server clock and the state machine ──────────────────────
-- SECURITY DEFINER so the lookups don't depend on the caller's RLS view.

create function private.attempts_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tests%rowtype;
  asg_test uuid;
begin
  select * into t from public.tests where id = new.test_id;
  if t.status <> 'published' then
    raise exception 'test % is not published', new.test_id using errcode = 'check_violation';
  end if;
  -- An assigned attempt must be for that assignment's test, and the assignment
  -- must target this student (directly, or via a batch they are currently in).
  if new.assignment_id is not null then
    select test_id into asg_test from public.assignments where id = new.assignment_id;
    if asg_test is distinct from new.test_id then
      raise exception 'assignment % is for a different test', new.assignment_id using errcode = 'check_violation';
    end if;
    if not exists (
      select 1 from public.assignment_targets tg
      where tg.assignment_id = new.assignment_id
        and (
          tg.student_id = new.student_id
          or exists (
            select 1 from public.batch_students bs
            where bs.batch_id = tg.batch_id and bs.student_id = new.student_id and bs.left_at is null
          )
        )
    ) then
      raise exception 'assignment % does not target this student', new.assignment_id using errcode = 'insufficient_privilege';
    end if;
  end if;
  -- Copied from the test, never supplied by the caller.
  new.kind            := t.kind;
  new.content_version := t.content_version;
  new.status          := 'in_progress';
  new.submitted_at    := null;
  new.started_at      := now();
  new.expires_at      := now() + make_interval(secs => t.duration_seconds + t.transfer_seconds);
  return new;
end;
$$;

create function private.attempts_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.test_id is distinct from old.test_id
     or new.student_id is distinct from old.student_id
     or new.assignment_id is distinct from old.assignment_id
     or new.kind is distinct from old.kind
     or new.content_version is distinct from old.content_version
     or new.started_at is distinct from old.started_at then
    raise exception 'attempt identity and start time are immutable' using errcode = 'insufficient_privilege';
  end if;

  if new.expires_at is distinct from old.expires_at
     and (old.status <> 'in_progress' or new.expires_at < old.expires_at) then
    raise exception 'expires_at may only be extended while in progress' using errcode = 'insufficient_privilege';
  end if;

  if new.status is distinct from old.status then
    if not (
      (old.status = 'in_progress' and new.status in ('submitted', 'expired', 'voided'))
      or (old.status in ('submitted', 'expired') and new.status = 'voided')
    ) then
      raise exception 'attempt cannot move from % to %', old.status, new.status using errcode = 'check_violation';
    end if;
    if new.status in ('submitted', 'expired') then
      new.submitted_at := coalesce(new.submitted_at, now());
    end if;
  elsif new.submitted_at is distinct from old.submitted_at then
    raise exception 'submitted_at is set by the state change only' using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

-- Answers: only into an open attempt, before the deadline, q_number in range,
-- revision strictly rising. Applies to every role.
create function private.answers_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.attempts%rowtype;
  total integer;
begin
  select * into a from public.attempts where id = new.attempt_id;
  if a.status <> 'in_progress' then
    raise exception 'attempt is %', a.status using errcode = 'insufficient_privilege';
  end if;
  if now() > a.expires_at then
    raise exception 'time is up' using errcode = 'insufficient_privilege';
  end if;

  select total_questions into total from public.tests where id = a.test_id;
  if new.q_number > total then
    raise exception 'question % is outside this test (1–%)', new.q_number, total using errcode = 'check_violation';
  end if;

  if tg_op = 'UPDATE' then
    if new.attempt_id <> old.attempt_id or new.q_number <> old.q_number then
      raise exception 'answer identity is immutable' using errcode = 'insufficient_privilege';
    end if;
    if new.revision <= old.revision then
      raise exception 'stale revision % (current %)', new.revision, old.revision using errcode = 'serialization_failure';
    end if;
    new.answered_at := old.answered_at;
    new.updated_at  := now();
  else
    new.answered_at := now();
    new.updated_at  := now();
  end if;

  update public.attempts set last_autosave_at = now() where id = new.attempt_id;
  return new;
end;
$$;

revoke execute on function private.attempts_before_insert(), private.attempts_before_update(), private.answers_before_write() from public;

create trigger attempts_before_insert before insert on public.attempts
  for each row execute function private.attempts_before_insert();
create trigger attempts_before_update before update on public.attempts
  for each row execute function private.attempts_before_update();
create trigger answers_before_write before insert or update on public.answers
  for each row execute function private.answers_before_write();

-- ─── Helpers (private, SECURITY DEFINER) ────────────────────────────────────

-- Staff scope over one attempt: a teacher of the student or of the assignment,
-- an admin of the student's branch, or a super admin.
create function private.staff_sees_attempt(target_attempt uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.attempts a
    where a.id = target_attempt
      and (
        private.is_teacher_of(a.student_id)
        or (a.assignment_id is not null and private.teacher_sees_assignment(a.assignment_id))
        or (private.auth_role() = 'admin' and private.same_branch(a.student_id))
        or private.auth_role() = 'super_admin'
      )
  )
$$;

-- The caller owns this attempt and may see its score: practice at once;
-- otherwise finished and past the assignment's release gate (MVP-1 §6).
create function private.results_visible(target_attempt uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.attempts a
    left join public.assignments asg on asg.id = a.assignment_id
    where a.id = target_attempt
      and a.student_id = (select auth.uid())
      and (
        a.kind = 'practice'
        or (
          a.status in ('submitted', 'expired')
          and (asg.results_release = 'immediate'
               or (asg.results_released_at is not null and asg.results_released_at <= now()))
        )
      )
  )
$$;

-- As results_visible, and the assignment allows per-question review.
create function private.review_visible(target_attempt uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.results_visible(target_attempt)
     and exists (
       select 1
       from public.attempts a
       left join public.assignments asg on asg.id = a.assignment_id
       where a.id = target_attempt
         and (a.kind = 'practice' or asg.allow_review)
     )
$$;

-- The caller owns this attempt (any state).
create function private.my_attempt(target_attempt uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.attempts a
    where a.id = target_attempt
      and a.student_id = (select auth.uid())
  )
$$;

-- The caller owns this attempt, it is in progress, and time is not up.
create function private.my_open_attempt(target_attempt uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.attempts a
    where a.id = target_attempt
      and a.student_id = (select auth.uid())
      and a.status = 'in_progress'
      and now() <= a.expires_at
  )
$$;

-- The caller has an attempt on this test (so its title stays visible in history).
create function private.has_attempt_on(target_test uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.attempts a
    where a.test_id = target_test
      and a.student_id = (select auth.uid())
  )
$$;

revoke execute on function
  private.staff_sees_attempt(uuid), private.results_visible(uuid), private.review_visible(uuid),
  private.my_attempt(uuid), private.my_open_attempt(uuid), private.has_attempt_on(uuid)
  from public;
grant execute on function
  private.staff_sees_attempt(uuid), private.results_visible(uuid), private.review_visible(uuid),
  private.my_attempt(uuid), private.my_open_attempt(uuid), private.has_attempt_on(uuid)
  to authenticated, service_role;

-- ─── Grants ──────────────────────────────────────────────────────────────────

revoke all on public.attempts, public.answers, public.answer_marks, public.attempt_scores, public.attempt_events
  from anon, authenticated;

grant select on public.attempts, public.answers, public.answer_marks, public.attempt_scores, public.attempt_events
  to authenticated;
-- Autosave: the student writes only their own inputs; the trigger stamps times.
grant insert (attempt_id, q_number, section_no, given_answer, flagged, revision) on public.answers to authenticated;
grant update (given_answer, flagged, revision) on public.answers to authenticated;

-- ─── Row-level security ──────────────────────────────────────────────────────

alter table public.attempts       enable row level security;
alter table public.answers        enable row level security;
alter table public.answer_marks   enable row level security;
alter table public.attempt_scores enable row level security;
alter table public.attempt_events enable row level security;

create policy "Read: own, or staff in scope" on public.attempts
  for select to authenticated
  using (student_id = (select auth.uid()) or private.staff_sees_attempt(id));

create policy "Read: own attempt's answers, or staff in scope" on public.answers
  for select to authenticated
  using (private.my_attempt(attempt_id) or private.staff_sees_attempt(attempt_id));

create policy "Write: own open attempt, before the deadline" on public.answers
  for insert to authenticated
  with check (private.my_open_attempt(attempt_id));

create policy "Update: own open attempt, before the deadline" on public.answers
  for update to authenticated
  using (private.my_open_attempt(attempt_id))
  with check (private.my_open_attempt(attempt_id));

create policy "Read: own once review is released, or staff in scope" on public.answer_marks
  for select to authenticated
  using (private.review_visible(attempt_id) or private.staff_sees_attempt(attempt_id));

create policy "Read: own once results are released, or staff in scope" on public.attempt_scores
  for select to authenticated
  using (private.results_visible(attempt_id) or private.staff_sees_attempt(attempt_id));

create policy "Read: staff in scope" on public.attempt_events
  for select to authenticated
  using (private.staff_sees_attempt(attempt_id));

-- ─── tests: a student keeps seeing tests they have sat ──────────────────────

drop policy "Read: assigned or practice (students), published + own (staff), all (admins)" on public.tests;
create policy "Read: assigned, practice or sat (students), published + own (staff), all (admins)" on public.tests
  for select to authenticated
  using (
    (status = 'published' and kind = 'practice' and (select private.auth_role()) = 'student')
    or (status <> 'draft' and private.test_assigned_to_me(id))
    or private.has_attempt_on(id)
    or ((select private.is_staff()) and (status = 'published' or created_by = (select auth.uid())))
    or (select private.auth_role()) in ('admin', 'super_admin')
  );

-- Staff notes on a student's plan (PROJECT-MEMORY §7 Q12, answered 2026-09-16).
--
-- student_plans.notes was granted to `authenticated` along with the rest of the
-- row, so a student could read whatever the front desk typed there — fee
-- chasing, opinions, family circumstances. The plan *facts* must stay visible
-- to the student; the commentary must not.
--
-- The column moves to its own table so the split is enforced by RLS rather than
-- by asking staff to self-censor. Same audience as plan_history: admins in the
-- student's branch, and Owner. Not teachers, not the student. Nothing has
-- written a note yet (no UI, no importer), so no data is carried over.

alter table public.student_plans drop column notes;

create table public.student_plan_notes (
  plan_id    uuid primary key references public.student_plans (id) on delete cascade,
  body       text not null check (length(trim(body)) > 0),
  updated_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.student_plan_notes is
  'Internal staff note on a plan. Never readable by the student it is about — that is the whole point of the table (§7 Q12).';
comment on column public.student_plan_notes.body is
  'Free text, admin-facing. One note per plan; rewriting replaces it.';
create index student_plan_notes_updated_by_idx on public.student_plan_notes (updated_by);

create trigger student_plan_notes_set_updated_at
  before update on public.student_plan_notes
  for each row execute function private.set_updated_at();

-- ─── Grants: read-only, as with every other table ────────────────────────────

revoke all on public.student_plan_notes from anon, authenticated;
grant select on public.student_plan_notes to authenticated;

-- ─── Row-level security ──────────────────────────────────────────────────────
-- Identical audience to plan_history, deliberately: the two are read side by
-- side on the plans workqueue (M5-06) and the student drawer (M5-05).

alter table public.student_plan_notes enable row level security;

create policy "Read: admin's branch, super admin" on public.student_plan_notes
  for select to authenticated
  using (
    ((select private.auth_role()) = 'admin' and private.plan_in_my_branch(plan_id))
    or (select private.auth_role()) = 'super_admin'
  );

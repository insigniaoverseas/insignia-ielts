-- M0-10 · Cross-cutting: audit_log, rate_limits
--
-- Same access model as M0-06…09 (PROJECT-MEMORY §4). Both tables are written
-- only by server code with the service role.
--
-- Additions to MVP-1 §6, recorded in PROJECT-MEMORY §4:
--   * audit_log.branch_id — "admin reads own branch" (§13) needs a branch.
--   * audit_log.actor_id has NO foreign key, on purpose: the trail must
--     survive a user's erasure (DPDP, M9-08) and must never be rewritten by a
--     cascade. It is append-only — no UPDATE, ever.
--   * rate_limits has no API access at all: its keys contain IP addresses.

-- ─── audit_log ───────────────────────────────────────────────────────────────

create table public.audit_log (
  id        uuid primary key default gen_random_uuid(),
  actor_id  uuid,          -- the acting user; deliberately not a foreign key
  branch_id uuid references public.branches (id),
  action    text not null check (action ~ '^[a-z][a-z_]*\.[a-z][a-z_]*$'),
  entity    text not null check (entity ~ '^[a-z][a-z_]*$'),
  entity_id text,
  meta      jsonb not null default '{}'::jsonb check (jsonb_typeof(meta) = 'object'),
  at        timestamptz not null default now()
);
comment on table public.audit_log is 'Every privileged action (MVP-1 §8), e.g. invite.create, role.change, plan.extend, results.release, attempt.void. Append-only.';
comment on column public.audit_log.actor_id is 'auth user id of the actor. Not a foreign key, so the trail survives user erasure.';
comment on column public.audit_log.action is 'entity.verb, lowercase — e.g. plan.extend.';
create index audit_log_branch_at_idx on public.audit_log (branch_id, at desc);
create index audit_log_actor_at_idx  on public.audit_log (actor_id, at desc);
create index audit_log_entity_idx    on public.audit_log (entity, entity_id);

create trigger audit_log_append_only
  before update on public.audit_log
  for each row execute function private.forbid_update();

-- ─── rate_limits ─────────────────────────────────────────────────────────────

create table public.rate_limits (
  key          text not null check (length(key) between 1 and 200),
  window_start timestamptz not null,
  count        integer not null default 0 check (count >= 0),
  primary key (key, window_start)
);
comment on table public.rate_limits is 'Postgres fallback behind the Durable Object counter (M1-10). Server-only: keys contain IPs.';
create index rate_limits_window_start_idx on public.rate_limits (window_start);

-- ─── Fix from M0-07: plan_history.actor_id ─────────────────────────────────
-- plan_history is append-only, so the ON DELETE SET NULL on its actor_id FK is
-- an UPDATE the trigger refuses — erasing any staff user who ever changed a
-- plan would fail. Audit trails keep the actor's id without a foreign key,
-- exactly like audit_log.
alter table public.plan_history drop constraint plan_history_actor_id_fkey;
comment on column public.plan_history.actor_id is 'auth user id of the actor. Not a foreign key, so the trail survives user erasure.';

-- ─── Grants ──────────────────────────────────────────────────────────────────

revoke all on public.audit_log, public.rate_limits from anon, authenticated;
grant select on public.audit_log to authenticated;
-- rate_limits: nothing for API roles.

-- ─── Row-level security ──────────────────────────────────────────────────────

alter table public.audit_log   enable row level security;
alter table public.rate_limits enable row level security;

create policy "Read: admin's branch, super admin" on public.audit_log
  for select to authenticated
  using (
    ((select private.auth_role()) = 'admin' and branch_id = (select private.auth_branch()))
    or (select private.auth_role()) = 'super_admin'
  );

-- rate_limits: RLS on and no policy — default-deny, even if a grant slips in later.

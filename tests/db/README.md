# `tests/db`

**One responsibility:** prove the database's access control — row-level security, grants and triggers — does what `MVP-1.md` §7 and §13 say. This is the M0-11 default-deny test. No Docker and no Supabase project needed.

| Command | What it does | Time |
|---|---|---|
| `npm run test:db` | Applies every file in `supabase/migrations/` to [PGlite](https://pglite.dev) (real Postgres, in WASM), seeds fixtures, then queries as student, teacher, admin, super admin, suspended users, a user with no profile, `anon` and `service_role`. | ~2 s |
| `npm run test:db:sweep` | Drops each RLS policy in turn and reruns the test. **Every drop must make it fail** — a policy nothing notices is a policy nothing tests. | ~45 s |

Both exit non-zero on failure, so they can run in CI (M0-22).

## How it imitates Supabase

A shim at the top of `rls.test.mjs` creates what the migrations expect from Supabase: the `anon`, `authenticated` and `service_role` roles; `auth.users`; `auth.uid()` reading `request.jwt.claims` (as Supabase does); the `extensions` schema; and the same default grants the live project has on `public` (copied from its `pg_default_acl`). Each probe runs `set local role …` with that user's claims inside a transaction that is rolled back.

**What it cannot catch** — check these on the live project after every `db push` (Supabase MCP `list_tables`, `get_advisors`):

- PGlite is Postgres **18**; the project is **17**. Nothing here uses a feature that differs, but keep an eye out.
- Supabase-only pieces aren't present: the `ensure_rls` event trigger, PostgREST, Auth, and Supabase's own restrictions (e.g. the locked `auth` schema).

## Adding a table

When a migration adds a table, the sweep will fail until the test covers its policy. Add to `rls.test.mjs`:

1. Fixtures for the new table (in the matching section).
2. For each role: what they **can** read, and what they **can't**. Both directions — the sweep only catches the missing *can*.
3. `anon cannot select <table>`.
4. Any column that must stay unreadable (`denied(... select <column> ...)`), and that `select *` is refused if so.
5. The table name in `allTables` (the no-recursion loop), and bump the "public has exactly N tables" count.

Then run both commands.

## Rules the tests pin down

- `anon` reads nothing. `authenticated` never reads `pin_hash`, `device_secret_hash`, `token_hash` or any `tests.r2_*` path.
- A student never sees another student's row in any table.
- Correctness (`answer_marks`) and scores (`attempt_scores`) stay hidden until the attempt is finished and the release gate is open; practice at once.
- The clock, attempt state machine, answer deadline and `revision` are enforced by triggers for **every** role, service role included.
- Append-only tables (`plan_history`, `attempt_events`, `audit_log`) refuse updates, and staff can still be erased.
- Exactly one policy per table per command (Supabase advisor), and no policy recursion.

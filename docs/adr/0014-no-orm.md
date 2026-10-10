# ADR 0014: No ORM: supabase-js, generated types and Postgres functions

- **Status:** Accepted
- **Date:** 2026-09-15
- **Origin:** `PROJECT-MEMORY.md` §4, 2026-09-15 (M0-05)

## Context

The plan listed Drizzle for typed SQL. Drizzle connects to Postgres as a privileged role, so **RLS does not apply** to its queries — silently removing one of the two gates that keep one student's data from another.

## Decision

Every query goes through `@supabase/ssr` / `supabase-js`, typed by `supabase gen types` (`src/lib/supabase/database.types.ts`). Anything needing a transaction or heavy SQL is a Postgres function in a migration, called with `.rpc()`, `SECURITY INVOKER` unless there is a written reason. `supabase/migrations/` is the only schema source.

## Consequences

- `supabase-js` always carries the user's JWT, so RLS always applies to request-scoped reads.
- No `db/schema.ts` to drift from the migrations; no TCP connection from the Worker (plain HTTPS to PostgREST).
- PostgREST returns at most 1,000 rows without an error: anything that grows with students × questions must page with `selectAll` (`PROJECT-MEMORY.md` §4).
- Transactional logic lives in plpgsql; scoring itself stays in `lib/scoring.ts`.

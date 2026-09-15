# `lib/supabase`

**One responsibility:** every way the app talks to Postgres. There is no ORM — see `PROJECT-MEMORY.md` §4, "No ORM".

| File | What it is |
|---|---|
| `database.types.ts` | **Generated — never edit by hand.** Run `npm run db:types` after every migration. Built from the linked project's `public` schema. |
| `server.ts` | `createClient()` — acts **as the signed-in user**; every query runs under RLS. Use this by default. One per request. |
| `admin.ts` | `createAdminClient()` — the **secret key, bypasses RLS**. Only behind a `lib/rbac.ts` check, and every use writes `audit_log`. Triggers still bind it. |
| `env.ts` | Reads `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`; throws a message naming the missing variable. |

All three `import "server-only"` — importing any of them from a `"use client"` file fails `next build` (verified 2026-09-15).

**There is no browser client.** The browser never talks to Supabase: the session sits in httpOnly cookies, data is fetched in Server Components and changed in Server Actions. That keeps `supabase-js` out of the student bundle (~200 KB budget) and the JWT out of page JavaScript.

## Rules

- **Queries go through `supabase-js`**, typed with `Database` from `database.types.ts`, so RLS always applies to the user's own session.
- **Transactions and heavy SQL are Postgres functions**, written in a `supabase/migrations/` file and called with `.rpc()`. `SECURITY INVOKER` unless the migration says why not.
- **The schema lives only in `supabase/migrations/`.** If this folder's types disagree with the database, regenerate — don't patch.

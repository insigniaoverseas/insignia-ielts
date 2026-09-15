# `lib/supabase`

**One responsibility:** every way the app talks to Postgres. There is no ORM — see `PROJECT-MEMORY.md` §4, "No ORM".

| File | What it is |
|---|---|
| `database.types.ts` | **Generated — never edit by hand.** Run `npm run db:types` after every migration. Built from the linked project's `public` schema. |
| `server.ts`, `client.ts`, `admin.ts` | The three Supabase clients — arrive in `BUILD-STEPS.md` step 21. `admin.ts` holds the service-role key and must never be importable from client code. |

## Rules

- **Queries go through `supabase-js`**, typed with `Database` from `database.types.ts`, so RLS always applies to the user's own session.
- **Transactions and heavy SQL are Postgres functions**, written in a `supabase/migrations/` file and called with `.rpc()`. `SECURITY INVOKER` unless the migration says why not.
- **The schema lives only in `supabase/migrations/`.** If this folder's types disagree with the database, regenerate — don't patch.

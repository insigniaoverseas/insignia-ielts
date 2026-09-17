# `lib/queries` — server-only screen data

Production pages read their view-models from these modules. Every database read
uses the cookie-backed Supabase client, so Postgres RLS is the first scope gate;
layouts and page guards provide the independent application gate.

- `student.ts` — the signed-in student's profile, plan, assignments, attempts,
  released results, progress and sessions.
- `teacher.ts` — the teacher's batches, rosters, assignments, results and live
  attempt summaries.
- `admin.ts` — branch-scoped students, plans, batches, catalogue metadata,
  staff roles and audit records.
- `attempt.ts` — verifies attempt/assignment ownership while private R2 test
  content and audio delivery remain deferred.
- `batches.ts` — batch, branch, teacher and student options for forms that offer a choice.
- `shared.ts` — date, display and safe database-row conversion helpers.

No module here uses the secret-key client. Ordinary reads must stay under RLS.
Privileged writes belong in Server Actions and must also call `lib/rbac.ts`.

## Deferred Cloudflare data

Question documents, answer keys, explanations and Listening audio live in
private R2 objects. Until those readers are implemented, the player, review and
answer-key pages show an explicit unavailable state after verifying the related
Supabase record. They never substitute fixture content.

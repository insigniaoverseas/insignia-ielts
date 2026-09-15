# Build Steps — Insignia IELTS

> **The ordered walkthrough.** [`MVP-1.md`](MVP-1.md) says *what* to build; this says *in what order, with what commands, and how to know it worked*.
> Progress is still ticked in [`PROJECT-MEMORY.md`](PROJECT-MEMORY.md). The `(M0-04)` tags below are the task IDs there.

---

## How to use this

- Steps are **dependency-ordered**. Doing them in sequence never leaves you blocked.
- `⚡` = can run in parallel with the previous step (different person, or a second agent).
- `⚠️` = irreversible or security-critical. Slow down.
- `🚦` = checkpoint. Something real works; stop and verify before moving on.
- Each step ends with **✅ Done when** — the observable fact that proves it, not "the code compiles".

**First runnable demo is step 55.** First thing you can put in front of a real student is step 57.

---

## Phase 0 — Decide and provision (½ day)

Nothing here is code. All of it blocks code.

### 1. Answer the two questions that change what gets built
> ✅ **Done 2026-09-15.** Q1 → Easy / Medium / Hard. Q2 → release is chosen per assignment: right away, on a schedule, or when a teacher releases (default). Q3 → mock, class and practice are three separate pools; practice sets are by question type. Spec updated in `MVP-1.md` §6. Instructions kept below for reference.

Open [`PROJECT-MEMORY.md`](PROJECT-MEMORY.md) §7. Q2 (mock results auto-release vs teacher-released) and Q3 (practice library pool) set defaults you'll bake into the assignment engine at step 81. Q1 is a one-word label. The rest can wait.
**✅ Done when** Q1–Q3 have answers written into §7.

### 2. ⚠️ Create the Supabase project in `ap-south-1` (Mumbai) `(M0-04)`
The region is fixed at creation and **cannot be changed** — getting it wrong means a full migration later. Indian users hitting a Mumbai database is ~20–40 ms instead of ~180 ms via Singapore, on a timed test.
Record the project ref in `PROJECT-MEMORY.md` §6. Set a usage alert at 70%.
**✅ Done when** the project exists, the region reads `ap-south-1`, and the ref is recorded.

### 3. ⚡ Create the R2 buckets `(M0-12 part 1)`
```bash
npx wrangler r2 bucket create insignia-ielts-content
npx wrangler r2 bucket create insignia-ielts-audio
```
Leave both **private**. Do not enable the public dev URL.
**✅ Done when** `npx wrangler r2 bucket list` shows both and neither has a public URL.

### 4. ⚡ Register the accounts you'll need later
Resend (invite email — step 40), Sentry, Cloudflare Turnstile. Record names in `PROJECT-MEMORY.md` §6; **values go in Wrangler secrets, never in the file.**
**✅ Done when** §6 lists each resource with its identifier.

---

## Phase 1 — Skeleton (2–3 days)

### 5. Re-scaffold onto Next.js 16 + OpenNext `(M0-01)`
> ✅ **Done 2026-09-15** (commit `576a7f3`) — Next 16.3.4 + `@opennextjs/cloudflare` 1.20.3, app code under `src/`. Lint fixed and auto-deploy working the same day. Instructions kept below for reference.

The repo held a `vinext` scaffold. Scaffold fresh to a sibling directory, then move the app files across — keep `.git`, `Design files/`, `MVP-1.md`, `PROJECT-MEMORY.md`, `CLAUDE.md`, `BUILD-STEPS.md`.

```bash
cd ..
npm create cloudflare@latest -- insignia-next --framework=next --platform=workers
```

Then delete from the old tree: `vite.config.ts`, `next.config.ts` boilerplate, `app/page.tsx`, `app/api/hello/`, and the `vinext` / `@vinext/cloudflare` / `@vitejs/plugin-rsc` dependencies.
**Never add `@vercel/*` packages or Node-runtime middleware** — they weld you to one host and OpenNext doesn't support the latter.
**✅ Done when** `npm run dev` serves a page and `npm run build` produces Worker output.

### 6. Port `wrangler.jsonc` `(M0-01)`
**Cloudflare Git auto-deploy (Workers Builds)** — set these in the dashboard (the Worker → Settings → Builds → Build configuration). The default `npm run build` only runs `next build` and the deploy then fails with *"Could not find compiled Open Next config"*:

| Field | Value |
|---|---|
| Build command | `npx opennextjs-cloudflare build` |
| Deploy command | `npx opennextjs-cloudflare deploy` |

⚠️ **Don't** "fix" it by changing `package.json` to `"build": "opennextjs-cloudflare build"` — OpenNext's build calls `npm run build` internally, so that loops forever.

The worker is named `insignia-test`, and the dashboard Worker the repo is connected to must have the same name. ⚠️ If you ever rename it, change **all three** places together — `package.json` name, `wrangler.jsonc` `name`, and `services[0].service` — the self-reference binding must match the worker name or OpenNext caching breaks.
Keep `observability` and `upload_source_maps`. Add the R2 bindings from step 3.
**✅ Done when** `npm run cf-typegen` regenerates `cloudflare-env.d.ts` with both buckets.

### 7. Tailwind v4 tokens `(M0-02)`
Paste the `@theme` block from [`MVP-1.md` §15](MVP-1.md#15-repo-structure-and-design-system) into `src/app/globals.css`. Load Inter + IBM Plex Mono in `src/app/layout.tsx`, replacing the scaffold's Geist fonts.
⚠️ **Tailwind v4 is CSS-first.** The `tailwind.config.js` block printed in `00 Design System.dc.html` is v3 syntax — the *values* carry over, the mechanism does not.
**✅ Done when** a `bg-brand text-surface` div renders `#1D4ED8`.

### 8. shadcn/ui init + restyle `(M0-03)`
> ✅ **Done 2026-09-15.** `init` was deliberately *not* run — `components.json` is hand-written so it can't overwrite `globals.css` or `src/lib/utils.ts`. The component API and three editing traps are in `src/components/ui/README.md`. Commands kept for reference.

```bash
npx shadcn@latest init
npx shadcn@latest add button input card dialog table skeleton sonner select checkbox
```
Restyle to the tokens: student primary buttons **56px**, admin 40px, radius 8px inputs / 12px cards, cards get a **1px `--color-line` border, never a shadow**.
**✅ Done when** a `<Button>` matches the primary button in `00 Design System.dc.html`.

### 9. ⚡ Security headers + CSP middleware `(M0-13)`
`lib/security/headers.ts` — HSTS, **nonce-based CSP with no `unsafe-inline`**, `frame-ancestors 'none'`, `Referrer-Policy`, `Permissions-Policy`. Plus `lib/security/sanitize.ts` wrapping `rehype-sanitize` with a strict allowlist.
Do this now, not at hardening. Retrofitting a nonce CSP onto a finished app means chasing every inline style you shipped.
**✅ Done when** response headers show the CSP and a test page with an inline `<script>` is blocked.

### 10. ⚡ Wire secrets `(M0-14)`
```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY   # sb_publishable_…
npx wrangler secret put SUPABASE_SECRET_KEY        # sb_secret_… — create it under Project Settings → API keys
```
Create `.dev.vars` (gitignored) and `.dev.vars.example` (names only, committed).
⚠️ **`SUPABASE_SECRET_KEY` must never appear in `wrangler.jsonc` vars or any client bundle.** (Renamed 2026-09-15 from `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` — Supabase's publishable/secret keys.) `.dev.vars.example` already exists.
**✅ Done when** `grep -r "eyJ" wrangler.jsonc .dev.vars.example` returns nothing.

### 11. ⚡ `docs/` tree + ADRs `(M0-21)`
Create the seven files listed in [`MVP-1.md` §16](MVP-1.md#16-documentation-and-code-organisation-d13) and seed `docs/adr/0001`–`0013` from the decision log. One paragraph each is enough — they exist so nobody re-litigates a settled choice.
**✅ Done when** `docs/` matches §16 and thirteen ADRs exist.

### 12. CI gates `(M0-22)`
GitHub Actions: typecheck · lint · vitest · `npm audit`. Then the one that matters:

```bash
# fail the build if scoring logic or an R2 key path reaches the client
! grep -rE "(accepted_variants|key\.json|bandFor|scoreAttempt)" .next/static/ || exit 1
```

**✅ Done when** a deliberate import of `lib/scoring.ts` into a client component fails CI.

🚦 **CHECKPOINT** — an empty but correctly-configured app deploys to Workers.

---

## Phase 2 — Database (3–4 days)

### 13. Supabase CLI + generated types `(M0-05)`
```bash
npm i -D supabase
npx supabase login                                     # opens the browser
npx supabase init
npx supabase link --project-ref zpqszkwavnjomxjgimni   # asks for the DB password — type it, never paste it anywhere
npx supabase db push                                   # applies the pending 20260915090941_harden_rls_auto_enable.sql
```
Add `"db:types": "supabase gen types typescript --linked > src/lib/supabase/database.types.ts"` to `package.json`, and run it after every migration.
**No ORM** ([`PROJECT-MEMORY.md`](PROJECT-MEMORY.md) §4, 2026-09-15). Queries go through `supabase-js`, typed by the generated file. Anything needing a transaction or heavy SQL is a Postgres function in a migration, called with `.rpc()`.
**✅ Done when** `db push` succeeds, the Supabase security advisor is clean, and `npm run db:types` writes `src/lib/supabase/database.types.ts`.

### 14–18. The five migrations `(M0-06 … M0-10)`
One migration per group, from [`MVP-1.md` §6](MVP-1.md#6-database--erd-and-table-design). ⚠️ **Write the RLS policies in the same file as the tables** — retrofitting RLS onto a live app is miserable.

| Step | Migration | Tables |
|---|---|---|
| 14 | `identity` | `branches`, `roles`, `users`, `invitations`, `user_devices`, `user_sessions` — plus the `private` schema and the helpers `auth_role`, `auth_branch`, `is_staff`, `same_branch` (brought forward from step 19) |
| 15 | `cohorts` | `batches`, `batch_teachers`, `batch_students`, `student_plans`, `plan_history` — plus `private.is_teacher_of()` and 4 more helpers, the "teacher reads students in own batches" policy on `users`, the `invitations.batch_id` foreign key, and M0-06's policies folded into one per table |
| 16 | `content` | `tests`, `band_scales`, `band_scale_rows`, `assignments`, `assignment_targets`, `assignment_unlocks` — plus 4 helpers, `btree_gist` for non-overlapping band rows, and the `r2_*` columns withheld from API roles |
| 17 | `assessment` | `attempts`, `answers`, `attempt_events` — plus `answer_marks` and `attempt_scores` (correctness and scores split out so RLS can gate them), the clock/state-machine/answer triggers, and 6 helpers |
| 18 | `crosscutting` | `audit_log` (+`branch_id`, no actor FK, append-only), `rate_limits` (no API access) — plus the `plan_history.actor_id` FK fix |

Every table gets `ALTER TABLE … ENABLE ROW LEVEL SECURITY` and **no permissive fallback policy**. Every table also gets `revoke all … from anon, authenticated` and explicit, column-limited grants back ([`MVP-1.md` §13](MVP-1.md#13-row-level-security) "Grants are a gate too").
**Workflow:** the agent writes the migration and runs it against a local PGlite harness that mimics Supabase's roles and `auth.uid()` (no Docker needed), plus `db push --dry-run`; the user reviews and runs the real `db push` ([`PROJECT-MEMORY.md`](PROJECT-MEMORY.md) §5).
**✅ Done when** `npx supabase db push` applies all five and `npm run db:types` has regenerated `database.types.ts` from them.

### 19. ⚠️ RLS helpers and the default-deny test `(M0-11)`
> ✅ **Done 2026-09-15.** `tests/db/rls.test.mjs` (`npm run test:db`, 229 checks, ~2 s) covers all **24** tables; `tests/db/policy-sweep.mjs` (`npm run test:db:sweep`) drops each of the 25 policies in turn and every drop fails the test. The sweep caught one untested policy (`band_scales`) on its first run. No Docker needed — PGlite.

The helpers now ship with the tables that need them (steps 14–15), as `SECURITY DEFINER` functions in the `private` schema — not `auth`, which Supabase has locked. ~~Write `auth_role()`, `auth_branch()`, `is_teacher_of()`, `same_branch()`, `is_staff()`~~ superseded 2026-09-15.

Then the test that is the actual deliverable: **for every table, a query as a student role returns nothing unless a policy explicitly allows it.** A table you forget to police must return zero rows, not every row.
**✅ Done when** the test passes for all 20 tables, and fails if you drop one policy.

### 20. Seed roles and the band scale `(M0-19)`
> ✅ **Written 2026-09-15** as migration `20260915174541_reference_data.sql`: the five roles, plus default Listening, Academic Reading and General Training Reading scales from **the institute's own charts** (supplied 2026-09-15), each covering 0–40, with a "Below 4" row. Permissions come with step 22. Instructions kept below for reference.

Five roles with permissions. Default Listening ladder: 39–40→9.0, 37–38→8.5, 35–36→8.0, 32–34→7.5, 30–31→7.0, 26–29→6.5, 23–25→6.0, 18–22→5.5, 16–17→5.0.
⚠️ **Verify against a current Cambridge book before go-live** — official conversions vary by paper, which is why this is a table and not a constant.
**✅ Done when** `SELECT * FROM band_scale_rows` returns the ladder and it's editable.

### 21. Supabase clients `(M0-05)`
> ✅ **Done 2026-09-15.** `server.ts` (RLS-scoped, cookies via `@supabase/ssr`), `admin.ts` (secret key), `env.ts`; **no `client.ts`** — see `PROJECT-MEMORY.md` §4. Verified: a `"use client"` import of `admin.ts` fails `next build` with the `server-only` error; the normal build passes.

~~`lib/supabase/{server,client,admin}.ts`~~. The `admin` one uses the secret key and must be importable **only** from server code behind a role check.
**✅ Done when** importing `admin.ts` from a `"use client"` file fails the build.

### 22. `lib/rbac.ts` `(M1-13, brought forward)`
> ✅ **Written 2026-09-15.** Migration `20260915180655_role_permissions.sql` seeds `roles.permissions` (permission → scope) and shows `super_admin` as **Owner**; `lib/permissions.ts` (pure) + `lib/rbac.ts` (`getActor`, `requirePermission`, server-only). `npm run test:unit`: 29 checks read the seeded column — `can(actor, 'test:publish')` is false for a teacher because the **database** says so. Route guards come with the first privileged routes (M1).

The second independent gate over RLS. Every privileged route calls it *and* relies on RLS — two gates, because one missing policy shouldn't be a breach.
**✅ Done when** `can(user, 'test:publish')` resolves from the `roles.permissions` column, not a hardcoded string.

🚦 **CHECKPOINT** — the database is real, policed, and a student role provably cannot read another student's rows.

---

## Phase 3 — Content pipeline (3–4 days)

This phase is what lets you get real tests into the system. It blocks the player.

### 23. `lib/question-types.ts` `(M0-15)`
The 18-type matrix from [`MVP-1.md` §10](MVP-1.md#10-question-types-d12): `type` → `widget` + `container` + allowed skill/variant.
**This is the single source of truth.** The upload schema, the player and the scorer all import it. Do not duplicate the table.
⚠️ The official GT list omits Y/N/NG and matching sentence endings. That's what ielts.org says — encode it as a warning, not a block, and don't "fix" it.
**✅ Done when** `isTypeAllowed('identifying_views_claims', 'reading', 'general')` returns a warning, not `true` or `false`.

### 24. Upload schema `(M0-16)`
`lib/import/test-upload.schema.ts` in zod, matching the shape in [`MVP-1.md` §11](MVP-1.md#11-test-upload-json-importer-and-mcp-d11). Infer TypeScript types from it — never hand-write a parallel interface.
**✅ Done when** a malformed test JSON produces per-question errors, not one generic failure.

### 25. `lib/r2.ts` with the signing rules `(M0-12 part 2)`
Implement [`MVP-1.md` §14](MVP-1.md#14-r2-layout-and-signing-rules) as code, not convention:
- `test.mp3` and `assets/*` → signable, 5-min TTL, scoped to an attempt.
- `content.json` → binding read only.
- `transcript.json` → signable **only** when submitted **and** released.
- `key.json` → **a function that refuses to sign it, unconditionally.**

All keys server-generated. No user-controlled path component, ever.
**✅ Done when** `signUrl(keyJsonPath)` throws, and a test asserts that it throws.

### 26. ⚠️ The importer `(M0-17)`
`lib/import/import-test.ts` — validate → **split** → upload. `answer`, `accepted_variants`, `marks`, `word_limit` go to `key.json`; everything else to `content.json`.

**The split is the single reason the answer key never reaches a browser.** One code path, three callers (CLI, admin UI, MCP). Never reimplement it per caller.
Plus `scripts/import-test.ts` as the CLI.
**✅ Done when** importing a test produces a `content.json` containing zero answers — asserted by a test, not by eye.

### 27. `lib/scoring.ts` + Vitest `(M0-18)`
Server-only. The marking rules from [`MVP-1.md` §10](MVP-1.md#10-question-types-d12): case-insensitive · accepted variants · **word limits enforced, over = zero** · hyphenated words count as one · plural mismatch wrong · no negative marking · band from `band_scales`.
**✅ Done when** tests cover all seven rules, including "twenty" vs "20" and "check-in" as one word.

### 28. Port the legacy Listening test `(M0-20)`
Convert [`ielts-data.js`](Design%20files/Prioritizing%20project%20scope/ielts-data.js) into upload JSON, then import it.
⚠️ `PLAN-V2.md` §10 notes the original `tests/*.js` answer keys were empty. Verify every key before relying on it.
**✅ Done when** a `tests` row exists, `content.json` has 40 questions and no answers, `key.json` has 40 keys.

### 29. ⚡ `/dev/components` gallery `(M0-23)`
Every component from [`MVP-1.md` §15](MVP-1.md#15-repo-structure-and-design-system) in every state. The in-repo successor to `00 Design System.dc.html`.
**✅ Done when** you can build a screen by copying from this page instead of re-deriving styles.

### 30. ⚡ Write `docs/test-authoring.md` `(M0-16)`
One worked sample per variant — Listening, Academic Reading, GT Reading — together covering all 18 types. Whoever enters content will live in this file.
**✅ Done when** someone non-technical can produce a valid test JSON from it alone.

🚦 **CHECKPOINT** — you can get a real IELTS test into the system, and its answers are provably server-side.

---

## Phase 4 — Auth (1.5 weeks)

### 31. Disable signup in Supabase Auth `(M1-01)`
Email + password. **Turn public signup off.** D9 means every account starts as an invitation.
**✅ Done when** hitting the signup endpoint directly is refused.

### 32. Invitation server actions `(M1-02)`
Create, bulk create, revoke, resend. Store `token_hash`, **never the raw token**. Short TTL, single-use.
⚠️ **Accepting an invite can never grant a role above the inviter's.** Enforce server-side.
**✅ Done when** a teacher cannot mint an admin invite.

### 33. Resend + email template `(M1-03)`
**✅ Done when** an invite lands in a real Gmail inbox.

### 34. ⚠️ SPF / DKIM / DMARC `(M1-04)`
Invite-only means **an invite in spam blocks enrolment entirely.** This is not a polish task.
**✅ Done when** mail-tester scores 9+/10 and an invite reaches Gmail's inbox, not Promotions or Spam.

### 35. Accept-invitation screen `(M1-05)`
No rendered design — build from `DESIGN-PROMPT.md` Part A. Expired, used and revoked tokens each get a plain-language dead end: *"This link has expired. Ask your teacher for a new one."*
**✅ Done when** all three failure states show a human sentence and a way forward.

### 36. Set password `(M1-06)` → 37. Set PIN + device binding `(M1-07)`
Step 37 is the security-critical one. Setting a PIN issues a **long-lived httpOnly device secret**; its hash goes in `user_devices.device_secret_hash`. Fast login = **device secret + PIN**, both verified server-side.
**✅ Done when** the PIN alone, from a fresh browser profile, authenticates nothing.

### 38. Login screen `(M1-08)`
Password path, plus the PIN fast path **offered only when a known device secret is present**.
⚠️ The rendered design ([`01 Login.dc.html`](Design%20files/Prioritizing%20project%20scope/01%20Login.dc.html)) shows phone+PIN — that's the superseded design. Keep its visual language, change the fields.
**✅ Done when** an unrecognised device never sees a PIN box.

### 39. Lockout + rate limiter + Turnstile `(M1-09, M1-10, M1-11)`
5 failures → 15-minute lock, on **both** password and PIN. Durable Object counter, limiting by IP **and** account — counts kept in memory, storage written only when a lock is set (free plan: 100,000 DO rows written a day). Turnstile on login and accept-invite.
⚠️ **Then loosen Supabase's own limit, because ours now does the job** ([`MVP-1.md` §4](MVP-1.md#free-plans-200-students-at-once)): a lab of 200 behind one IP otherwise hits Supabase Auth's per-IP sign-in limit. Dashboard → Authentication → Rate Limits: raise the sign-in limit, and turn on **IP address forwarding** so the Worker can pass the student's real IP in `Sb-Forwarded-For` (needs the secret key, server-side only).
**✅ Done when** six wrong attempts lock the account, the sixth request is rate-limited by IP too, and 200 scripted sign-ins from one IP inside 5 minutes all succeed.

### 40. Sessions `(M1-12, M1-14)`
httpOnly + Secure + SameSite cookies. **One active session per student** — a new login revokes the old. Concurrent-login flag. Device list + revoke (server side; UI at step 68).
Set the JWT lifetime just longer than the longest test, so no token refresh lands mid-test, and verify sessions with `getClaims()` (local check, asymmetric JWT keys) — not `getUser()`, which calls Supabase Auth on every request. Revocation comes from the `user_sessions` check, not from JWT expiry.
**✅ Done when** logging in on a second machine ends the first session.

🚦 **CHECKPOINT** — a real student can be invited by email and log in. No public signup route exists.

---

## Phase 5 — The Listening player (2.5 weeks)

The heart of the product. Build the plumbing before the screens.

### 41. Student shell + nav `(M2-01)`
Bottom tabs on mobile, top bar on desktop. **Max 4 labelled items**: Home · My Tests · Progress · Profile. No hamburger, no bare icons.
**✅ Done when** nav renders at 390px and 1280px.

### 42. Assignment eligibility resolver `(M2-04)`
One server function answering "can this student start this test right now, and if not, **why not** in one sentence?" Checks windows, attempt limits, plan validity, per-student unlocks.
The *why not* is the product — screen 04 shows "Opens Monday 9:00 AM", never a generic lock.
**✅ Done when** each refusal returns a student-readable reason string.

### 43. ⚠️ Attempt lifecycle server actions `(M2-07)`
`start` · `resume` · `autosave` · `submit` · `expire`. Every one re-reads the attempt row and rejects if it isn't `in_progress` or if `now() > expires_at` — then force-submits and scores.
`start` sets **`expires_at` server-side**. Autosave upserts on `UNIQUE(attempt_id, q_number)` and guards with `revision`.
Autosave fires **on change** — debounced ~3 s, all changed answers in one request — plus a 60 s heartbeat that any save resets. No Durable Object call on this path. Never a fixed 10-second timer: at 200 students that alone would eat most of the Workers free daily request cap ([`MVP-1.md` §4](MVP-1.md#free-plans-200-students-at-once)).
`submit` scores in `lib/scoring.ts`, then writes `answer_marks` + `attempt_scores` and sets the status in **one** Postgres function (`.rpc()`), so a half-submitted attempt can't exist. The database already enforces the clock, the state machine, the deadline and `revision` (M0-09 triggers) — the server action checks them too, to give the student a friendly message. `supabase-js` has no multi-statement transactions.
**✅ Done when** a replayed autosave request is rejected and the prior answer survives.

### 44. ⚠️ Server-authoritative timer `(M2-08)`
Every response carries `server_now` + `expires_at`. The browser **renders** a countdown from them and re-syncs on each autosave. Calm grey → warning at 5 min → danger with a gentle pulse at 1 min. Never flashing-red alarm styling; this is a high-anxiety product.
**✅ Done when** changing the OS clock and overriding `Date` in devtools does not move expiry.

### 45. Audio preload + owner-bound cache `(M2-06)`
Service worker. Full MP3 from a signed URL **before the timer starts** — on a pre-test screen that opens 10–15 min early, so 200 downloads spread out. Audio is 48–64 kbps mono (~11–15 MB per test). Cached under the stable key `/audio-cache/{testId}/v{n}` so the expiring signature isn't part of the cache identity. IndexedDB holds `cache_owner`.
⚠️ **On every session start and logout, if `cache_owner` ≠ current user, delete the cache and all local attempt state before the app renders.** Without this, student B pulls student A's cached audio for a test B hasn't taken. R2 object untouched.
**✅ Done when** switching users on one machine purges the cache and the R2 object still exists.

### 46–50. The five Listening widgets `(M2-10 … M2-14)`
Build against `/dev/components`, driven by `lib/question-types.ts`.

| Step | Widget | Serves |
|---|---|---|
| 46 | `text_gap` + 7 containers | every completion type + short answer — **the biggest one** |
| 47 | `radio` | `mcq_single` |
| 48 | `checkbox_n` | `mcq_multi`, with the "1 of 2 chosen" counter |
| 49 | `dropdown_bank` | Listening `matching` |
| 50 | `image_label` | `plan_map_diagram_labelling` — needs asset signing, no rendered design |

**✅ Done when** all 40 questions of the ported test render correctly.

### 51. Question navigator + flags `(M2-09)`
1–40 grid, four states, legend always visible.
**✅ Done when** the four states are distinguishable without colour.

### 52. Listening player shell `(M2-15)`
[`06 Test Player Listening.dc.html`](Design%20files/Prioritizing%20project%20scope/06%20Test%20Player%20Listening.dc.html) is the reference.
⚠️ **One audio file, played straight through.** Section navigation is UI only — it must never seek, pause, restart or re-request the audio.
**✅ Done when** moving through all four sections triggers zero additional network requests.

### 53. Screens 03, 04, 05 `(M2-02, M2-03, M2-05)`
Home · My Tests · Pre-test instructions with the headphone check. All three have rendered designs — follow them.
Step 53's pre-test screen prevents most support calls. Make it calm.
**✅ Done when** the audio-ready progress bar gates the "I'm ready — Start" button.

### 54. Submit confirmation `(M2-16)`
*"You have 3 unanswered questions"* with clickable number chips. "Go back" is primary; "Submit anyway" is secondary. **Never let a student submit blind.**

### 55. Scoring + Result `(M2-17, M2-18)`
Score server-side on submit, compute band and section scores. Result screen: band hero, raw score, section bars, plus the held-for-release variant.

🚦 **CHECKPOINT (step 55)** — **first runnable demo.** A student can log in, take a full Listening mock, and get a band.

### 56. ⚠️ Crash-recovery E2E `(M2-19)`
Kill the browser mid-test. Reopen. **The attempt resumes with the server-computed remaining time.** Power cuts in Indian computer labs are a *when*, not an *if*.
**✅ Done when** the test passes in CI, not just by hand once.

### 57. 🚦 Run one real batch of 5 students
Before building anything else. You will learn more in this hour than in the next two weeks of code.
**✅ Done when** five students finish a mock and you've written what broke into `PROJECT-MEMORY.md` §5.

---

## Phase 6 — Reading player (1.5 weeks)

### 58. Reading player shell `(M3-01)`
Split view, draggable divider, Passage/Questions toggle on tablet. No rendered design — build from `DESIGN-PROMPT.md` §C1.7.

### 59. Multi-passage sections `(M3-02)`
⚠️ Sections carry **`passages[]`**, not one passage. GT section 1 has 2–3 texts, section 2 has 2, section 3 has 1. Sanitise on render as well as on write.

### 60–64. The remaining widgets `(M3-03 … M3-09)`
`segmented_3` (T/F/NG **and** Y/N/NG) · `matching_headings` · `matching_features` · `matching_information` · `matching_sentence_endings` · `summary_completion` + word bank · `diagram_label_completion`.
Most reuse `dropdown_bank` and `text_gap` from Phase 5 — that's why they were built generically.

### 65. Variant gating + passage highlight `(M3-10, M3-11)`
Academic vs GT type availability in both player and authoring UI. Right-click highlight and note on passage text.

🚦 **CHECKPOINT** — both skills work. All 18 question types render and score.

---

## Phase 7 — Student experience (1 week)

| Step | Task | Notes |
|---|---|---|
| 66 | Review my mistakes `(M4-01, M4-02)` | Gated on submitted **and** released. "Play this part" jumps to a timestamp in the one audio file. This is the teaching screen — the reason students improve. |
| 67 | My Progress `(M4-03)` | Band over time + **accuracy by question type, worst first**. The per-type breakdown is what actually tells a student what to fix. |
| 68 | Practice at home `(M4-04, M4-05)` | Instant feedback is a **per-question server round-trip returning one verdict** — never the rest of the key. |
| 69 | Profile `(M4-06)` | Plan validity bar, change password, change PIN, **device list + revoke**, log out. Nothing else. |

---

## Phase 8 — Admin (1.5 weeks)

Build in this order — it's the order a real institute needs them.

| Step | Task | Notes |
|---|---|---|
| 70 | Admin shell `(M5-01)` | Grouped sidebar |
| 71 | Students list `(M5-03)` | Search, filters, multi-select, sticky bulk bar |
| 72 | Invite + bulk CSV invite `(M5-04)` | **Column-mapping preview with per-row errors.** "Import 28 students, 2 rows have problems." You will not hand-type 30 students per batch. |
| 73 | Test library `(M5-08)` | Filter by skill, variant, difficulty, status |
| 74 | Answer key editor `(M5-09)` | 40 rows, keyboard-first, tab moves down, autosave indicator, "34 of 40 entered". **Optimise for speed, not beauty** — this screen gets used constantly. |
| 75 | Batches `(M5-07)` | |
| 76 | Student detail drawer `(M5-05)` | Plan timeline, attempts, reset PIN, change email, audit trail |
| 77 | Plans & validity workqueue `(M5-06)` | Grouped by expiry, bulk extend, reason field, confirm dialog stating exactly what changes |
| 78 | Admin overview `(M5-02)` | Build last — it summarises everything above |

🚦 **CHECKPOINT** — a non-technical staff member can run a batch without you.

---

## Phase 9 — Teacher (1.5 weeks)

| Step | Task |
|---|---|
| 79 | Teacher dashboard `(M6-01)` |
| 80 | Batch view `(M6-02)` — roster, last band, expiry pills |
| 81 | Assign a test `(M6-03)` — 3-step inline flow, live selected count, plain-English summary before confirming |
| 82 | Results & release `(M6-04)` — attempts table, multi-select release |
| 83 | Mark override + note `(M6-05)` — fix "twenty" vs "20" without a schema change |
| 84 | Class analytics `(M6-06)` — answers "what do I teach tomorrow?" |

---

## Phase 10 — Live session monitor (½ week)

| Step | Task |
|---|---|
| 85 | Live-monitor endpoint `(M7-01)` — one aggregated query per session, **polled every 10 s** by staff screens. ~~Supabase Realtime channel — no polling~~ superseded 2026-09-15: Realtime isn't needed and would spend the free-plan quota. |
| 86 | Live monitor grid `(M7-02)` — status, time left, answered count, "last updated" stamp |
| 87 | Invigilator actions `(M7-03)` — +5 minutes, force submit, unlock. **All server-side.** |

---

## Phase 11 — Authoring MCP (1 week, parallel)

⚡ **Can start any time after step 26.** Doesn't block Phases 5–10.

| Step | Task | Notes |
|---|---|---|
| 88 | MCP scaffold + auth `(M8-01)` | ⚠️ Scoped credential tied to a **real staff user**. Never anonymous, **never the service-role key**. |
| 89 | `validate_test`, `create_test`, `update_test` `(M8-02)` | Over the step-26 importer — do not reimplement the split |
| 90 | `set_answer_key` `(M8-03)` | |
| 91 | Upload targets `(M8-04)` | Audio + labelling images |
| 92 | `list_tests`, `get_test` `(M8-05)` | Answers withheld unless staff |
| 93 | `publish_test` + completeness check `(M8-06)` | All 40 keys, audio attached, markers covering the duration, types valid for the variant |
| 94 | MCP guide `(M8-07)` | |

⚠️ **Authoring only.** The MCP must not be able to touch students, attempts, answers, results or plans. Every call writes an `audit_log` row.

🚦 **CHECKPOINT** — an agent can author a complete test end-to-end. This unblocks the real bottleneck: content entry.

---

## Phase 12 — Go live (1.5 weeks)

| Step | Task | Notes |
|---|---|---|
| 95 | Anti-cheat flags `(M9-01)` | Tab switches, blocked paste, concurrent login. **Flags, not blocks** — be honest about that with the institute. |
| 96 | Users & roles `(M9-03)` | Permission matrix |
| 97 | Audit log screen `(M9-02)` | |
| 98 | Error / edge screens `(M9-04)` | *"Your answers are saved. Reconnecting…"* — reassure, don't alarm |
| 99 | ⚠️ Load test at **200** concurrent `(M9-05)` | Against a second, throwaway **free** Supabase project (never the real one). Script: 200 sign-ins from one IP, start, save-on-change autosave, submit. Watch Auth 429s, Worker CPU errors, the Workers daily request count, and DB CPU. Run it first right after step 43, again here. If audio stutters in the lab, the ₹12,000 LAN mini-PC is the answer. |
| 100 | Nightly backup + **a restore drill that actually restores** `(M9-06)` | Supabase Free has no backups: GitHub Actions runs `supabase db dump` nightly into a private R2 bucket. An untested backup is not a backup. **Must exist before the first real student.** |
| 101 | Full security review `(M9-07)` | Run `/security-review`, then walk every check in [`MVP-1.md` §19](MVP-1.md#19-verification) by hand |
| 102 | DPDP retention + deletion path `(M9-08)` | DOB, guardian consent, stated retention |
| 103 | Docs completeness pass `(M9-09)` | |

🚦 **FINAL GATE** — all 23 checks in [`MVP-1.md` §19](MVP-1.md#19-verification) pass before a paying student touches it.

---

## The five steps that carry the most risk

If you skip or rush anything, do not let it be one of these.

| Step | Why |
|---|---|
| **2** — Supabase region | Irreversible. Wrong choice = full migration later. |
| **19** — RLS default-deny test | The difference between "we police access" and "we think we police access". |
| **26** — The importer split | The single reason the answer key never reaches a browser. |
| **44** — Server-authoritative timer | Trust the client clock once and every score is arguable. |
| **45** — Owner-bound cache purge | Without it, a shared lab PC leaks one student's test audio to the next. |

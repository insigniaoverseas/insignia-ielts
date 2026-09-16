# Project Memory — Insignia IELTS

> **This file is where the project remembers itself.** It changes every session.
> For *what to build and what it must never do*, read [`MVP-1.md`](MVP-1.md) — that is the contract.
> For *what to do next, in order*, read [`BUILD-STEPS.md`](BUILD-STEPS.md) — 103 dependency-ordered steps.

---

## Rules for this file

1. **Update it in the same commit as the work.** Never as a batch afterwards, never "I'll write it up later."
2. **Never delete history.** Supersede an entry with a new one and mark the old one `~~superseded~~`.
3. **If `MVP-1.md` and reality disagree, fix `MVP-1.md`** and record the correction in §4 below.
4. **No secrets. Ever.** This file is committed to git. Record *names and locations* — "the Supabase secret key lives in Wrangler secrets as `SUPABASE_SECRET_KEY`" — never a value.
5. Tick tasks **here**, not in `MVP-1.md`.

---

## 1. Current state

| | |
|---|---|
| **Active milestone** | **Two fronts, converging.** The front end is complete — all 30 screens (`MVP-1.md` §17). The back end has moved off M0's content pipeline onto **M1, auth**: the invitation flow now exists end to end and the first screens can come off `lib/mock/*`. |
| **Last completed** | **M1 auth flow, 2026-09-17 (Claude).** Invitations end to end: mint → email → accept → account → sign in → session → guard, plus lockout. Eight new modules under `lib/auth`, `lib/mail`, `lib/actions`; four migrations; 282 DB checks (was 250), 26/26 sweep, 197 unit tests (was 181), lint, build and bundle scan clean. **Migrations pushed and types regenerated 2026-09-17.** Earlier: **M0-18 server-only scorer, 2026-09-16 (OpenAI Codex).** Runtime-validates immutable keys; applies exact case/space/Unicode normalisation, authored variants, word limits, hyphen counting and plural-sensitive comparison; awards partial multi-select credit with no negatives; emits one fact per numbered question and section/attempt totals; derives bands only from supplied database rows. 21 focused checks in the existing Node suite; all 164 unit tests, 250 DB checks, the 26-policy sweep, typecheck, lint, production build, client-bundle scan and npm audit pass. Earlier: M0-17 importer; M0-12 R2 signing; M0-16 upload schema; M0-15 taxonomy; the complete front end; `plan_notes`; M0-13 CSP + sanitiser; M0-22 CI; M0-19; M0-11; M0-05…M0-10 (**schema complete, 25 tables**). |
| **Next task — back end** | **Run `/setup`** to create the first branch and the Owner profile, then invite a test student end to end (the dev mailer prints the link). Then the Supabase dashboard settings in M1-01 — above all **JWT expiry 3600 → 7200 s**. Also open: **M0-14** scoped R2 credentials, **M0-21** docs/ADRs, M0-20's live draft import. |
| **Next task — front end** | **M2-04 eligibility + M2-07 attempt lifecycle** — they unblock the player, and now have a real actor to sit on. Then M2-17 scoring on submit. Also: wire the bulk/CSV invite screen (22b) and Profile's device list to the actions that now exist, and apply `lib/auth/guard.ts` to the privileged layouts as each screen leaves `lib/mock/*`. |
| **Open PRs** | None. **#14 M0-20 merged 2026-09-16** (this file previously said it was open and would not be merged — corrected 2026-09-17). #10–#13 merged. |
| ~~**Next task**~~ | ~~**M0-13 sanitiser PR**~~ — superseded 2026-09-16: merged (`fb2040f`), M0-13 closed. Old text: (`feat/sanitize-passages`) — once merged, M0-13 is complete. Then Phase 3: M0-15 `lib/question-types.ts` (step 23), M0-16 upload schema, M0-18 `lib/scoring.ts` + unit tests, M0-17 importer (which calls `sanitizePassageHtml` on write). Also open: M0-21 docs/ADRs. Then the rest of the unfinished Phase 0–1 steps: 3 (R2 buckets), 9 (CSP + sanitize), 11 (docs/ADRs), 12 (CI running `test:db`, `test:db:sweep`, `test:unit`) — then Phase 3 (question types, upload schema, importer, scoring) (Supabase clients `server/client/admin.ts`, M0-05) and step 22 (`lib/rbac.ts`). No-DB tasks still open: M0-12 (R2), M0-13 (CSP), M0-14 (secrets), M0-15, M0-18, M0-21, M0-22. No-DB tasks that can run alongside: M0-12 part 1 (R2 buckets), M0-13 (CSP), M0-15 (`question-types.ts`), M0-18 (`scoring.ts`), M0-21 (docs). |
| ~~**Next task**~~ | ~~M0-06 — waiting on the user's `db push`~~ — superseded 2026-09-15: pushed and verified. |
| ~~**Next task**~~ | ~~M0-06 — resolve where RLS helpers live first~~ — superseded 2026-09-15: `private` schema, approved by the user. |
| ~~**Next task**~~ | ~~**M0-05** finish: only `npx supabase db push` left~~ — superseded 2026-09-15: pushed by the user, advisor clean. |
| **Blocked on** | **M1 needs from the user:** the migrations pushed; the **domain name** (said to exist, not yet named); a **`RESEND_API_KEY`** and verified `MAIL_FROM` (the Resend↔Supabase connection does not cover our own invitation email — §4); Turnstile keys for M1-11; and the Supabase dashboard settings listed in M1-01. **M0-20** still needs a teacher-verified 40-answer key and an active `test:author`. |
| **Branch** | `feat/m1-auth-flow`, in a **git worktree** at `~/dev/insignia-m1-auth` (outside iCloud, so a second `node_modules` does not sync). Branched from merged `origin/main`. |

---

## 2. Task status board

`todo` · `in_progress` · `blocked` · `done`

### M0 — Foundations

| Task | Status | Owner | Date | Note |
|---|---|---|---|---|
| M0-01 Re-scaffold Next.js 16 + OpenNext | done | goverdhan-gaur, Claude | 2026-09-15 | ✅ Next 16.3.4, React 19, `@opennextjs/cloudflare` 1.20.3; vinext fully removed; no `@vercel/*`; Worker build passes. ✅ Worker renamed → `insignia-test` in all 3 places (`6f4a4b0`). ✅ Workers Builds commands fixed in the dashboard (goverdhan-gaur). ✅ Lint: `eslint .` + native flat config, `@eslint/eslintrc` dropped, `Design files/` ignored — `npm run lint` clean (Claude). Uses `src/app/` — see §4. |
| M0-02 Tailwind v4 `@theme` tokens + fonts | done | Claude | 2026-09-15 | All tokens from `00 Design System.dc.html` in `src/app/globals.css`; default palette + type scale switched **off** (`initial`) so off-system classes generate nothing. Inter + IBM Plex Mono via `next/font` (self-hosted). Opt-in `data-theme="dark"` (DESIGN + DERIVED values, marked). `cn()` in `src/lib/utils.ts` with tailwind-merge taught the tokens (§5). Verified: tsc, `next build`, compiled CSS, Chrome screenshots at 1280 + 390px. |
| M0-03 shadcn/ui init + restyle to tokens | done | Claude | 2026-09-15 | button, input (+ `PhoneInput`), card, checkbox, table (+ toolbar, pagination, bulk bar), dialog (+ `ConfirmDialog`), select, sonner, skeleton, badge, label; plus hand-built `filter-chip`. `components.json` hand-written — `init` never run, so `globals.css`/`utils.ts` untouched. shadcn vars aliased onto tokens (§4). API + traps in `src/components/ui/README.md`. Verified: tsc, lint, `next build`, all 60 used classes present in compiled CSS, Chrome screenshots at 1280 + 390px incl. open dialog and toast. |
| M0-04 ⚠️ Supabase project in `ap-south-1` | done | goverdhan-gaur, Claude | 2026-09-15 | ✅ `insignia-ielts` (`zpqszkwavnjomxjgimni`), region **`ap-south-1`** read back via MCP. First attempt was in `ap-northeast-2` (Seoul) — replaced while still empty (§3). Fresh project: empty `public`, no migrations, 0 users, DB timezone UTC, RLS auto-enable trigger on. ~~⬜ Usage alert at 70%~~ — skipped at the user's call, 2026-09-15. |
| M0-05 Supabase CLI + generated types | done | goverdhan-gaur, Claude | 2026-09-15 | ~~Drizzle setup + `db/schema.ts`~~ superseded 2026-09-15 — no ORM (§4). ✅ CLI 2.117.0 as devDependency; `login`, `init`, `link`, `db push` run by the user; `npm run db:types` → `src/lib/supabase/database.types.ts`. ✅ Verified over MCP: migration `20260915090941` recorded, security advisor **clean**, `anon`/`authenticated` can't execute `rls_auto_enable()`, `ensure_rls` still enabled. Clients (`server/client/admin.ts`) are step 21, also tagged M0-05. |
| M0-06 Migration + RLS: identity tables | done | Claude, goverdhan-gaur | 2026-09-15 | ✅ `supabase/migrations/20260915164128_identity.sql`: 6 tables + `private` schema + helpers `auth_role`/`auth_branch`/`is_staff`/`same_branch` + `updated_at` trigger; RLS + read-only, column-limited grants (§4). ✅ PGlite harness 61/61, catches deliberate breaks. ✅ Pushed by the user; verified live over MCP: 6 tables with RLS, 14 policies, `anon` 0 grants, `authenticated` SELECT only, no access to the 3 hash columns, security advisor **clean**. ✅ `database.types.ts` regenerated. Performance advisor: `unused_index` ×9 (INFO — empty tables, expected) and `multiple_permissive_policies` ×5 (WARN) → fold each table's SELECT policies into one in the M0-07 migration. |
| M0-07 Migration + RLS: cohorts & plans | done | Claude, goverdhan-gaur | 2026-09-15 | ✅ `supabase/migrations/20260915170544_cohorts.sql`: `batches`, `batch_teachers`, `batch_students`, `student_plans` (one active per student), `plan_history` (append-only trigger); 5 helpers (`is_teacher_of`, `teaches_batch`, `in_batch`, `batch_in_my_branch`, `plan_in_my_branch`); teacher → current students on `users`; `invitations.batch_id` FK; M0-06 policies folded to one per table. ✅ PGlite 106/106, 2 mutations caught. ✅ Pushed by the user; verified live: 11 tables with RLS, 11 policies (one per table), `anon` 0 grants, `authenticated` SELECT only, 11 `private` functions, append-only trigger + batch FK present; security advisor clean; performance advisor only `unused_index` (empty tables). ✅ `db:types` regenerated. **Amended 2026-09-16:** `student_plans.notes` dropped and moved to the staff-only `student_plan_notes` table (§7 Q12, §4) — migration `20260916125048_plan_notes.sql` — pushed and verified live 2026-09-16 (§3). |
| M0-08 Migration + RLS: content & assignment | done | Claude, goverdhan-gaur | 2026-09-15 | ✅ `supabase/migrations/20260915171317_content.sql`: `tests` (R2 paths withheld from API; published ⇒ complete; practice ⇔ one question type), `band_scales` (+`variant`), `band_scale_rows` (half-bands, no overlaps via `btree_gist`), `assignments` (+`branch_id`, release rules), `assignment_targets` (batch_id \| student_id FKs), `assignment_unlocks` (+`extra_attempts`); 4 helpers. ✅ PGlite 156/156, 2 mutations caught. ✅ Pushed by the user; verified live: 17 tables all with RLS, 17 policies (one per table), `anon` 0 grants, `r2_key_key` not readable by `authenticated`, `btree_gist` in `extensions`, overlap constraint present; security advisor clean. ✅ `db:types`. |
| M0-09 Migration + RLS: attempts & answers | done | Claude, goverdhan-gaur | 2026-09-15 | ✅ `supabase/migrations/20260915172051_assessment.sql`: `attempts`, `answers`, **`answer_marks`**, **`attempt_scores`** (split out so RLS can gate correctness/scores — §4), `attempt_events` (append-only). Triggers: server clock + copy-from-test + assignment must match test and target the student; state machine; answers only while open and in time (all roles), `revision` must rise. Students write own answers via RLS + column grants. 6 helpers; `tests` policy extended with `has_attempt_on`. ✅ PGlite 214/214, 2 mutations caught. ✅ Pushed by the user; verified live: 22 tables all with RLS, one policy per table per command (`answers`: select/insert/update), 4 triggers, `authenticated` can update `answers.given_answer` but not `answered_at`, `anon` 0 grants; security advisor clean. ✅ `db:types`. |
| M0-10 Migration + RLS: audit & rate limits | done | Claude, goverdhan-gaur | 2026-09-15 | ✅ `supabase/migrations/20260915172936_crosscutting.sql`: `audit_log` (+`branch_id`, actor id without FK, append-only), `rate_limits` (RLS on, no policy, no grants); **fixes M0-07**: drops `plan_history.actor_id` FK so staff erasure works. ✅ PGlite 228/228 incl. a final sweep (every `public` table has RLS; 24 tables), 2 mutations caught. ✅ Pushed by the user; verified live: 24 tables all with RLS, 25 policies, `plan_history_actor_id_fkey` gone, `rate_limits` no API grants, audit trigger present. Security advisor: only INFO `rls_enabled_no_policy` on `rate_limits` — intended. ✅ `db:types`. **Schema complete.** |
| M0-11 RLS helpers + default-deny test | done | Claude, goverdhan-gaur | 2026-09-15 | Helpers shipped with M0-06…09. ✅ `tests/db/rls.test.mjs` (`npm run test:db`): all migrations on PGlite, 229 checks across all 24 tables, ~2 s. ✅ `tests/db/policy-sweep.mjs` (`npm run test:db:sweep`): drops each of 25 policies, **every drop fails the test** — first run caught `band_scales` untested, fixed. `@electric-sql/pglite` 0.5.8 pinned as devDependency (user approved). README in `tests/db/`. Lint clean. |
| M0-12 R2 private buckets + `lib/r2.ts` signing | done | Claude, goverdhan-gaur, OpenAI Codex | 2026-09-16 | ✅ Part 1: two private APAC buckets, r2.dev off, Worker bindings. ✅ Part 2: strict versioned key builders/parser; binding-only reads for `content.json` / `key.json`; fixed 300-second S3-compatible signed GETs for in-progress attempt audio/assets; transcript only when submitted + released. `key.json` and `content.json` are unconditionally un-signable. Exact account R2 media CSP source; access/secret variable names blocked from client bundles. 12 focused checks; unit 134/134 plus every repository gate passes. Live scoped R2 signing credentials are tracked under M0-14. |
| M0-13 Security headers + nonce CSP + sanitize | done | Claude, goverdhan-gaur | 2026-09-16 | ✅ Nonce policy chosen by the user. `src/proxy.ts`, `src/lib/security/headers.ts` (+README), `public/_headers` (OpenNext's cache rule kept), root layout `await connection()` → all routes dynamic. ✅ `test:unit` 41/41 (12 header checks incl. `_headers` ↔ `headers.ts` sync). ✅ Local workerd + headless Chrome: injected inline script **blocked**, React hydrates, 0 violations on `/` and `/dev/components`; static chunks carry cache + security headers. ✅ **Verified on a real Cloudflare preview** (branch `feat/security-headers-csp`, preview version `6f5a70dc`): all headers, fresh nonce per request, 12/12 scripts nonced, cache rule kept, Chrome: hydration + 0 violations. ✅ **PR #1 merged 2026-09-16** (rebase, `7877b5b`) by the agent at the user's request; production deploy succeeded; **live site re-verified** the same way. ✅ `lib/security/sanitize.ts` (rehype-sanitize, strict allowlist — see its README): `test:unit` 81/81 incl. 29 XSS payloads re-parsed and checked against the allowlist, idempotency, ~1.2 ms per 15 KB passage; 2 mutations (style everywhere, images) caught. ⬜ Measure page CPU vs the 10 ms free limit now that every page is dynamic. |
| M0-14 Wrangler secrets + `.dev.vars.example` | in_progress | Claude, goverdhan-gaur, OpenAI Codex | 2026-09-16 | ✅ `.dev.vars.example` (names only; `.dev.vars` confirmed gitignored). ✅ Supabase names and three deployed values verified 2026-09-15. ✅ Added the non-secret `CLOUDFLARE_ACCOUNT_ID` var and the `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` names for M0-12. ⬜ Create a token scoped to object read on only the two project buckets, then add both R2 secrets locally and with `wrangler secret put`; do not use the account-wide Wrangler token. ⬜ Resend/Turnstile/Sentry names when those land. |
| M0-15 `lib/question-types.ts` | done | OpenAI Codex | 2026-09-16 | ✅ All 18 canonical types, six widgets and seven completion containers in one typed matrix. ✅ `isTypeAllowed()` returns `allowed` / `warning` / `disallowed`; Y/N/NG and matching sentence endings correctly warn for GT. ✅ Player widget/container types now derive from this module. ✅ 25 focused checks; `test:unit` 106/106, `test:db` 250/250, policy sweep 26/26, typecheck, lint, production build and bundle scan pass. README included. |
| M0-16 Upload schema + `docs/test-authoring.md` | done | OpenAI Codex | 2026-09-16 | ✅ Zod 4.6.5 pinned; strict versioned schema with inferred input/output types. ✅ Cross-field rules cover formats, widget payloads, numbering, marks, practice sets, audio/passages, assets and safe file names. ✅ Nested per-question errors. ✅ Three executable worked samples collectively cover all 18 types. ✅ 16 focused checks; unit 122/122, DB 250/250, policy sweep 26/26, typecheck, lint, build, bundle scan and audit pass. |
| M0-17 Importer: validate → split → upload | done | OpenAI Codex | 2026-09-16 | ✅ One typed dependency-injected path for CLI/admin/MCP. ✅ Strict validation + authored-HTML sanitising; 5 MiB image / 20 MiB MP3 caps, MIME + magic checks, mono and ≤64 kbps. ✅ Generated UUID/version keys; source file names never become object keys. ✅ Protected fields exist only in `key.json`; transcript separate. ✅ Objects upload before the draft row; rollback attempted on failure. ✅ CLI dry-run/remote modes, active `test:author` actor gate and audit row. 8 focused checks; unit 142/142 and all gates pass. |
| M0-18 `lib/scoring.ts` + Node unit suite | done | OpenAI Codex | 2026-09-16 | ✅ Server-only runtime key boundary. ✅ Word limits, hyphens, variants, plural-sensitive matching, multi-answer partial credit/no negatives, one result per number and database-driven bands. ✅ 21 focused checks in the existing Node runner; unit 164/164, DB 250/250, policy sweep 26/26, typecheck, lint, build, bundle scan and audit pass. |
| M0-19 Seed roles + default band scale | done | Claude, goverdhan-gaur | 2026-09-15 | ✅ `supabase/migrations/20260915174541_reference_data.sql`: 5 roles; default Listening / Academic Reading / GT Reading scales from **the institute's charts** (user-supplied 2026-09-15, "approximate marks out of 40") — replaces "verify against a Cambridge book"; `band` NULL = "Below" (≤1 per scale); `attempt_scores.below_band` (exactly one of band/below_band). Seed inserts idempotent. ✅ `test:db` 240/240 (coverage 0–40 per scale, 16 spot checks vs the charts, re-run changes nothing), sweep 25/25, dry-run. ✅ Pushed by the user; verified live: 5 roles, 3 default scales × 12 rows, 3 "Below" rows, raw 31 → L 7.0 / AC 7.0 / GT 6.0; security advisor unchanged (INFO on `rate_limits` only). ✅ `db:types`. |
| M0-20 Port legacy Listening test | in_progress | OpenAI Codex, Claude Opus 5 | 2026-09-16 | ✅ Real paper + recording supplied; they are a **different test** from the prototype placeholder, which is now left alone. ✅ Converter derives groups from consecutive runs instead of a hardcoded layout; reads each `word_limit` from the paper's own instruction line and fails closed on one it cannot read; folds "choose TWO letters" into a single control covering Q29-30 worth 2 marks; refuses T/F/NG for Listening (the first draft laundered it into `mcq_single`). ✅ Upload schema now rejects `duration_seconds` shorter than the recording — the supplied audio is 1916 s against the legacy 1800 s clock, which would have cut off Part 4 for every candidate. ✅ Audio resolved: mono 64 kbps 1916 s, section ends 481 / 977 / 1465 / 1916 s. ✅ `Sample test/` gitignored and CLI reads `--source`; the public repo never sees a key. ✅ Unit 181/181, DB 250/250, policy sweep 26/26, typecheck, lint, build, bundle scan and audit pass. ⬜ Teacher-verified answer key; ⬜ active `test:author`; then the audited draft import. |
| M0-21 `docs/` tree + ADRs 0001–0013 | todo | | | |
| M0-22 CI gates incl. bundle-grep guard | done | Claude | 2026-09-15 | ✅ `.github/workflows/ci.yml` (Node 24): install, typecheck, lint, `test:unit`, `test:db`, `test:db:sweep`, build, `check:bundle`, `npm audit --audit-level=high`. ✅ `scripts/check-client-bundle.mjs` scans `.next/static` for answer-key fields/paths, scoring names, secret-key name/prefix — proven with a throwaway leaking component (caught, exit 1). ✅ All steps pass locally; lockfile has the Linux native binaries. ✅ **First GitHub run green** (run 35006680795, all 12 steps, 2m27s) after the user pushed `844f85c`. Note: minified builds rename functions, so the `bandFor`/`scoreAttempt` names are a weak signal; string literals (`key.json`, `accepted_variants`) are what the guard really relies on. |
| M0-23 `/dev/components` gallery | done | Claude | 2026-09-15 | Live at `/dev/components`, `noindex`. Sections now match `00 Design System.dc.html` one-for-one (A2–A4, 1–20). Only gap: `image_label` widget, which waits for M2-14 (no design). |

### M1 — Invites & auth

| Task | Status | Owner | Date | Note |
|---|---|---|---|---|
| M1-01 Supabase Auth config, signup disabled | in_progress | goverdhan-gaur, Claude | 2026-09-15 | ✅ Signup **off** (user, dashboard) — verified: `GET /auth/v1/settings` → `disable_signup: true`; email is the only provider. ✅ Leaked-password protection on. ⬜ Rest of Auth config, now specific and awaiting the user: **JWT expiry 3600 → 7200 s** (a 60-minute Reading test outlasts the default and would refresh mid-test), site + redirect URLs, password minimum length, and raising the sign-in rate limit with IP forwarding on. ✅ Local `supabase/config.toml` aligned 2026-09-17: `enable_signup = false` under `[auth]` and `[auth.email]`, `jwt_expiry = 7200`, `minimum_password_length = 8` (matching `lib/auth/password.ts` — leaving it at 6 would let the database accept what the product's own screen refuses). These are the *local* values; the same four still need setting on the live project. |
| M1-02 Invitation server actions | in_progress | Claude | 2026-09-17 | ✅ `lib/auth/invitations.ts` (create, revoke, resend) + `lib/actions/invitations.ts` (single, bulk, revoke, resend). ✅ **Never grant above the inviter**: `canInviteRole` gates on the *target* role, refuses `super_admin` outright, and the action re-checks — a teacher posting `roleKey: admin` is refused twice. ✅ `branch` scope pins the invitation to the inviter's own branch whatever the form sent; a batch must belong to that branch. ✅ Token: 32 random bytes, base64url, **only its SHA-256 is stored**; resend mints a new token and kills the old link, because the original is genuinely unrecoverable. ✅ Bulk invites report per row — one bad address must not cost the other thirty-nine. ✅ Migration adds `invitations.name/phone/country_code` (the built screen 22 collects them; §4). ✅ Screen 22a wired: `/admin/students/new` is guarded on `student:manage`, lists real batches through RLS (`lib/queries/batches.ts`), and posts to `inviteAction`. Its copy said **"Phone number — this is how they log in"**, left from the dropped PIN design; corrected to email, and the user reconfirmed email + password on 2026-09-17. `Banner` gained a `success` tone from existing tokens. ⬜ Bulk/CSV screen (22b) still on mock. ✅ **Pushed and typed 2026-09-17**: all four migrations applied to the live project, `db:types` regenerated, typecheck / build / bundle scan green. |
| M1-03 Resend + invite email template | in_progress | Claude | 2026-09-17 | ✅ `lib/mail/` — a `Mailer` interface, a Resend REST implementation (`fetch`, not the SDK), and a dev implementation that prints the invite link to the console so the flow is walkable before keys exist. Production without `RESEND_API_KEY` **throws**, never silently drops. ✅ Template is a pure function with a `text/plain` alternative and no images — HTML-only is a strong spam signal, and an invite in spam blocks enrolment. ⚠️ **The user's Resend↔Supabase connection does not cover this**: that is SMTP for Supabase Auth's own emails; our invitation carries our own revocable token, so we send it ourselves. ⬜ `RESEND_API_KEY`, the domain, and `MAIL_FROM` from the user. |
| M1-04 SPF / DKIM / DMARC | todo | | | Invite in spam = enrolment blocked |
| M1-05 Accept-invitation screen + token verify | done | Claude | 2026-09-16 | ✅ `/invite/[token]`, `noindex`. Shows email, centre and batch so a wrong address is spotted **before** it becomes their login. The dead ends are the point: expired / used / revoked / unknown each get a plain sentence and a way forward, never a 404 and never the word "invalid". ✅ Real token verification (2026-09-17): `lookupInvitation` finds the row by **hash**, and distinguishes expired / used / revoked / unknown so each keeps its own sentence. Expiry is judged against the clock, not `status`, so a housekeeping job that has not run cannot let a stale link through. |
| M1-06 Set-password screen | done | Claude | 2026-09-16 | ✅ Part of `/invite/[token]`. Rules are **printed before you type** and tick as you meet them — a student sees this screen once and shouldn't learn the requirements by failing them. Show/hide toggle instead of a confirm field: retyping catches typos by accident, reading catches them on purpose. Server re-checks, incl. leaked-password protection (M1-01). |
| ~~M1-07 Set-PIN screen + device binding~~ | ~~todo~~ | | | **Dropped 2026-09-16** — the user ruled out the PIN; email + password only (§4). `PinInput` is now unused; kept in `/dev/components` and flagged there. |
| M1-08 Login: password path | done | Claude | 2026-09-16 | ✅ `/login` — **email + password only** (§4); the rendered phone+PIN design does not apply. No signup link (accounts are invitations only), one error message for both fields (naming the email tells an attacker which addresses are real, §8), and no self-serve reset — a locked-out student is standing in a building with their teacher in it. ✅ The sign-in action (2026-09-17): `lib/auth/sign-in.ts`. Wrong password, unknown email, suspended and inactive all return the *same* sentence; only a lock says more, and it says until when. Checks the lock **before** the password, so a locked account never reaches Supabase Auth and the lock cannot be extended by more guessing. A right password on a non-active account is not counted as a failure. `next=` is honoured only when relative — a login form is where an open redirect gets phished. |
| M1-09 Lockout on password | in_progress | Claude | 2026-09-16 | ✅ UI: tries-left counter and a locked state that says **until when** — "try again later" sends people to the front desk. ✅ Server-side counter and lock (2026-09-17) — see M1-10. PIN half dropped (§4). |
| M1-10 Durable Object rate limiter | in_progress | Claude | 2026-09-17 | ✅ Behaviour shipped, storage deferred. `lib/auth/lockout.ts` is interface-shaped (`checkSignInAllowed` / `recordFailedSignIn` / `clearSignInFailures`) and says nothing about where counts live; it is backed by `public.rate_limits`, which M0-10 created as exactly this fallback, via three `security definer` functions that increment atomically. 5/account and 30/IP per 15-min window; peek never spends an attempt. ⬜ The Durable Object itself: OpenNext's generated `worker.js` exports only its **own** DOs, so a custom one needs `main` repointed at a wrapper — a build change that deserves its own PR rather than riding along with auth. |
| M1-11 Turnstile on login + accept-invite | todo | | | ⬜ Blocked on a Turnstile site key + `TURNSTILE_SECRET_KEY` from the user. Names are in `.dev.vars.example`; the sign-in action is the single place it hooks into. |
| M1-12 Session cookies + single active session | in_progress | Claude | 2026-09-17 | ✅ `lib/auth/sessions.ts`. A JWT cannot express revocation and its lifetime is deliberately longer than the longest test, so the `insignia_session` cookie carries a `user_sessions.id` and every guarded page checks that row is live. ✅ **Students one session, staff several** (user, 2026-09-17, §4): a student's second sign-in revokes the first — the sharing control — while staff work on a phone and a laptop. ✅ `revokeSession` checks ownership, so one user cannot revoke another's. ⬜ Raise the Supabase JWT expiry to 7200 s (needed: a 60-minute Reading test outlasts the 3600 s default and would refresh mid-test) — a dashboard change, awaiting the user. |
| M1-13 `lib/rbac.ts` + route guards | in_progress | Claude, goverdhan-gaur | 2026-09-15 | ✅ Permission matrix agreed (§4). ✅ `supabase/migrations/20260915180655_role_permissions.sql` (Owner label, permissions + `CHECK`). ✅ `lib/permissions.ts` (pure, TSDoc) + `lib/rbac.ts` (`getActor` via `getClaims()` + secret-key lookup, `requirePermission`, `ForbiddenError`). ✅ `npm run test:unit` 29/29 against the seeded data; a deliberate "teacher can publish" seed is caught. ✅ Pushed by the user; verified live: `super_admin` named Owner, permission counts admin 10 / invigilator 1 / student 1 / Owner 12 / teacher 5, `roles_permissions_well_formed` present. ✅ Route guards (2026-09-17): `lib/auth/guard.ts` — `requireUser` / `requireStaff` / `requirePermissionOrRedirect`. These **redirect** where `requirePermission` throws, which is the difference between a page and an action. They also enforce revocation, so a revoked session with a still-valid JWT is turned away. ⬜ Apply them to the privileged layouts as each screen leaves mock data. |
| M1-14 Device list + revoke (server side) | in_progress | Claude | 2026-09-17 | ✅ `revokeSession` in `lib/auth/sessions.ts`, ownership-checked and audited. ⬜ Wire Profile's list to `user_sessions`; ⬜ migrate the dead PIN columns off `user_devices` (`pin_hash`, `device_secret_hash`, `failed_pin_attempts`, `locked_until` — never written since the PIN was dropped). |

### M2 — Student core, Listening

| Task | Status | Owner | Date | Note |
|---|---|---|---|---|
| M2-01 Student app shell + nav | done | Claude | 2026-09-16 | ✅ `src/app/(student)/layout.tsx` + `components/student/student-nav.tsx`. Top bar ≥768px, sticky bottom tab bar below; four labelled destinations, no hamburger. The player sits **outside** this layout on purpose. Verified in Chrome at 390 + 1280, no overflow at either. |
| M2-02 Student Home (03) | done | Claude | 2026-09-16 | ✅ `/home` from `03 Student Home.dc.html`: one `NextUpCard` hero (night surface), three quick links, last-band line. Three states: startable · locked-with-reason · nothing-assigned (becomes "Practice at home"). Data via `getStudentHome()` — **fixtures, not queries** (see `lib/mock/README.md`). Verified in Chrome at 390 + 1280. |
| M2-03 My Tests (04) | done | Claude | 2026-09-16 | ✅ `/tests` with To do / Practice / Done. Tabs are **links** (`?tab=`), not client state, so back works and a tab is linkable. Locked cards dim but stay readable and always print `locked.message`; a held result says the teacher will release it. Empty state per tab. Verified at 390 + 1280. |
| M2-04 Assignment eligibility resolver | todo | | | Windows, attempts, plan validity, unlocks |
| M2-05 Pre-test instructions (05) + headphone check | done | Claude | 2026-09-16 | ✅ `/tests/[assignmentId]/start`: facts strip, 4–5 rules, `SoundCheck` for Listening. The check asks a question with a *wrong* answer and the wrong answer leads somewhere (3 ordered fixes, then "tell your teacher"); it never blocks Start, so a student whose lab machine has no sound can still begin if told to. Audio `play()` rejection and "I heard nothing" land on the same help. |
| M2-06 Audio preload + owner-bound cache purge | todo | | | Highest-value lines in the caching layer |
| M2-07 Attempt lifecycle server actions | todo | | | start, resume, autosave, submit, expire |
| M2-08 Server-authoritative timer + countdown | in_progress | Claude | 2026-09-16 | ✅ **UI half.** `secondsRemaining` comes from the server and the player ticks it down only to draw the clock; hitting 0 calls `onSubmit("time")` once. ⬜ **Server half** (M2-07): `expires_at`, the submit endpoint ruling on whether time was really up, and reconciliation after a slept tab. The player never decides the deadline. |
| M2-09 Question navigator + flags | done | Claude | 2026-09-16 | ✅ Wired into the player: answered/flagged/current from live state, jump-to-question scrolls to a per-question anchor. **`PlayerQuestion.covers`** added — one "Choose TWO" control answers two numbered questions, so 40 questions are 38 controls; without it the navigator read 38/40. |
| M2-10 Widget `text_gap` + 7 containers | done | Claude | 2026-09-16 | ✅ `QuestionGroupBlock` maps widget × container. The widget picks the *control*, the container the *furniture around it* — that split is how six widgets cover fourteen question types. All 7 containers styled. |
| M2-11 Widget `radio` | done | Claude | 2026-09-16 | ✅ Wired into `QuestionGroupBlock`. |
| M2-12 Widget `checkbox_n` | done | Claude | 2026-09-16 | ✅ Wired, with `choose` from the group and `covers` for its question numbers. |
| M2-13 Widget `dropdown_bank` (Listening) | done | Claude | 2026-09-16 | ✅ Wired; the shared bank prints once above the rows that draw from it. |
| M2-14 Widget `image_label` + asset signing | todo | | | No rendered design |
| M2-15 Listening player shell (06) | in_progress | Claude | 2026-09-16 | ✅ `/attempt/[attemptId]`, **outside** the `(student)` layout — during a test there is no navigation anywhere. One `<audio>` at the component root, above the section switch, so section changes can't seek or re-fetch it (D8). `AudioPlayer` gained `surface="night"` (§4) to match design 06. Audio-failure banner with a Try again. ⬜ Autosave + submit actions (M2-07); `PlayerShell` is handed no callbacks until then, deliberately. |
| M2-16 Submit confirmation modal (08) | done | Claude | 2026-09-16 | ✅ Names the count, lists every unanswered number as a chip that jumps to the field, "Go back" primary and "Submit anyway" secondary. Verified over CDP: 8 unanswered listed correctly, chips match state. |
| M2-17 Scoring on submit + band + section scores | todo | | | |
| M2-18 Result screen (09) | done | Claude | 2026-09-16 | ✅ `/results/[attemptId]`: band hero, raw score / time / wrong count, per-section bars, two actions. Three states: released · **held** (a sentence, never an empty score card) · **below the scale** (`band` null → `belowBand` marker in its own card, because `BandScore` would have to invent a number). |
| M2-19 Crash-recovery E2E | todo | | | V1 in MVP-1 §19 |

### M3 — Reading player

| Task | Status | Owner | Date | Note |
|---|---|---|---|---|
| M3-01 Reading player shell (07) | in_progress | Claude | 2026-09-16 | ✅ `ReadingSplit`: two independently scrolling panes with a draggable divider (keyboard-operable, clamped 25–75%). Below 1024px it collapses to a Passage/Questions toggle — a split view narrower than that gives two unreadable columns, and legibility is the product. ⬜ Same server half as M2-15. |
| M3-02 Multi-passage sections + sanitisation | in_progress | Claude | 2026-09-16 | ✅ `AttemptSection.passages` is a **list**, so GT section 1's 2–3 texts render. Sanitising happens in `sanitizeAttemptSession` on the server (§4), not in the client player. ⬜ Highlight + note (M3-11). |
| M3-03 Widget `segmented_3` | done | Claude | 2026-09-16 | ✅ Wired. The group's `bank` chooses the three words, so `identifying_information` gets True/False/Not Given and `identifying_views_claims` gets Yes/No/Not Given; omitted, it falls back to T/F/NG. ⚠️ The player stores the option **value verbatim** — those strings are a contract with `lib/scoring.ts`, not display text. |
| M3-04 `matching_headings` | todo | | | |
| M3-05 `matching_features` | todo | | | |
| M3-06 `matching_information` | todo | | | |
| M3-07 `matching_sentence_endings` | todo | | | Not on the official GT list |
| M3-08 `summary_completion` + word bank | todo | | | |
| M3-09 `diagram_label_completion` | todo | | | |
| M3-10 Academic vs GT variant gating | todo | | | |
| M3-11 Passage highlight + note | todo | | | |

### M4 — Review, progress, practice, profile

| Task | Status | Owner | Date | Note |
|---|---|---|---|---|
| M4-01 Review my mistakes (10) + release gating | done | Claude | 2026-09-16 | ✅ `/review/[attemptId]`: summary strip, per-question cards, "Show why" expander with the explanation and the audio timestamp. Defaults to **mistakes only**. Teacher HTML goes through `sanitizePassageHtml` **again on render** (§8 rule 8) — the write-side pass can be bypassed by anything reaching the table another way. Release gating is server-side; a held or foreign attempt 404s. |
| M4-02 Transcript + jump to timestamp | todo | | | Offsets into the one audio file |
| M4-03 My Progress (11) | done | Claude | 2026-09-16 | ✅ `/progress`: band-over-time line per skill, then "What to practise" worst-first, one sentence of advice, tests-taken + average. No filters, no date pickers. **`BandTrendChart` extended** (§4): `BandPoint.band` may be `null` so a skill not tested on a date breaks the line instead of inventing a score; end labels are laid out top-down with a collision nudge and a surface-coloured halo. Backward compatible — `/dev/components` unchanged. |
| M4-04 Practice at home (12) | done | Claude | 2026-09-16 | ✅ `/practice`: rule stated once at the top, Listening/Reading filter as links (`?skill=`), each card says how many times it's been done. No "Not started" pill on practice — it can be taken any number of times, so the count *is* the status. |
| M4-05 Practice instant feedback round-trip | todo | | | One verdict, never the key |
| M4-06 Profile (13) + device management | done | Claude | 2026-09-16 | ✅ `/profile`: name, phone, batch, teacher, centre; access card with the end date and a bar of time **used** (a full bar reads as "act now"); logged-in devices; Change my PIN; Log out behind a `ConfirmDialog` naming what happens. Sign-out action lands with M1 — the dialog's `onConfirm` is a deliberate no-op until then. |

### M5 — Admin essentials

| Task | Status | Owner | Date | Note |
|---|---|---|---|---|
| M5-01 Admin shell + sidebar | done | Claude | 2026-09-16 | ✅ `(admin)/layout.tsx` + `StaffSidebar`, grouped Overview / People / Content; scrolling chip row below 1024px. ⚠️ It draws navigation, it is **not a gate** — `lib/rbac.ts` + RLS are, both server-side. |
| M5-02 Admin overview (20) | done | Claude | 2026-09-16 | ✅ `/overview`: four stat cards, an "expiring soon" table with **inline Extend** on the row (the fix belongs where the problem is seen, not three clicks away), recent activity. |
| M5-03 Students list (21) | done | Claude | 2026-09-16 | ✅ `/students`: search + status + batch filters, all in the **URL** — a filtered list is something staff paste to each other, and it survives a refresh mid-support-call. Plain GET form, so it works without JS. ⬜ Bulk select + sticky bulk bar land with the server actions. |
| M5-04 Invite + bulk CSV invite (22) | done | Claude | 2026-09-16 | ✅ `/students/new` (called **Invite**, not Add — no public signup, so the account doesn't exist until they accept) and `/students/import`: auto-guessed column mapping, per-row preview, each error pinned to **its own cell** with the reason. Verified with a real CSV: quoted `"Singh, Arjun"` parsed, `+91 98765 43211` normalised, 3 good / 3 bad split correctly. ⚠️ Browser parsing is for the **preview only** — the real checks run server-side (M1-02). |
| M5-05 Student detail drawer (23) | done | Claude | 2026-09-16 | ✅ `/students/[id]`. Built as a **page, not a drawer** (§4): staff open it mid-call and paste the link to a colleague, and a drawer has no address. Plan first, then attempts, plan history and the audit trail. |
| M5-06 Plans & validity workqueue (24) | done | Claude | 2026-09-16 | ✅ `/plans`: grouped Expired / this week / this month — three groups because they're three different jobs (apologise, act, plan), not one sortable list. Bulk select → 1/3/6 months → confirm dialog naming exactly what changes, with a **required reason** kept in plan history. The dialog's date is illustrative; the server recomputes from each plan's own end date, so a stale tab can't write a wrong date. |
| M5-07 Batches (25) | done | Claude | 2026-09-16 | ✅ `/batches`. A batch with no teacher or no students says so in words — both are easy to create by accident and an empty cell doesn't get noticed. |
| M5-08 Test library (26) | done | Claude | 2026-09-16 | ✅ `/library` with skill/status filters. The column that matters is **answer keys**: a published test with a missing key silently scores zero, so "34 of 40 · 6 missing" is on every row rather than hidden behind a Draft pill. |
| M5-09 Answer key editor (27) | done | Claude | 2026-09-16 | ✅ `/library/[testId]/answer-key`. Built for **speed**: Enter drops to the next answer, variants are a comma field (not chips — chips cost a mouse trip each), progress always on screen, missing rows flagged via `aria-invalid`. ⚠️ **The only screen that puts correct answers in a browser.** `noindex`; its view-model `AnswerKeyEditor` is used by nothing else, so no student screen can join onto it. ⬜ Save action + `key.json` write (M5). |

### M6 — Teacher

| Task | Status | Owner | Date | Note |
|---|---|---|---|---|
| M6-01 Teacher dashboard (14) | done | Claude | 2026-09-16 | ✅ `/teacher/dashboard`: today, "needs you", batch cards. Every attention item **links somewhere** — a list of problems with no destination only makes people feel behind. |
| M6-02 Batch view (15) | done | Claude | 2026-09-16 | ✅ `/teacher/batches/[batchId]`: roster with **plan expiry in it**. The teacher sees these students twice a week and finds out first — the warning belongs on the register they already read, not only in the admin queue. |
| M6-03 Assign a test (16) | done | Claude | 2026-09-16 | ✅ `/teacher/assign`: three steps on one page (not a wizard — a teacher on their fourth test of the week knows all three answers already). Live student count **de-duplicates** batch members against individually-picked students. The deliverable is the plain-English summary sentence before the button: getting an assignment wrong is expensive, and a sentence is checkable in a way five fields aren't. Verified over CDP. |
| M6-04 Results & release (18) | done | Claude | 2026-09-16 | ✅ `/teacher/results/[assignmentId]`, `noindex` (its expanded rows carry the key). Multi-select → confirm → release; releasing is deliberate, not a per-row toggle, because it's the moment a band becomes real and can't be undone. Flags shown, **never acted on** (M9-01: flags, not blocks). |
| M6-05 Mark override + note | done | Claude | 2026-09-16 | ✅ Expandable row inside screen 18. **The note is required** — "Give the mark" stays disabled until one is typed. The next person to look needs to know why a mark was changed by hand, and "I'll remember" isn't true a month later. ⬜ The override action itself. |
| M6-06 Class analytics (19) | done | Claude | 2026-09-16 | ✅ `/teacher/batches/[batchId]/analytics`, titled **"What to teach"** rather than Analytics because that's the only question it answers. Band distribution, weakest types worst-first, most-missed questions. |

### M7 — Live session monitor

| Task | Status | Owner | Date | Note |
|---|---|---|---|---|
| M7-01 Live-monitor endpoint (polled) | todo | | | ~~Realtime channel on `attempts`~~ superseded 2026-09-15 — polling every 10 s, no Realtime (§4) |
| M7-02 Live session monitor (17) | done | Claude | 2026-09-16 | ✅ `/teacher/live/[sessionId]`: tile per student, status as a **word** as well as a colour, mono time so it doesn't jitter, low time in warning. The "Updated Ns ago · refreshes every 10s" stamp is load-bearing — an invigilator must be able to tell the room from a frozen page, and a silently dead feed looks exactly like a calm room. Tiles tick locally between polls; that's cosmetic, every poll replaces them. ⬜ The poll itself is M7-01. |
| M7-03 Invigilator actions | in_progress | Claude | 2026-09-16 | ✅ UI: +5 minutes and "Finish for them" on in-progress tiles only, each behind a confirm that names the consequence (force-submit quotes how many answers will be sent as they stand). ⬜ The server actions. |

### M8 — Test-authoring MCP

*Can start once M0-17 lands — does not block M2–M7.*

| Task | Status | Owner | Date | Note |
|---|---|---|---|---|
| M8-01 MCP scaffold + scoped-credential auth | todo | | | Never the service-role key |
| M8-02 `validate_test`, `create_test`, `update_test` | todo | | | |
| M8-03 `set_answer_key` | todo | | | |
| M8-04 `request_audio_upload`, `request_asset_upload` | todo | | | |
| M8-05 `list_tests`, `get_test` | todo | | | Answers withheld unless staff |
| M8-06 `publish_test` + completeness check | todo | | | |
| M8-07 MCP guide in `docs/test-authoring.md` | todo | | | |

### M9 — Hardening & go-live

| Task | Status | Owner | Date | Note |
|---|---|---|---|---|
| M9-01 Anti-cheat flags | todo | | | Flags, not blocks |
| M9-02 Audit log screen (29) | done | Claude | 2026-09-16 | ✅ `/admin/audit`: who · what · when · **the detail that makes it mean something** (an extension without its reason answers none of the questions this screen gets opened for). A deleted actor renders as "Account deleted", never a blank — `audit_log` keeps actor ids without FKs for exactly this (M0-10). |
| M9-03 Users & roles (28) | done | Claude | 2026-09-16 | ✅ `/admin/users`: staff list + permission matrix. The matrix is **read from `roles.permissions`**, not hardcoded — that table is what `lib/rbac.ts` enforces, and a permissions screen drawn from anything else would eventually lie. Cells say *where* a permission applies ("Their centre" ≠ "Everywhere"), and "No" is a word, not an empty cell. |
| M9-04 Error / edge screens (30) | in_progress | Claude | 2026-09-16 | ✅ `app/not-found.tsx` and `app/error.tsx`. The error page's first line is **"Your answers are saved"** — that's the difference between a student who retries and one who panics mid-test. No stack trace or error code; `digest` is present but quiet, for support. ⬜ Connection-lost banner in the player, test-not-available, session-expired, browser-unsupported. |
| M9-05 Load test at **200** concurrent | todo | | | ~~40~~ → 200 (user, 2026-09-15). Throwaway free Supabase project. First run right after M2-07 |
| M9-06 Backups + restore drill | todo | | | The drill must actually restore. Free has no backups → nightly `db dump` to private R2. **Before the first real student** |
| M9-07 Full security review | todo | | | |
| M9-08 DPDP retention + deletion path | todo | | | |
| M9-09 Docs completeness pass | todo | | | |

---

## 3. Changelog

Newest first. `date · task · what changed · files · who`

| Date | Task | What changed | Files | Who |
|---|---|---|---|---|
| 2026-09-17 | M1-02…M1-14 | **The auth flow, zero to full.** `lib/auth/{tokens,password,invitations,acceptance,sign-in,sessions,lockout,guard}.ts`, `lib/mail/{mailer,templates}.ts`, `lib/actions/{auth,invitations,types}.ts`, `lib/audit.ts`, `lib/env.ts`, `lib/time.ts`. Four migrations: bootstrap Owner + first-run setup, `invitations.name/phone/country_code`, `accept_invitation`, and the `rate_limits` counters. `/login`, `/invite/[token]` and the set-password form come off `lib/mock/auth`; new `/setup`. Tests found two real bugs before a human did: an ambiguous `window_start` between a `RETURNS TABLE` output and the column, and the schema's refusal to accept a back-dated invitation. 282 DB / 26 sweep / 197 unit, lint, build, bundle scan clean. **Not yet pushed.** | `supabase/migrations/2026091710*.sql`, `src/lib/{auth,mail,actions}/*`, `src/lib/{audit,env,time}.ts`, `src/components/auth/*`, `src/app/(auth)/*`, `tests/unit/auth-tokens.test.mjs`, `tests/db/rls.test.mjs`, `wrangler.jsonc`, `.dev.vars.example` | Claude |
| 2026-09-16 | M0-20 (in progress) | Took over the unfinished Codex session after the real Listening paper and recording arrived. The supplied audio is a different test from the prototype placeholder, so the prototype is left as design content and the real paper lives in the gitignored `Sample test/`, loaded through a new `--source` argument — this repository is public and the paper, its MP3 and the generated JSON all carry the answer key. Rewrote the converter to derive question groups from consecutive runs rather than a hardcoded layout, take each word limit from the paper's own instruction line, fold "choose TWO letters" into one control covering both numbers, and reject T/F/NG for Listening instead of silently mapping it to multiple choice. Added an upload-schema rule that `duration_seconds` must cover the recording: the supplied 1916 s audio against the legacy 1800 s clock would have expired every attempt inside Part 4. Section endpoints recovered from the recording: 481 / 977 / 1465 / 1916 s. Unit 181/181, DB 250/250, sweep 26/26, typecheck, lint, build, bundle scan and audit pass. ⚠️ The 40 Listening answers came from the recording, not an answer key — the document has none — and must be checked by a teacher before the test leaves draft. | `src/lib/import/{legacy-listening.ts,test-upload.schema.ts,README.md}`, `scripts/{import-legacy-tests.ts,README.md}`, `tests/unit/{legacy-listening,test-upload-schema}.test.mjs`, `.gitignore`, `BUILD-STEPS.md`, `PROJECT-MEMORY.md` | Claude Opus 5 |
| 2026-09-16 | M0-20 (in progress) | Added a strict server-only converter for the prototype Listening source and a CLI that generates the canonical upload JSON, then delegates optional dry-run/remote work to the existing importer. It verifies 40 sequential answered questions, expected section membership, Listening-valid type mappings, shared matching banks and real contiguous audio markers. The upload boundary now rejects markers that do not start at zero, contain gaps or fail to cover the complete recording. Eight focused checks prove all source answers survive into 40 private key entries while `content.json` has no scoring fields; the end-to-end CLI check also caught and fixed `import-test.ts` passing `crypto.randomUUID` unbound. Unit 172/172, DB 250/250, policy sweep 26/26, typecheck, lint, build, bundle scan and audit pass. Opened PR #14; not merged. Live import remains blocked because no source MP3/timing metadata exists and the live database has no active `test:author`. | `src/lib/import/{legacy-listening,test-upload.schema}.ts`, `scripts/{import-legacy-tests,import-test}.ts`, `scripts/README.md`, `tests/unit/{legacy-listening,test-upload-schema}.test.mjs`, `package.json`, `BUILD-STEPS.md`, `MVP-1.md`, `PROJECT-MEMORY.md` | OpenAI Codex |
| 2026-09-16 | M0-18 | Added the server-only scorer and runtime answer-key boundary. Exact normalisation honours only authored alternatives, enforces word limits before comparison, counts hyphenated terms as one and does not stem plurals. Multi-answer controls emit per-number partial credit without negatives; complete attempts include per-question facts, section totals and an attempt total. Band conversion accepts database rows from the caller and fails closed on missing/overlapping matches. Added 21 scoring checks to the existing Node unit runner and tightened upload validation so choice answers cannot carry spelling variants. No Vitest dependency or configuration. Verification: unit 164/164, DB 250/250, policy sweep 26/26, typecheck, lint, build, bundle scan and audit pass. Opened PR #13 from the independent `feat/m0-18-scoring` branch; not merged. | `src/lib/scoring.ts`, `src/lib/import/test-upload.schema.ts`, `src/lib/README.md`, `tests/unit/{scoring,test-upload-schema}.test.mjs`, `MVP-1.md`, `BUILD-STEPS.md`, `PROJECT-MEMORY.md` | OpenAI Codex |
| 2026-09-16 | M0-17 | Added the single reusable importer transaction and its CLI. The importer validates the M0-16 schema, sanitises every authored HTML field, verifies referenced files plus MIME/magic/size and mono ≤64 kbps MP3 constraints, generates every R2 path, and splits the four scoring fields into server-only `key.json`. It uploads objects before creating an attributed draft and attempts reverse-order cleanup on failure. The CLI supports no-write dry runs and remote R2 + audited Supabase imports for an active `test:author`. Verification: 8 focused checks including recursive zero-answer-key proof; unit 142/142, DB 250/250, sweep 26/26, typecheck, lint, build, bundle scan and audit all pass. | `src/lib/import/{import-test.ts,README.md}`, `scripts/{import-test.ts,README.md}`, `tests/unit/import-test.test.mjs`, `docs/test-authoring.md`, `package.json`, `BUILD-STEPS.md`, `PROJECT-MEMORY.md` | OpenAI Codex |
| 2026-09-16 | M0-12 | Completed R2 signing as enforceable server code: canonical UUID/version key builders and parser, private binding reads for content/key, fixed five-minute S3-compatible GET signatures, matching attempt/test/version enforcement, in-progress audio/asset gate and submitted + released transcript gate. Both JSON objects refuse signing before any credentials are read. Added the exact account R2 origin to image/media CSP, R2 credential names to the client-bundle guard, generated binding types and documented pending least-privilege credential provisioning. Verification: 12 focused checks, unit 134/134, DB 250/250, sweep 26/26, typecheck, lint, build, bundle scan and audit all pass. | `src/lib/{r2,r2-keys}.ts`, `src/lib/README.md`, `tests/unit/{r2,security-headers}.test.mjs`, `src/lib/security/headers.ts`, `src/proxy.ts`, `scripts/check-client-bundle.mjs`, `.dev.vars.example`, `wrangler.jsonc`, `cloudflare-env.d.ts`, `package{,-lock}.json`, `BUILD-STEPS.md`, `PROJECT-MEMORY.md` | OpenAI Codex |
| 2026-09-16 | M0-16 | Added the strict Zod-backed `schema_version: 1` upload contract and inferred types; pinned Zod 4.6.5. Validation imports M0-15 instead of duplicating the taxonomy and reports precise nested paths for type/widget/container, answer, numbering, format, audio/passage, practice-set and asset errors. Added full field documentation and three executable worked payloads that collectively demonstrate all 18 types. Enabled explicit `.ts` imports for direct Node test execution in this no-emit project. Verification: unit 122/122, DB 250/250, policy sweep 26/26, typecheck, lint, build, bundle scan and audit all pass. | `src/lib/import/{test-upload.schema.ts,README.md}`, `docs/test-authoring.md`, `tests/unit/test-upload-schema.test.mjs`, `package{,-lock}.json`, `tsconfig.json`, `PROJECT-MEMORY.md` | OpenAI Codex |
| 2026-09-16 | M0-15 | Built the single source of truth for all 18 IELTS Listening/Reading question types: official labels, six renderers, completion layouts and three-state format availability. GT Y/N/NG and matching sentence endings are explicit warnings. Removed the player view-model's duplicate widget/container unions. Added module documentation and 25 contract checks. Verification: unit 106/106, DB 250/250, policy sweep 26/26, typecheck, lint, production build and client-bundle scan all pass. | `src/lib/question-types.ts`, `src/lib/question-types/README.md`, `src/lib/view-models/attempt.ts`, `src/components/player/question-group.tsx`, `tests/unit/question-types.test.mjs`, `PROJECT-MEMORY.md` | OpenAI Codex |
| 2026-09-16 | docs | **Corrected the contract to match what was built.** `MVP-1.md` §9: no PIN — email and password only, the fast-login section struck out, an admin never sets a password. §15: staff routes are real segments (`/admin/*`, `/teacher/*`), not route groups, with the shell-collision bug that forced it recorded. §17: all 30 screens marked built, screen 02 dropped, screen 23 noted as a page not a drawer, screen 30 marked partial. `BUILD-STEPS.md`: step 37 dropped, steps 36/38/39/69/76 reworded. `PROJECT-MEMORY.md` §1 rewritten — it still said "Active milestone M0". | `MVP-1.md`, `BUILD-STEPS.md`, `PROJECT-MEMORY.md` | goverdhan-gaur (decision), Claude |
| 2026-09-16 | M1-05, M1-06, M1-08 | Auth screens, **email + password only** — the user dropped the PIN. `/login` (no signup link, one error for both fields, lock says until when) and `/invite/[token]` (four dead-end states, each with a sentence and a way forward). PIN removed from Profile, the log-out dialog, the admin invite form and student detail ("Reset PIN" → "Send a new invitation"); `PinInput` flagged unused in the gallery. PR #7. | `src/app/(auth)/**`, `src/components/auth/set-password-form.tsx`, `src/lib/{view-models,mock}/auth.ts`, `src/app/(student)/profile/page.tsx`, `src/app/admin/students/**` | goverdhan-gaur (decision), Claude |
| 2026-09-16 | M6, M7-02, M9-02…04 | Teacher screens 14–19, live monitor 17, users & roles 28, audit log 29, not-found and error pages. **Staff routes namespaced** after finding `/batches` rendered Admin while `/batches/b-0` rendered Teacher. PR #6. | `src/app/teacher/**`, `src/app/admin/{users,audit}/**`, `src/app/{not-found,error}.tsx`, `src/components/staff/**`, `src/lib/{view-models,mock}/teacher.ts` | Claude |
| 2026-09-16 | M5-01…09 | Nine admin screens on the view-model seam. Fixed two shared-component bugs found by using them: `Button asChild` passed Slot two children and threw for every caller; `PhoneInput` hardcoded the 56px student height. PR #5. | `src/app/admin/**`, `src/components/staff/**`, `src/components/ui/{button,input}.tsx`, `src/lib/{view-models,mock}/admin.ts` | Claude |
| 2026-09-16 | M2, M3-01…03, M4 | Twelve student screens and the test player, on a new `lib/view-models` ↔ `lib/mock` seam so they could be built before the queries. Attempt HTML sanitised server-side (`sanitize-attempt.ts`) to keep `unified`+`rehype` out of the player bundle — verified empty in `.next/static`. `BandTrendChart` extended for gaps; `AudioPlayer` gained a `night` surface. PR #4. | `src/app/(student)/**`, `src/app/attempt/**`, `src/components/{student,player}/**`, `src/lib/{view-models,mock}/**`, `src/lib/security/sanitize-attempt.ts`, `src/components/ui/{band-trend-chart,button,input}.tsx` | Claude |
| 2026-09-16 | §7 Q12 | PR #3 merged (`9d18e04`); user ran `db push` and regenerated types (`72cbbe6`). **Verified live over the REST API** (no MCP this session — the connector needs an interactive OAuth): secret key reads `student_plan_notes` (200, empty); publishable key with no session is refused (401 / 42501); `student_plans.notes` is gone (400 / 42703); plan facts still read (200). | `src/lib/supabase/database.types.ts`, `PROJECT-MEMORY.md` | goverdhan-gaur, Claude |
| 2026-09-16 | §7 Q12 | Staff plan notes split out of `student_plans` into `student_plan_notes` (staff-only RLS, same audience as `plan_history`); student keeps every plan fact. `test:db` 250/250 (was 240), sweep 26/26 all covered, 2 deliberate mutations caught (column re-added; policy widened to `using (true)`). **Not yet pushed — needs `npx supabase db push`, then `npm run db:types`.** | `supabase/migrations/20260916125048_plan_notes.sql`, `tests/db/rls.test.mjs`, `MVP-1.md`, `PROJECT-MEMORY.md` | goverdhan-gaur (decision), Claude |
| 2026-09-16 | M0-13 | Merged PR #1 at the user's request (rebase); production deploy succeeded; live site verified (headers, nonces, Chrome). User granted `goverdhan-gaur` write access. Built `lib/security/sanitize.ts` + 40 tests on branch `feat/sanitize-passages`; deps pinned (unified 11.0.5, rehype-parse 9.0.1, rehype-sanitize 6.0.0, rehype-stringify 10.0.1). All gates pass locally (81 unit, 240 DB, build, bundle scan). | `src/lib/security/sanitize.ts`, `src/lib/security/README.md`, `tests/unit/sanitize.test.mjs`, `package.json`, `package-lock.json`, `BUILD-STEPS.md`, `PROJECT-MEMORY.md` | goverdhan-gaur, Claude |
| 2026-09-16 | M0-13 | At the user's request: moved the unpushed CSP commit to branch `feat/security-headers-csp` (local `main` reset to `origin/main`), pushed it. Cloudflare built a preview version automatically; verified the CSP there (headers, per-request nonce on all 12 scripts, Chrome: hydration + 0 violations) while live stayed unchanged. `gh pr create` refused (read-only account) — the user opens the PR. Cleaned iCloud duplicates (`src/proxy 2.ts` + 86 build copies). | `PROJECT-MEMORY.md` | goverdhan-gaur, Claude |
| 2026-09-15 | M0-13 | Nonce CSP + security headers: `src/proxy.ts`, `src/lib/security/headers.ts` (+README), `public/_headers` (cache rule kept), root layout forces per-request rendering. 12 new unit checks (41 total). Proven on the built Worker under local workerd with headless Chrome over CDP: injected script blocked, hydration fine, 0 violations elsewhere. Probe page removed, never committed. | `src/proxy.ts`, `src/lib/security/*`, `src/app/layout.tsx`, `public/_headers`, `tests/unit/security-headers.test.mjs`, `MVP-1.md`, `BUILD-STEPS.md`, `PROJECT-MEMORY.md` | goverdhan-gaur (decision), Claude |
| 2026-09-15 | step 9 (probe) | Tested Next 16 `proxy.ts` on OpenNext: builds with an "experimental" warning, runs on every route with a per-request nonce under local workerd. Probe removed (an editor had staged it — unstaged; never committed). Findings in §5. | `PROJECT-MEMORY.md` | Claude |
| 2026-09-15 | M0-12 (part 1) | R2 buckets created with the user's OK (APAC, private, r2.dev off — verified) and bound in `wrangler.jsonc`; `cloudflare-env.d.ts` regenerated (also drops the stale `muddy-truth` comment). Found an unrelated pre-existing bucket `listenings` — left alone. | `wrangler.jsonc`, `cloudflare-env.d.ts`, `BUILD-STEPS.md`, `PROJECT-MEMORY.md` | Claude, goverdhan-gaur |
| 2026-09-15 | M0-22 | CI workflow + client-bundle guard script; `typecheck` and `check:bundle` npm scripts; `scripts/README.md`. All gates pass locally; guard proven with a throwaway leak. User had pushed `role_permissions` — verified live. | `.github/workflows/ci.yml`, `scripts/*`, `package.json`, `MVP-1.md`, `BUILD-STEPS.md`, `PROJECT-MEMORY.md` | Claude |
| 2026-09-15 | step 22 (M1-13) | Owner/Admin decided with the user; permission matrix agreed. Migration `role_permissions` (Owner label, permissions, `CHECK`). `lib/permissions.ts` + `lib/rbac.ts`. DB test shim moved to `tests/db/setup.mjs` (shared by `rls.test`, the sweep and unit tests). `npm run test:unit` 29/29; `test:db` 240/240. **Not yet pushed.** | `supabase/migrations/20260915180655_role_permissions.sql`, `src/lib/{permissions,rbac}.ts`, `tests/db/setup.mjs`, `tests/unit/permissions.test.mjs`, `package.json`, `MVP-1.md`, `BUILD-STEPS.md`, `PROJECT-MEMORY.md` | goverdhan-gaur (decision), Claude |
| 2026-09-15 | M0-14 | User set `.dev.vars` and the three Wrangler secrets. Verified without printing values, then probed the live PostgREST API: `anon` refused on every table probed, `private` helpers unreachable, secret key works. First API-level (not just SQL) confirmation of the grants. | `PROJECT-MEMORY.md` | goverdhan-gaur, Claude |
| 2026-09-15 | step 21 (M0-05), M0-14 | Supabase clients: `lib/supabase/server.ts`, `admin.ts`, `env.ts` (TSDoc, `server-only`), no browser client (§4). `.dev.vars.example`. Packages pinned. Verified: a `"use client"` import of `admin.ts` fails `next build` (probe added, built, removed); normal `next build`, tsc and lint pass. Key names renamed to publishable/secret across docs. | `src/lib/supabase/*`, `.dev.vars.example`, `package.json`, `package-lock.json`, `MVP-1.md`, `BUILD-STEPS.md`, `PROJECT-MEMORY.md` | Claude |
| 2026-09-15 | M0-19 | User ran `db push`. Verified live over MCP. Types regenerated (`below_band`, nullable `band`). M0-19 closed. | `src/lib/supabase/database.types.ts`, `PROJECT-MEMORY.md` | goverdhan-gaur, Claude |
| 2026-09-15 | M0-19 | Reference-data migration written: 5 roles and the institute's three band charts (Listening, Academic Reading, GT Reading — user-supplied images), plus "Below 4" support (`band_scale_rows.band` nullable, `attempt_scores.below_band`). Harness updated (seeded roles/scales) and extended to 240 checks incl. per-scale coverage and chart spot checks; sweep 25/25. **Not yet pushed.** | `supabase/migrations/20260915174541_reference_data.sql`, `tests/db/rls.test.mjs`, `MVP-1.md`, `BUILD-STEPS.md`, `PROJECT-MEMORY.md` | goverdhan-gaur (charts, decision), Claude |
| 2026-09-15 | M0-11 | The PGlite harness is now in the repo: `tests/db/rls.test.mjs` (reads `supabase/migrations/` in order; `RLS_DROP_POLICY` option) and `tests/db/policy-sweep.mjs`. Scripts `test:db`, `test:db:sweep`. `@electric-sql/pglite` 0.5.8 pinned (devDependency, user approved). The sweep's first run found `band_scales` had no positive test — added. 229/229; sweep 25/25. | `tests/db/*`, `package.json`, `package-lock.json`, `MVP-1.md`, `BUILD-STEPS.md`, `PROJECT-MEMORY.md` | Claude, goverdhan-gaur |
| 2026-09-15 | M0-10 | User ran `db push`. Verified live; security advisor shows only the intended INFO on `rate_limits`. Types regenerated. M0-10 closed — all 24 tables live. | `src/lib/supabase/database.types.ts`, `PROJECT-MEMORY.md` | goverdhan-gaur, Claude |
| 2026-09-15 | M0-10 | Cross-cutting migration written: `audit_log`, `rate_limits`, and a fix for M0-07's `plan_history.actor_id` FK (blocked staff erasure). PGlite harness to 228 checks with a final sweep; 2 deliberate breaks caught. **Not yet pushed.** | `supabase/migrations/20260915172936_crosscutting.sql`, `MVP-1.md`, `BUILD-STEPS.md`, `PROJECT-MEMORY.md` | Claude |
| 2026-09-15 | M0-09 | User ran `db push`. Verified live over MCP; security advisor clean. Types regenerated. M0-09 closed. | `src/lib/supabase/database.types.ts`, `PROJECT-MEMORY.md` | goverdhan-gaur, Claude |
| 2026-09-15 | M0-09 | Assessment migration written: 5 tables (two split out of the §6 design), 3 triggers, 6 helpers, `tests` policy extended. Writing the harness exposed a gap — attempts could reference another test's assignment, or one not targeting the student — fixed in the insert trigger before any push. PGlite harness to 214 checks, all pass; 2 deliberate breaks caught. **Not yet pushed.** Spec §3 D4, §6, §7, §13 and steps 17, 43 updated. | `supabase/migrations/20260915172051_assessment.sql`, `MVP-1.md`, `BUILD-STEPS.md`, `PROJECT-MEMORY.md` | Claude |
| 2026-09-15 | M0-08 | User ran `db push`. Verified live over MCP; security advisor clean. Types regenerated. M0-08 closed. | `src/lib/supabase/database.types.ts`, `PROJECT-MEMORY.md` | goverdhan-gaur, Claude |
| 2026-09-15 | M0-08 | Content migration written: 6 tables, 4 helpers, `btree_gist`; four additions to the §6 schema (§4). PGlite harness to 156 checks, all pass; 2 deliberate breaks caught. `db push --dry-run` clean. **Not yet pushed.** Spec §6/§13 and step 16 updated. | `supabase/migrations/20260915171317_content.sql`, `MVP-1.md`, `BUILD-STEPS.md`, `PROJECT-MEMORY.md` | Claude |
| 2026-09-15 | M0-07 | User ran `db push`. Verified live over MCP; both advisors checked (security clean). Types regenerated with the 5 cohort tables. M0-07 closed. | `src/lib/supabase/database.types.ts`, `PROJECT-MEMORY.md` | goverdhan-gaur, Claude |
| 2026-09-15 | M0-07 | Cohorts migration written: 5 tables, 5 helpers, teacher policy on `users`, `invitations.batch_id` FK, identity policies folded to one per table. PGlite harness extended to 106 checks (all pass; 2 deliberate breaks caught). `db push --dry-run` clean. **Not yet pushed.** Spec §6/§13 and step 15 updated; Q12 opened. | `supabase/migrations/20260915170544_cohorts.sql`, `MVP-1.md`, `BUILD-STEPS.md`, `PROJECT-MEMORY.md` | Claude |
| 2026-09-15 | M0-06 | User ran `db push`. Verified live over MCP (tables, RLS, 14 policies, grants, hash columns unreadable, security advisor clean). Regenerated `database.types.ts` with the 6 tables. Cleared iCloud " 2" duplicates from `.next`/`.open-next` that broke `tsc`. tsc + lint clean. M0-06 closed. | `src/lib/supabase/database.types.ts`, `PROJECT-MEMORY.md` | goverdhan-gaur, Claude |
| 2026-09-15 | cross-cutting (Q11) | User confirmed Cloudflare Workers **Free**. Checked Cloudflare's docs: 100k requests/day reset 05:30 IST, 10 ms CPU, static assets free and uncounted, bundle limit now 64 MiB uncompressed (no compressed limit), DO free quotas. Spec: heartbeat 30 s → 60 s, DO limiter excludes autosave, new risk row for the daily cap. | `MVP-1.md`, `BUILD-STEPS.md`, `PROJECT-MEMORY.md` | goverdhan-gaur, Claude |
| 2026-09-15 | M0-06 | Identity migration written: `branches`, `roles`, `users`, `invitations`, `user_devices`, `user_sessions`; `private` schema + 4 helpers; RLS + read-only column grants (§4). Verified on a PGlite harness (61/61 pass; two deliberate breaks both caught) and `db push --dry-run`. **Not yet pushed** — user reviews first. Spec §13 and steps 14–15, 19 corrected. | `supabase/migrations/20260915164128_identity.sql`, `MVP-1.md`, `BUILD-STEPS.md`, `PROJECT-MEMORY.md` | Claude |
| 2026-09-15 | cross-cutting | Designed for 200 concurrent students on Supabase Free (§4): no Realtime, save-on-change autosave, Auth rate-limit plan, audio encoding + early preload, nightly backups, 200-student load test. Spec and walkthrough corrected. Opened Q11 (Cloudflare plan). Checked: Worker bundle is 953 KB gzipped (`wrangler deploy --dry-run`). | `MVP-1.md`, `BUILD-STEPS.md`, `PROJECT-MEMORY.md` | goverdhan-gaur (constraint), Claude |
| 2026-09-15 | — (step 1), M0-04, M1-01 | User answered Q1–Q3; spec rewritten to match (three test pools, per-assignment result release — §4). New Q9, Q10 opened. User turned off public signup in the dashboard — verified via the public `/auth/v1/settings` endpoint: `disable_signup: true`, email the only provider. User chose to skip the 70% usage alert. | `MVP-1.md`, `BUILD-STEPS.md`, `PROJECT-MEMORY.md` | goverdhan-gaur, Claude |
| 2026-09-15 | M0-05 | User ran `npx supabase db push`. Verified: `harden_rls_auto_enable` recorded remotely, security advisor clean. M0-05 closed. Found that `auth` schema is closed to `postgres` — spec §13 needs correcting before M0-06 (§5). | `PROJECT-MEMORY.md` | goverdhan-gaur, Claude |
| 2026-09-15 | M0-05 | Supabase CLI wired: `supabase` devDependency (2.117.0), `supabase init` output committed (`config.toml`, `supabase/.gitignore` — `.temp/` stays ignored), `db:types` script, first generated `database.types.ts` (empty `public`), `lib/supabase/README.md`. User ran `login`/`init`/`link`. `db push --dry-run` lists only `harden_rls_auto_enable`. tsc + lint clean. | `package.json`, `package-lock.json`, `supabase/{config.toml,.gitignore}`, `src/lib/supabase/{database.types.ts,README.md}` | goverdhan-gaur, Claude |
| 2026-09-15 | M0-05 | Dropped Drizzle before it was installed: `supabase-js` + generated types + Postgres functions instead (§4). Spec and walkthrough corrected to match. Docs only, no code or dependency change. | `MVP-1.md`, `BUILD-STEPS.md`, `PROJECT-MEMORY.md` | goverdhan-gaur (decision), Claude |
| 2026-09-15 | M0-04 | Supabase project created and verified. The first one (`ielts-test`, `fypfpveynadsbbfbuenc`) was in `ap-northeast-2` (Seoul); caught by the MCP cross-check while it was still empty, and replaced with `insignia-ielts` (`zpqszkwavnjomxjgimni`) in `ap-south-1`. Added the repo's first migration: revoke `EXECUTE` on `public.rls_auto_enable()` from `public`/`anon`/`authenticated` (security advisor lints 0028/0029). **Written, not applied** — the remote apply was blocked by the agent permission policy; it goes out with the first `supabase db push` (M0-05). | `supabase/migrations/20260915090941_harden_rls_auto_enable.sql`, `PROJECT-MEMORY.md` | goverdhan-gaur (projects), Claude (verification, migration) |
| 2026-09-15 | M0-03, M0-23 | shadcn/ui primitives added and restyled to the tokens; shadcn alias layer in `globals.css`; `<Toaster />` mounted in the root layout; gallery gained sections 1, 2–3, 4, 11–12, 13 and lost its "pending" list. Fixed three generator defects: `import { cn } from "cn"` (an unrelated npm package), undeclared `class-variance-authority`/`lucide-react`, and a `next-themes` dependency. Deps: +`radix-ui`, `sonner`, `class-variance-authority`, `lucide-react`, dev `tw-animate-css`. | `components.json`, `src/components/ui/{button,input,card,checkbox,table,dialog,select,sonner,skeleton,badge,label,filter-chip}.tsx`, `src/components/ui/README.md`, `src/app/{globals.css,layout.tsx}`, `src/app/dev/components/*`, `src/lib/utils.ts` | Claude |
| 2026-09-15 | M0-01 | Lint fixed: `"lint": "eslint ."`, `eslint.config.mjs` imports `eslint-config-next`'s native flat configs, `@eslint/eslintrc` removed, `Design files/**` ignored (prototype code, never built). Auto-deploy confirmed fixed by the user in the dashboard. M0-01 closed. | `package.json`, `eslint.config.mjs` | Claude, goverdhan-gaur |
| 2026-09-15 | M0-02, M0-23 | Design tokens + fonts, plus the design-system components shadcn doesn't provide: status pill, difficulty badge, banner, empty state, stat card, band score + answer line, accuracy bars, band trend chart, student tab bar, staff sidebar, PIN input; player countdown, question navigator, audio player, and 5 of 6 answer widgets (`image_label` waits for M2-14 — no design). Gallery at `/dev/components`. Scaffold home page replaced. Deps: `clsx`, `tailwind-merge`. | `src/app/{globals.css,layout.tsx,page.tsx}`, `src/app/dev/components/*`, `src/components/{ui,player}/*`, `src/lib/utils.ts` | Claude |
| 2026-09-15 | M0-01 | Cloudflare Workers Builds auto-deploy of `6f4a4b0` failed: *"Could not find compiled Open Next config, did you run the build command?"*. Cause: the dashboard build step runs `npm run build` (= `next build`), which never creates `.open-next/`. Fix is a dashboard setting — see §5. | — | goverdhan-gaur, diagnosed by Claude |
| 2026-09-15 | M0-01 | Renamed the worker `muddy-truth-1a57` → `insignia-test` in `package.json`, `wrangler.jsonc` `name` and `services[0].service` — all three consistent. Committed and pushed with the doc updates. | `package.json`, `wrangler.jsonc`, docs (commit `6f4a4b0`) | goverdhan-gaur |
| 2026-09-15 | — | Recorded the scaffold swap. Corrected `MVP-1.md` §15 and `BUILD-STEPS.md` steps 5–6 to match the `src/` layout and `cloudflare-env.d.ts`. | `PROJECT-MEMORY.md`, `MVP-1.md`, `BUILD-STEPS.md` | Claude |
| 2026-09-15 | M0-01 | Replaced the `vinext` scaffold with Next.js 16.3.4 + `@opennextjs/cloudflare` 1.20.3. Verified: `opennextjs-cloudflare build` succeeds and emits `.open-next/worker.js`; `.dev.vars` is gitignored and absent from history. Outstanding: worker rename, lint fix. | `package.json`, `wrangler.jsonc`, `next.config.ts`, `open-next.config.ts`, `src/app/*`, `eslint.config.mjs` (commit `576a7f3`) | goverdhan-gaur |
| 2026-09-14 | — | Specification written. Reviewed all four `Design files/*.md` docs, the 12 rendered student screens and the design system. Fetched the three official ielts.org format pages for the question-type taxonomy. Locked decisions D1–D13. | `MVP-1.md`, `PROJECT-MEMORY.md`, `CLAUDE.md` | Claude + goverdhan-gaur |

---

## 4. Decisions made during the build

Anything not already in `MVP-1.md` §3. Record **the choice, the reason, and the alternative rejected** — this is what stops a later agent re-litigating a settled question. Promote architectural entries to `docs/adr/`.

*Format:*

```
### YYYY-MM-DD — <short title>  (task: Mn-nn)
**Chose:** ...
**Because:** ...
**Rejected:** ... — because ...
**ADR:** docs/adr/NNNN-....md  (if architectural)
```

### 2026-09-17 — The first Owner is linked, not invented  (task: M1-02 bootstrap)
**Chose (user, 2026-09-17):** the user creates one auth user by hand in the Supabase
dashboard and gives us its uuid; a migration pins that uuid, and the **app** —
not the migration — collects the centre name and the owner's own details, on a
one-time `/setup` screen. Their words: *"let admin create every other thing like
branch and stuff and add name and info about himself."*

**Why it needs solving at all:** D9 says every account starts as an invitation,
and the permission matrix says nobody can be invited into the Owner role. The
first account therefore has no sender. Something has to break the loop.

**Why this is not a signup route:** `complete_first_run_setup` refuses any caller
but the pinned uuid, refuses outright once **any** user exists, takes an advisory
lock so two concurrent calls cannot both pass, and reads the email from
`auth.users` rather than from the form. The uuid in the migration is an
identifier, not a credential — it grants nothing without that account's password.

**Also:** no branch was ever seeded, and `users.branch_id` is `NOT NULL`, so
first-run creates the institute's first branch too.

### 2026-09-17 — Students get one session; staff get several  (task: M1-12)
**Chose (user, 2026-09-17):** a student signing in on a second machine ends the first
session — that is the account-sharing control MVP-1 §9 is after. Teachers,
invigilators, admins and the Owner may hold several: they do real work on a phone
and a laptop, and logging them out of one to use the other buys nothing, because
they are not the sharing risk. Everyone still gets the device list and Revoke.

**Design:** a JWT cannot express revocation, and ours is deliberately long-lived
so no refresh lands mid-test. So the `insignia_session` cookie carries a
`user_sessions.id` and `lib/auth/guard.ts` checks that row on every guarded page.

### 2026-09-17 — The invitation carries the person's name  (task: M1-02)
**Corrects `MVP-1.md` §6 and §9**, which define `invitations` with an email and
describe the admin as entering one. The built invite screen (M5-04, screen 22)
asks for a full name and phone, and it is right to: `users.name` is `NOT NULL`
and nobody else can supply it, the admin already knows it, and asking the student
for their own name adds typing to the one screen that must be effortless — and
lets a typo into the name staff later search by. Migration
`20260917101600_invitation_profile.sql` adds `name`, `phone`, `country_code`.

### 2026-09-17 — Resend connected to Supabase does not send our invitations  (task: M1-03)
**The user connected Resend to Supabase and reasonably expected that to cover
it.** It does not: that connection is **SMTP for Supabase Auth's own emails**
(confirmation, recovery, magic links). Our invitation carries a token from
`public.invitations` with a role, branch, batch and plan attached, and an admin
must be able to revoke it — none of which Supabase's built-in invite can express.
So we send it ourselves and need a `RESEND_API_KEY`.

**The silver lining:** that connection means a sending domain is probably already
DKIM-verified in Resend, which is the hard half of M1-04.

**Re-examined and confirmed by the user, 2026-09-17.** They asked the right
question — Supabase *can* send invitations (`auth.admin.inviteUserByEmail`, and
`[auth.email.template.invite]` exists in `config.toml`) — and then the better
follow-up: could `auth.admin.deleteUser` serve as "cancel"? It could, for a
pending invite. It was rejected on the cascade:

```
auth.users → public.users → attempts → answers, answer_marks,
                                        attempt_scores, attempt_events
```

all `ON DELETE CASCADE`. With Supabase's invite there is no `pending` state
distinct from `accepted`, so a cancel button would sit one stale page-load away
from destroying a student's entire exam history. Revoke is
`UPDATE … WHERE status = 'pending'` and **cannot** touch an accepted invitation.

Also lost with the built-in path: the three dead ends collapse into one (
cancelled, expired and never-existed become indistinguishable, which is most of
why `/invite/[token]` exists), the invitation record itself disappears, expiry
becomes a project-wide setting rather than 7 days per invitation (their
`otp_expiry` is 3600 — a Friday invite would be dead by Monday), and one
template for the whole project cannot name the branch.

**Correction to the first draft of this entry:** it said Supabase's built-in
invite "cannot carry" role/branch/batch/plan. Too strong — `app_metadata` could.
The real blockers are revocation and the prematurely-created account.

`deleteUser` is still the right tool in exactly two places: the rollback in
`acceptance.ts` (an account seconds old with no data), and M9-08's DPDP deletion
path, where destroying everything is the intent.

### 2026-09-17 — The lockout is interface-first; the Durable Object is deferred  (task: M1-09 / M1-10)
**Chose:** ship the *behaviour* BUILD-STEPS step 39 specifies — five wrong
passwords, a fifteen-minute lock, counted by account **and** IP — backed by
`public.rate_limits`, which M0-10 created as exactly this fallback. The Durable
Object is deferred to its own PR.

**Because:** OpenNext's generated `.open-next/worker.js` exports only its *own*
Durable Objects, so a custom one requires repointing wrangler's `main` at a
wrapper that re-exports it. That is a change to the build CI gates, and it does
not belong in the same review as the auth flow. `lib/auth/lockout.ts` is shaped
so the swap touches nothing else.

### 2026-09-17 — Server Actions live in `lib/actions/`  (task: M1-02)
`MVP-1.md` §15's tree predates having any. Kept out of the route folders so the
logic in `lib/auth/` stays unit-testable without a form, and because every export
from a `"use server"` module is a public endpoint — worth having them in one
place you can read end to end. Types go in `types.ts`, since such a module may
only export async functions.

### 2026-09-16 — Keep one Node unit-test runner  (task: M0-18)

**Chose:** Put scoring coverage in the existing `node:test` suite behind `npm run test:unit`.

**Because:** The repository and CI already have one dependency-free unit-test command, and the user explicitly confirmed that this project is not using Vitest.

**Rejected:** Adding Vitest for the scorer — it would duplicate the runner, configuration and dependency surface without adding needed coverage.

### 2026-09-16 — No PIN. Email and password only  (task: M1-08)

**The user's call, 2026-09-16:** *"i wont be using pin, i will be using email
and passwrd nly."*

This supersedes the PIN half of D9 (`MVP-1.md` §9) and both rendered auth
designs (`01 Login.dc.html`, `02 First Login PIN Change.dc.html`), which show
phone + PIN.

Dropped with it: the PIN fast path, device-secret binding, the five-wrong-PINs
device lock, and the "Set your PIN" step of invitation acceptance (M1-07).

Kept, and still worth building: the device list on Profile (M1-14 / M4-06). It
answers "is someone else in my account?", which is independent of how you sign
in.

**The trade-off, recorded because it will be felt in a lab:** the PIN existed
so a student could get back in quickly on a shared machine mid-session. With
passwords only that is more typing, on a keyboard some of these students are
slow with. Mitigate it with a long-lived "stay signed in" session cookie when
M1-12 lands, rather than by re-introducing a 4-digit secret.

`MVP-1.md` §9 and §17 are now wrong on this point. Correcting them is an open
doc task — `CLAUDE.md` says to fix `MVP-1.md` when it disagrees with reality.

Consequences already applied: `/login` and `/invite/[token]` built without a
PIN; Profile's "Change my PIN" is now "Change my password"; the student detail
screen's "Reset PIN" is now "Send a new invitation" (an admin should never set
a password they then have to read out loud); `PinInput` flagged unused in
`/dev/components`.

### 2026-09-16 — Staff routes are namespaced: `/admin/*` and `/teacher/*`  (task: M6-01)

`MVP-1.md` §15 gives both `(teacher)/batches` and `(admin)/batches`, and both
`(teacher)/results/[id]` and `(student)/results/[id]`. Route groups don't
create URL segments, so those are the **same URLs**. It shipped a real bug:
`/batches` rendered the Admin shell while `/batches/b-0`, linked from that very
list, rendered the Teacher one.

Roles can't pick a layout — a route group is chosen at build time, not per
user. So the staff areas now carry their prefix in the URL:
`/admin/overview`, `/teacher/dashboard`, and so on. Students keep the short
top-level paths (`/home`, `/tests`, `/attempt/[id]`) because they're the
majority and their URLs are the ones read aloud.

`MVP-1.md` §15's tree is now wrong on this point; correcting it is a doc task.
Verified after the move: 27 routes build, `/admin/batches` renders Admin and
`/teacher/batches/b-0` renders Teacher.

### 2026-09-16 — `Button asChild` was broken for every caller  (task: M5-02)

`Button` rendered `{loading && !asChild ? <Spinner/> : null}` beside
`{children}`. With `asChild`, Radix's `Slot` counts those as two children and
throws "Expected a single React element child" — so **every** `asChild` call
site 500'd. Nothing had used it until the admin screens needed link-shaped
buttons, so it had never fired.

Fixed by passing `children` alone when `asChild` is set. A link-shaped button
never shows a spinner anyway: navigation is the browser's job.

### 2026-09-16 — Student detail is a page, not a drawer  (task: M5-05)

`DESIGN-PROMPT.md` C3.23 calls for a drawer. Built as a route with its own URL
instead: staff open this screen in the middle of a support call and read the
link out or paste it to a colleague, and a drawer has no address. Content and
ordering are unchanged from the design — plan first, because that is what the
call is almost always about.

### 2026-09-16 — `PhoneInput` takes a `size`  (task: M5-04)

It hardcoded `h-primary` (56px, the student height) and omitted `size` from
its props. Staff type phone numbers too — on the invite form — where a 56px
field beside 40px ones reads as a mistake. `size` now matches `Input`'s, and
the `+91` chip follows the field's height. Default is still `student`, so
nothing already built changes.

### 2026-09-16 — Attempt HTML is sanitised on the server, not in the player  (task: M2-15 / M3-02)

`MVP-1.md` §8 rule 8 says sanitise on write *and* on render. Read literally
that puts `sanitizePassageHtml` inside the player — which is a client
component, so it would pull `unified` and three `rehype` packages into the
browser bundle, on the one screen with a ~200 KB budget (§4).

`lib/security/sanitize-attempt.ts` runs the same sanitiser once per request in
the server component that loads the attempt, and hands the player HTML that is
already clean. Same guarantee, no client cost. Everything downstream of that
call may be trusted; **nothing downstream may import the sanitiser** — wanting
to means the HTML took a path that skipped the call, and that is the bug.

Verified: `grep -rl rehypeSanitize .next/static` is empty after a production
build, and `npm run check:bundle` passes.

### 2026-09-16 — `AudioPlayer` gained a `night` surface  (task: M2-15)

The component was built on light tokens (`bg-bg`, `text-ink-2`) for the
practice layout and the gallery. Design 06 puts the mock player's audio on the
`--night` band, where those tokens render dark-on-dark — the Volume label was
invisible and the lock note became a white box.

`surface="night"` renders the compact band the design specifies: white play
button, translucent track, elapsed/total in mono, lock chip in white/10, and
**no volume slider**. In a lab the volume is on the machine, and an extra
control on a screen a student sees once is one they can get wrong under time
pressure. `surface="light"` is the default, so practice and `/dev/components`
are unchanged.

### 2026-09-16 — `BandTrendChart` takes gaps, and lays its end labels out  (task: M4-03)

The chart was built against a series where every skill has a point on every
date. Real students don't sit both skills on the same day, so one line was
being drawn straight across months it had skipped, and the two direct end
labels overlapped each other and the other line.

`BandPoint.band` is now `number | null`. A null is a gap: the line breaks
there, a lone point gets its own dot, and the x position still comes from the
shared date index so the two skills stay comparable. End labels are collected,
sorted by y and pushed apart to a minimum gap, then painted with a
surface-coloured halo so one stays readable where it crosses the other line.

Backward compatible — `number` is assignable to `number | null`, so
`/dev/components` renders exactly as before. Alternative rejected: a legend.
Direct labelling is a stated rule in `DESIGN-PROMPT.md` §A5.19, and a legend
costs the reader a lookup on the screen most likely to be read in a hurry.

### 2026-09-16 — Staff plan notes are not the student's to read  (task: M0-07 fix / §7 Q12)
**Chose (user, 2026-09-16):** the student sees every *fact* about their plan — name, start, expiry, quota, tests used, status — and none of the staff commentary. `student_plans.notes` is dropped; the note moves to `public.student_plan_notes` (`plan_id` PK, `body`, `updated_by`, timestamps) with the same RLS audience as `plan_history`: admins in the student's branch, and Owner. Migration `20260916125048_plan_notes.sql`.
**Because:** the column was granted to `authenticated` with the rest of the row, so anything the front desk typed was one screen away from the student — and in a coaching institute that field fills up with fee chasing, family circumstances and opinions. The old mitigation was a column comment asking staff to self-censor, which is not a control. Nothing had written a note yet (no UI, no importer), so there was no data to carry over.
**Rejected:** revoking just the `notes` column from `authenticated` (the `tests.r2_key_key` trick) — it would have forced the plans workqueue (M5-06) and the student drawer (M5-05) to read notes with the secret key, losing RLS branch-scoping for the whole query. A note thread instead of one row per plan — scope creep; the table can grow into one if M5-06 wants it.
**Teachers are excluded too** — they see the plan, not the note, matching `plan_history`. Widening later is a one-line policy change; narrowing after staff rely on it is not.

### 2026-09-16 — Passage HTML allowlist  (task: M0-13)
**Chose:** `PASSAGE_SCHEMA` in `lib/security/sanitize.ts` — text formatting, `h3`–`h5`, lists, blockquote, tables with merged cells, and `p data-label` (one or two capital letters) for paragraph letters. No links, images, ids, classes or styles. Parse → filter → re-serialise with unified/rehype (all pinned). Scripts, styles, iframes, svg, math etc. are dropped with their contents. Input capped at 200 000 characters.
**Because:** passages are the likeliest XSS vector (MVP-1 §8). Re-serialising a parsed tree neutralises parser-confusion tricks that string filters miss. Images in questions come from R2 assets (`image_label`, §10), so passages never need `<img>`; paragraph letters are the only attribute IELTS passages need. ~1 ms per long passage, so sanitising on render as well as on write is affordable within the 10 ms CPU budget.
**Rejected:** DOMPurify (needs a DOM; heavier on Workers). Allowing `<a>` — no passage needs a link, and links are a phishing surface.
**For M0-16:** the upload schema should express paragraph letters as `data-label`.

### 2026-09-15 — Nonce CSP for scripts, inline allowed for styles, every page dynamic  (task: M0-13)
**Chose (user, 2026-09-15):** the spec's nonce policy. Scripts: `'self' 'nonce-…' 'strict-dynamic'`, no `'unsafe-inline'`/`'unsafe-eval'` in production. Styles: `'self' 'unsafe-inline'`. `connect-src 'self'` (the browser never talks to Supabase). Root layout awaits `connection()` so every page renders per request.
**Because:** the XSS risk this product actually has is teacher-authored passage HTML; blocking any script without the nonce defeats it even if sanitising misses something. Styles can't carry a nonce on `style=""` attributes (progress bars) or the toast library's injected `<style>`, and CSS can't execute code. Nonces only work on per-request pages — and nearly every page here is per-user anyway.
**Rejected:** fixed headers with `'unsafe-inline'` scripts — an injected script would run. Nonce styles too — would break two components and the toaster for little gain. SRI hash CSP — experimental in Next and can't cover dynamic inline scripts.
**Costs accepted:** OpenNext labels proxy support "experimental" (§5); every page view now runs the Worker (CPU vs the 10 ms free limit — measure).

### 2026-09-15 — Owner and Admin; the permission matrix  (task: step 22 / M1-13)
**Chose (user, 2026-09-15):** keep two top roles, shown as **Owner** (`super_admin`) and **Admin**. The Owner is the only one who can add or remove admins and change roles; Admins run students, plans, batches and staff for their branch. Teachers draft tests; only Admins and the Owner publish. Seeded matrix (permission → scope):

| Permission | Student | Invigilator | Teacher | Admin | Owner |
|---|---|---|---|---|---|
| `attempt:take` | own | | | | |
| `session:invigilate` | | branch | batch | branch | all |
| `assignment:manage`, `results:release`, `mark:override` | | | batch | branch | all |
| `test:author` | | | own | all | all |
| `test:publish`, `band_scale:edit` | | | | all | all |
| `student:manage`, `staff:manage`, `audit:read` | | | | branch | all |
| `admin:manage`, `role:change` | | | | | all |

**Because:** the user's institute has office staff doing admin work, and only the owner should be able to hand out power. Renaming the display name (not the key) avoids rewriting 25 policies that test `'super_admin'`.
**Rejected:** merging into one Admin role — any admin could create more admins. Renaming the key to `owner` — churn in every policy for a label.
**Design:** permissions are data (`roles.permissions`, `CHECK`-validated); `lib/permissions.ts` is the vocabulary and pure logic; `lib/rbac.ts` resolves the actor with the secret-key client so the second gate doesn't inherit an RLS mistake. Nobody can invite or be assigned Owner through the app.

### 2026-09-15 — No browser Supabase client; publishable/secret key names  (task: step 21 / M0-05)
**Chose:** `lib/supabase/server.ts` (user-scoped, RLS) and `admin.ts` (secret key), both `server-only`; **no `client.ts`**. Env names `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY` instead of `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`. All three packages pinned exactly (`@supabase/supabase-js` 2.116.0, `@supabase/ssr` 0.12.7, `server-only` 0.0.1).
**Because:** the spec already has the browser never talking to Supabase Auth, content rendered server-side, and no Realtime (§4 free-plan budget). A browser client would need the session outside httpOnly cookies and add `supabase-js` to the student bundle (~200 KB budget) for no feature. Supabase's current key model is publishable/secret; Auth IP forwarding (the lab-login fix in `MVP-1.md` §4) only works with a secret key.
**Rejected:** `client.ts` "for later" — add it the day a feature needs it, with its own review.
**Open for M1-12:** Supabase's Next.js guide refreshes sessions in a `proxy.ts`; Next 16 proxy runs on the Node runtime, which OpenNext on Workers may not support. Our design (JWT longer than a test, refresh in Server Actions/Route Handlers) may not need it — decide there.

### 2026-09-15 — "Below 4" is a marker, not a number  (task: M0-19)
**Chose:** the user's charts end in "Below 4"; the user chose to show exactly that. A scale's lowest row has `band` NULL; a score stores `below_band` (the scale's lowest band, e.g. 4.0) instead of `band` — exactly one of the two, by `CHECK`. The UI shows `band` or "Below {below_band}"; averages use `band` only.
**Because:** storing 0 (or an invented 3.5) would misreport the student and drag every batch average down.
**Rejected:** finer bands below 4 — no source data from the institute. A text `label` column — a second way to express the same fact.
**Source of the defaults:** the institute's Listening, Academic Reading and GT Reading charts, supplied by the user on 2026-09-15. They replace the spec's "verify against a current Cambridge book" — staff can still edit scales, and an assignment can pick another.

### 2026-09-15 — Audit trails keep actor ids without foreign keys  (task: M0-10)
**Chose:** `audit_log.actor_id` has no FK, and M0-10 drops the FK on `plan_history.actor_id`. `audit_log` gains `branch_id` for the admin policy. `rate_limits` is RLS-on with no policy and no grants.
**Because:** an append-only table can't take `ON DELETE SET NULL` — that's an UPDATE the trigger refuses — so erasing any staff user who had acted would fail (found by the harness while writing M0-10; M0-07 had shipped with it). And the trail should keep the actor's id after erasure anyway. `rate_limits` keys contain IPs.
**Rejected:** a trigger exception for FK-driven updates — it would let the trail be rewritten. `ON DELETE CASCADE` — erasing a person would delete the evidence of what they did.
**Open for M9-08:** `invitations.invited_by` is `NOT NULL` with a no-action FK, so a staff user who sent invites can't be erased yet — decide at the erasure-path task.

### 2026-09-15 — Assessment: correctness and scores in their own tables; the DB enforces §7  (task: M0-09)
**Chose:** (1) `answers` holds only the student's input; `is_correct`/`marks_awarded`/`question_type`/overrides move to **`answer_marks`**, and `raw_score`/`band`/`section_scores` to **`attempt_scores`**. Their policies show a student a row only when the attempt is finished and the release gate is open (`answer_marks` also needs `allow_review`); practice at once; staff in scope always. (2) Triggers enforce §7 in the database: `expires_at`/`started_at`/`kind`/`content_version`/`status` set at insert from the test (caller input ignored); an assignment must be for that test and target that student; state machine; `expires_at` only grows, only while open; answers writable only while open and before `expires_at` **for every role**; `revision` must rise; `q_number` within the test. (3) Students write their own answers through RLS (insert/update policies + column grants) — the one place the API allows writes — so a server bug still can't write into another student's attempt. (4) One open attempt per student per test. (5) `answers` PK is (`attempt_id`, `q_number`), no surrogate id — leaner rows for the 500 MB budget.
**Because:** RLS filters rows, not columns — correctness on the same row as the student's own answer can't be hidden from them while they need to read that row mid-test. The spec asks for the gate "in the route **and** in RLS"; splitting the tables is how RLS can do it. Putting the clock and state rules in triggers means even service-role code can't break them.
**Rejected:** column grants + a SECURITY DEFINER view or RPC for students — views bypass RLS (advisor error), and it scatters the gate. Keeping answers writes server-only — loses the second gate on the highest-volume write.
**Known edge:** an autosave that reaches the DB after `expires_at` is refused; the student can lose the last few seconds before expiry. Revisit with a small grace at M2-08 if it bites.

### 2026-09-15 — Content: shared test library, hidden R2 paths, four schema additions  (task: M0-08)
**Chose:** (1) Tests are a **shared library** — admins in any branch see every test; `MVP-1.md` §13 said "own branch" but `tests` has no branch and content isn't personal data. (2) Students see published practice sets, plus mock/class tests only when assigned to them — still visible once archived, so past results keep their titles. (3) `r2_*` columns withheld from `authenticated` (column grants); only service-role server code reads them. (4) Schema additions: `band_scales.variant`, `assignments.branch_id`, `assignment_targets.batch_id | student_id` (real FKs instead of a polymorphic pair), `assignment_unlocks.extra_attempts`. (5) `practice_question_type` is format-checked only; `lib/question-types.ts` stays the single source of truth. (6) Non-overlapping band ranges enforced by an exclusion constraint (`btree_gist`, in `extensions`).
**Because:** Academic and GT reading have different conversion ladders; admin branch scoping needs a branch; FKs keep targets honest; a retake needs somewhere to record the extra attempt; overlapping band rows would silently mis-score.
**Rejected:** a DB `CHECK` listing all 18 question types — a second source of truth. A trigger for band overlaps — racy and longer than one constraint.
**Still to do in M0-09:** once `attempts` exists, let a student read any test they have an attempt for, whatever its assignment state.

### 2026-09-15 — Cohorts: helper functions for every cross-table check; teachers see *current* students only  (task: M0-07)
**Chose:** (1) Every policy that depends on another RLS table calls a `private` SECURITY DEFINER helper (`in_batch`, `teaches_batch`, `batch_in_my_branch`, `plan_in_my_branch`, `is_teacher_of`) instead of a subquery. (2) A teacher sees a student only while that student is *currently* in one of their batches (`left_at is null`); they still see the batch's membership rows, including who left. (3) Students see their own batch and their own membership rows — never classmates, never teacher assignments. (4) `plan_history` is staff-only and append-only (UPDATE trigger), but deletable by cascade for DPDP erasure. (5) At most one `active` plan per student. (6) One SELECT policy per table, conditions OR-ed — M0-06's 2–3 per table folded.
**Because:** `batches` ↔ `batch_students` policies querying each other recurse ("infinite recursion detected in policy"); helpers bypass RLS for the lookup and only ever answer about `auth.uid()`. Current-students-only keeps a student's data away from a teacher once they move batch. One policy per table clears the advisor's `multiple_permissive_policies` warning.
**Rejected:** subqueries in policies — recursion. A teacher → all-time students rule — broader than the job needs; revisit in M6 if teachers need past results.

### 2026-09-15 — Identity access model: helpers in `private`, read-only API, column grants  (task: M0-06)
**Chose:** (1) RLS helpers as `SECURITY DEFINER` SQL functions in a new `private` schema (not in the API's exposed schemas); `EXECUTE` revoked from `PUBLIC`, granted to `authenticated` + `service_role` so policies can call them. (2) Every identity table: `revoke all from anon, authenticated`, then `SELECT` only, column-limited where secrets live — `pin_hash`, `device_secret_hash`, `token_hash` are never granted. (3) **No write policies at all** on identity tables: every write is server code with the service role, behind `lib/rbac.ts`, audit-logged. (4) `alter default privileges … in schema public revoke all on tables/sequences from anon`, so a future table can't leak to `anon` by omission. (5) Teacher → students-in-own-batches policy moves to M0-07 with the batch tables; invigilator visibility with M7. (6) One-active-session is not a DB unique index — it can't be scoped to students only — so M1-12 enforces it in code.
**Because:** a student can pull their own JWT from devtools and call the Data API directly, so RLS alone isn't enough — column grants stop them reading hashes even on their own rows. Read-only-through-API is the smallest attack surface; identity writes are rare and privileged. `auth` is locked (§5).
**Rejected:** helpers in `auth` — impossible now. Per-column write grants + guard triggers for admin edits — complex and easy to get wrong; revisit if admins need direct edits. Revoking `EXECUTE` on functions from `PUBLIC` by default for role `postgres` — would silently break functions from extensions created later; revoke per function instead. Per-schema default revoke of function `EXECUTE` from `anon` — ineffective, because `PUBLIC`'s global default still grants it.
**Correction applied:** `MVP-1.md` §13 (helper location, new "Grants are a gate too", teacher row note). `BUILD-STEPS.md` steps 14–15 table, workflow note, step 19.

### 2026-09-15 — Stay on Supabase Free; design for 200 students at once  (task: cross-cutting)
**Chose:** the user's constraint — 200 concurrent test-takers, Supabase Free only. Design rules in `MVP-1.md` §4 "Free plans, 200 students at once": no Supabase Realtime (live monitor polls every 10 s); autosave on change + 30 s heartbeat instead of a fixed 10 s timer; students never hold a DB connection; raised Auth sign-in limit + IP forwarding + JWT longer than a test + local `getClaims()`; audio 48–64 kbps mono, preloaded on a pre-test screen that opens early; nightly `db dump` to R2 (Free has no backups); load test at 200 on a throwaway free project.
**Because:** the Realtime table the user pasted is the wrong worry — students don't need Realtime. The real limits are Auth's per-IP sign-in/refresh limits (a lab shares one IP), the lab's own bandwidth, no backups, pausing after a quiet week, the 500 MB cap, and Cloudflare Workers Free's 100k requests/day (a 10 s autosave alone uses ~75k for one 200-student hour).
**Rejected:** Supabase Realtime for the monitor — spends quota for no gain at 2–3 staff viewers. Paid plans — excluded by the user for Supabase; Workers Paid ($5/mo) held in reserve pending Q11 and the load test.
**Amended same day, after Q11 = Workers Free:** heartbeat 60 s (was 30 s), reset by any save — brings a 60-min test to ~120 Worker requests per student. The Durable Object limiter covers login/PIN/invite/MCP only and keeps counts in memory (DO free quota: 100k requests and 100k rows written a day). Bundle limit corrected: 64 MiB uncompressed, no compressed limit.
**Correction applied:** `MVP-1.md` §3 D4, §4 (stack row + new budget subsection), §5 diagram (Realtime removed), §7 answers-in-flight, §8 session row, §12 download + encoding, §18 M7-01/M9-05/M9-06, §20 risks. `BUILD-STEPS.md` steps 39, 40, 43, 45, 85, 99, 100.

### 2026-09-15 — Three test pools; result release chosen per assignment  (task: step 1 / Q1–Q3)
**Chose:** `tests.kind` (`mock`|`class`|`practice`) — each test is in exactly one pool; practice tests carry `practice_question_type`. `assignments.results_release` (`immediate`|`scheduled`|`manual`, default `manual`) + `results_released_at timestamptz`. The release gate is `results_release = 'immediate' OR results_released_at <= now()`, evaluated in Postgres.
**Because:** the user's answers to Q1–Q3. One timestamp column covers both scheduled and manual release: scheduled sets it in the future, manual sets it to `now()` on click, and "release now" on a scheduled one just moves it. The server clock decides, so there's no cron job and no client clock involved (rule #9).
**Rejected:** `tests.usage_policy` (`mock_only`|`practice_ok`|`both`) — the pools never overlap, so a policy is unneeded. `assignments.mode` — duplicated `tests.kind`. A `results_released bool` plus a cron job to flip it on schedule — one more moving part that can fail silently.
**Correction applied:** `MVP-1.md` §1 product line, §3 D5, §6 (`tests`, `assignments`, `attempts`), §7, §11 upload JSON, §12 purge, §14 transcript gate, §15 audio row, §18 M2-18/M4-04/M6-03/M6-04, §20 risk row. `BUILD-STEPS.md` step 1.

### 2026-09-15 — No ORM: `supabase-js` + generated types + Postgres functions  (task: M0-05)
**Chose:** every query goes through `@supabase/ssr` / `supabase-js`, typed by `supabase gen types` (`src/lib/supabase/database.types.ts`). Anything needing a transaction (attempt submit) or heavy SQL (teacher analytics) is a Postgres function, written in a migration and called with `.rpc()`. These are `SECURITY INVOKER` unless there's a written reason otherwise. `supabase/migrations/` is the only schema source.
**Because:** (1) Drizzle connects straight to Postgres as a privileged role, so **RLS does not apply to its queries**. That silently removes one of the two gates non-negotiable #4 depends on, and making Drizzle honour RLS means setting role + JWT claims per transaction, where one omission leaks data. `supabase-js` always carries the user's JWT, so RLS always applies. (2) `db/schema.ts` would duplicate the SQL migrations and drift from them. (3) A TCP Postgres connection from a Worker needs Hyperdrive or the Supabase pooler sized for 40 concurrent students; `supabase-js` is plain HTTPS. (4) Everything Drizzle offered is already covered: types (generated), transactions (Postgres functions), parameterisation (`supabase-js` and `.rpc()` never concatenate).
**Rejected:** Drizzle ORM (MVP-1 §4 "typed SQL for admin + analytics") — for the reasons above. Kysely or raw `postgres.js` — same direct-connection RLS bypass.
**Trade-off accepted:** transactional logic lives in SQL (plpgsql), not TypeScript. Scoring stays in `lib/scoring.ts`; the function only persists its results atomically.
**Correction applied:** `MVP-1.md` §4 (supporting libraries), §8 (SQL-injection control), §15 (repo tree: `src/db/` removed, `lib/supabase/database.types.ts` added), §16 (generated types), §18 (M0-05). `BUILD-STEPS.md` steps 13, 14–18 and 43. `Design files/TECH-STACK.md` still lists Drizzle — it's a source input, superseded here like D9 supersedes its §3.
**ADR:** to be written at M0-21 — `docs/adr/` doesn't exist yet.

### 2026-09-15 — shadcn's semantic colours are aliases, not a second palette  (task: M0-03)
**Chose:** `--primary`, `--border`, `--muted-foreground` … are defined in `globals.css` as `var()` references to our tokens, and every component was *also* rewritten to use the token names directly.
**Because:** `--color-*: initial` deletes Tailwind's palette, so any shadcn class we missed would compile to nothing — an invisible control. The aliases make the failure mode "slightly wrong shade" instead. Rewriting the components means the aliases are a safety net, not the design.
**Rejected:** aliases only (restyle by variable) — shadcn's defaults (36px buttons, 14px text, shadowed cards) are wrong in size and shape, not just colour. Rewrite only, no aliases — a missed class fails silently.

### 2026-09-15 — Button and Input sizes are named for audiences  (task: M0-03)
**Chose:** `size="student"` (56px), `"modal"` (48px), `"admin"` (40px) instead of shadcn's `sm`/`default`/`lg`.
**Because:** the height is a usability rule (MVP-1 §15, CLAUDE.md design rule), not a taste. `size="student"` makes a 40px button on a student screen visibly wrong in code review.
**Rejected:** t-shirt sizes — nothing stops `size="sm"` landing on the student side.

### 2026-09-15 — Toaster without `next-themes`, glyphs not icons  (task: M0-03)
**Chose:** the toast is always dark (`bg-ink`), with ✓ ! ✕ i glyphs; `next-themes` uninstalled.
**Because:** the design shows the toast dark in both themes, and dark mode here is an opt-in `data-theme` attribute, not a `next-themes` provider. The glyphs match the banners.
**Rejected:** shadcn's `useTheme()` version — adds a provider and dependency for a theme switch the app doesn't have.

### 2026-09-15 — `components.json` hand-written; `shadcn init` never run  (task: M0-03)
**Chose:** write `components.json` directly, then `shadcn add`.
**Because:** `init` rewrites `globals.css` and `src/lib/utils.ts`, both hand-tuned in M0-02. Verified afterwards: neither file was touched by `add`.

### 2026-09-15 — Design-system components split: custom now, generic primitives from shadcn  (task: M0-02 / M0-03)
**Chose:** hand-build only what shadcn lacks (timer, navigator, answer widgets, audio, band score, difficulty, pills, banner, charts, nav, PIN). Button, Input, Card, Checkbox, Table, Dialog, Toast, Skeleton, Badge come from shadcn in M0-03, restyled to the tokens. Custom files avoid shadcn's names (`staff-sidebar` not `sidebar`, `band-trend-chart` not `chart`, `banner` not `alert`).
**Because:** the user sequenced M0-03 straight after; hand-building a Button now would be thrown away when shadcn generates its own.
**Rejected:** building all primitives by hand — duplicate work, and shadcn components that import `buttonVariants` would break against a non-shadcn Button.

### 2026-09-15 — Charts are hand-rolled SVG, not Recharts  (task: M0-02)
**Chose:** `band-trend-chart.tsx` (SVG) and `accuracy-bars.tsx` (divs).
**Because:** both render on students' phones and the player bundle budget is ~200 KB gzipped (MVP-1 §4); the designs are simple enough not to need a library.
**Rejected:** Recharts (listed in MVP-1 §4) — revisit only if teacher analytics (M6-06) genuinely needs interactive charts.

### 2026-09-15 — Mock-mode audio can start but not pause  (task: M0-02)
**Chose:** in mock mode the play button starts playback and then disables.
**Because:** PLAN.md §4 — "audio plays once, straight through, no pause/rewind". Screen 06's prototype shows a play/pause toggle, but the stated rule wins.

### 2026-09-15 — App code lives under `src/`  (task: M0-01)
**Chose:** the `src/` layout the OpenNext scaffold generated — `src/app`, `src/components`, `src/lib`, ~~`src/db`~~ (dropped 2026-09-15 with Drizzle — see "No ORM" above). The `@/*` alias resolves to `./src/*`, so imports read `@/lib/scoring`. Tooling that CLIs expect at the root stays there: `supabase/`, `mcp/`, `scripts/`, `docs/`.
**Because:** it's what the scaffold produced, it's a standard Next.js layout, and it separates app code from config/tooling cleanly.
**Rejected:** moving everything back to a root `app/` to match the original `MVP-1.md` tree — churn for no benefit.
**Correction applied:** `MVP-1.md` §15 repo tree updated. Paths elsewhere in `MVP-1.md` written as `lib/…` mean `src/lib/…`.

---

## 5. Gotchas and learned constraints

Things that cost an hour and would cost the next agent the same hour. Add as you hit them.

### Known before starting

| Area | Constraint |
|---|---|
| **Supabase region** | Chosen at project creation, **cannot be changed** without a full migration. Must be `ap-south-1` (Mumbai). |
| **Tailwind v4** | CSS-first `@theme`. The `tailwind.config.js` block printed in `00 Design System.dc.html` is v3 syntax — the *values* carry over, the mechanism does not. |
| **Vercel Hobby** | Terms bar commercial use, and a paid coaching institute is commercial. Cloudflare Workers instead. |
| **`@vercel/*` packages** | Avoid entirely — they weld the app to one host. Node-runtime middleware is also unsupported on Workers. |
| **Worker size** | ~~10 MB compressed limit~~ — superseded 2026-09-15: Cloudflare now limits **64 MiB uncompressed** on Free and Paid, with **no compressed limit**. The app is 4.5 MiB. |
| **SMS in India** | Requires DLT registration with a telecom operator — weeks of approvals. We avoid SMS entirely (D9 uses email). WhatsApp Business API if reminders are ever needed. |
| **Timezones** | Store UTC in Postgres, render `Asia/Kolkata` everywhere. Never `new Date()` on the client for scheduling. |
| **Test devices** | The player must work on a four-year-old mid-range Android, not your laptop. Budget ~200 KB gzipped. |
| **Official GT question list** | Omits Yes/No/Not Given and Matching sentence endings. That is what ielts.org says — not a transcription error. Don't "fix" it. |
| **Source papers never enter this repository** | The GitHub repository is **public**. A source paper, its MP3 and the upload JSON the converter writes all carry the answer key (MVP-1 §7), so `Sample test/` is gitignored and the CLI takes the paper via `--source`. `ielts-data.js` stays placeholder content for the design screens — do not paste a real key into it. |
| **Listening Sample Test 1 answers are unverified** | `Sample test/Listening - 1.docx` has the 40 questions but **no answer key**; the 40 answers in the source paper were derived from the recording by an agent, not read off a key. Lowest confidence: the Q17-20 matching bank, and the spelling of the proper nouns at Q6-8 — check those against the recording first. (Deliberately not quoted here: this file is public.) A teacher must check every one before this test leaves `draft`. Both Reading papers in the same folder **do** ship authoritative 1-40 keys. |

### Discovered during the build

| Area | Constraint | Found |
|---|---|---|
| **`next lint` is gone in Next 16** | `next lint` no longer exists — it misreads `lint` as a directory name and fails. The script is now `"lint": "eslint ."`. **Resolved 2026-09-15.** | M0-01 |
| **`FlatCompat` breaks with `eslint-config-next` 16** | The scaffolded `eslint.config.mjs` wraps `next/core-web-vitals` in `FlatCompat`, which crashes with *"Converting circular structure to JSON"*. v16 ships native flat configs — import them directly (verified both load as arrays): `import nextVitals from "eslint-config-next/core-web-vitals"`, `import nextTs from "eslint-config-next/typescript"`, then `export default [...nextVitals, ...nextTs, { ignores: [".next/**", ".open-next/**", "cloudflare-env.d.ts"] }]`. Drop the `@eslint/eslintrc` devDependency afterwards. **Resolved 2026-09-15** — also ignores `Design files/**`, whose prototype JS otherwise fails lint with 2 errors. | M0-01 |
| **`create-cloudflare` assigns a random worker name** | It named the worker `muddy-truth-1a57`. The name appears in **three** places — `package.json`, `wrangler.jsonc` `name`, and `wrangler.jsonc` `services[0].service` (OpenNext's self-reference binding). The last one **must equal the worker name** or caching breaks. Rename all three together, before the first deploy. If it's already been deployed under the random name, the old worker lingers — delete it from the dashboard. **Resolved 2026-09-15** (→ `insignia-test`). `package-lock.json` picked up the new name on the M0-02 `npm install`. One stale copy remains in a comment in `cloudflare-env.d.ts` — clears on the next `npm run cf-typegen`. | M0-01 |
| **Binding types file renamed** | The OpenNext scaffold generates `cloudflare-env.d.ts` via `npm run cf-typegen`, replacing the vinext-era `worker-configuration.d.ts`. Re-run `cf-typegen` after adding any binding (R2 at M0-12). | M0-01 |
| **tailwind-merge silently drops our font sizes** | Plain `twMerge("text-body text-ink")` returns `"text-ink"` — it can't tell custom sizes from colours. `cn()` in `src/lib/utils.ts` registers every token family. **Add any new token there too**, or merges will quietly lose classes. | M0-02 |
| **Off-system classes fail silently** | The default palette/type scale are reset in `globals.css`, so `bg-blue-500` or `text-sm` compile to *nothing* — no error. To check a class exists, grep the built CSS in `.next/static/chunks/*.css`. | M0-02 |
| **Headless Chrome screenshots** | `#anchor` URLs render blank and `sips --cropOffset` is ignored. To capture part of a long page, wrap it in a scratch HTML `<iframe>` with a negative `margin-top`. | M0-02 |
| **Workers Builds needs OpenNext's own build command** | Cloudflare's Git auto-deploy defaults its build step to `npm run build`, which here is plain `next build` — it produces `.next/` but not `.open-next/`. The deploy step then fails with *"Could not find compiled Open Next config, did you run the build command?"* because it requires `.open-next/.build/open-next.config.edge.mjs`, which **only** `opennextjs-cloudflare build` creates. **Fix (dashboard → the Worker → Settings → Builds → Build configuration):** Build command `npx opennextjs-cloudflare build` · Deploy command `npx opennextjs-cloudflare deploy`. **Resolved 2026-09-15** by the user in the dashboard. | M0-01 |
| **⚠️ Never set `"build": "opennextjs-cloudflare build"`** | It's the obvious-looking fix and it's wrong. `opennextjs-cloudflare build` internally runs `npm run build` to do the Next.js compile (`@opennextjs/aws/dist/build/buildNextApp.js`), so pointing the `build` script at it recurses forever. Keep `"build": "next build"`; put the OpenNext command in the dashboard. | M0-01 |
| **Workers Builds: config name must match the connected Worker** | Workers Builds deploys to the Worker the repo is connected to in the dashboard, and the `name` in `wrangler.jsonc` must match it. The repo now says `insignia-test`. If the dashboard Worker is still `muddy-truth-1a57` (the name when Git was first connected), the build will fail on a name mismatch *after* the command fix — rename the Worker in the dashboard to `insignia-test`, or connect the repo to a new `insignia-test` Worker and delete the old one. *Not verified from here — the Cloudflare connector wasn't connected this session.* | M0-01 |
| **`npm run start` doesn't exercise the Worker** | It runs plain `next start` on Node. To test on the actual Cloudflare runtime locally, use `npm run preview`. | M0-01 |
| **`shadcn add` imported `cn` from an npm package called `cn`** | With a hand-written `components.json`, it generated `import { cn } from "cn"` and installed the unrelated `cn@0.3.0` — silently bypassing our token-aware `cn()`. It also used `class-variance-authority` and `lucide-react` without declaring them (they resolved transitively). **After any `shadcn add`:** `grep -rn 'from "cn"' src/`, and check `package.json` for what the new file imports. | M0-03 |
| **`outline-none` deletes the focus ring** | In Tailwind v4 `outline-none` is `outline-style: none` in the utilities layer, which beats the global `:focus-visible` rule in the base layer. shadcn puts it on every control. Never use it on a focusable control; the global rule draws the ring. | M0-03 |
| **A bare `border` draws near-black** | Tailwind v4's default border colour is `currentColor`. Always pair `border` with `border-line` (or another token). | M0-03 |
| **Don't `shadcn add --overwrite` an existing primitive** | It restores shadcn's defaults over the restyle. See `src/components/ui/README.md`. | M0-03 |
| **`next dev` writes to `CLAUDE.md`** | Next 16 appends a `<!-- BEGIN:nextjs-agent-rules -->` block to `CLAUDE.md` whenever it detects an AI agent running `next dev` (`node_modules/next/dist/server/lib/generate-agent-files.js`, no opt-out). It will show up as an uncommitted change after any agent session that ran the dev server. It was reverted this session pending the user's call — commit it once to stop the churn, or keep reverting. | M0-03 |
| **Check the Supabase region by reading it back** | The first project landed in `ap-northeast-2` (Seoul) despite the plan saying Mumbai — the dashboard's region picker is easy to get wrong. `list_projects` over the Supabase MCP returns `region`; read it, don't assume. **Resolved 2026-09-15** (recreated in `ap-south-1`). | M0-04 |
| **`public.rls_auto_enable()` comes with the project** | Enabling "auto-enable RLS" at creation installs an `ensure_rls` event trigger → `public.rls_auto_enable()` (`SECURITY DEFINER`, owner `postgres`). It turns RLS on for every `CREATE TABLE` in `public` — **it adds no policies**, so a table with no policy is simply unreadable through the API, which is the default-deny we want. The function being `EXECUTE`-able by `anon`/`authenticated` trips advisor lints 0028/0029; `20260915090941_harden_rls_auto_enable.sql` revokes it. Until that migration is pushed, the advisor keeps showing both warnings. Don't drop the function or trigger. | M0-04 |
| **Supabase MCP is wired in `.mcp.json`** | The untracked `.mcp.json` noted in the second-session handoff is the user's Supabase MCP config (gitignored, holds no secret). It can list projects, read schema/advisors and run read-only SQL. The agent permission policy blocks `apply_migration` and reads of `auth.users` rows — schema changes go through migration files + `supabase db push`. | M0-04 |
| **Supabase Free limits that matter (checked in Supabase docs 2026-09-15)** | Nano compute: shared CPU, 0.5 GB RAM, 60 direct / 200 pooled connections, 500 MB DB. **No backups** (Supabase says: `db dump` yourself). **Paused after ~7 days of low activity**; restorable for 90 days. Auth `/auth/v1/token` — used by **password sign-in and refresh** — is limited per IP (bursts of 30, 1800/hour); the sign-in limit is configurable under Authentication → Rate Limits; `Sb-Forwarded-For` (secret key only, must be enabled) makes limits per real client. Over-quota projects get HTTP 402 restrictions, paused ones 540. | cross-cutting |
| **Cloudflare Workers Free limits (checked in Cloudflare docs 2026-09-15; the account is on Free)** | 100,000 Worker requests/day, reset at midnight UTC = **05:30 IST**; over it, error 1027 (or "fail open", useless here — there's no origin behind the Worker). 10 ms CPU per request, "some built-in flexibility" for infrequent overruns. 128 MB memory, 50 subrequests per request. **Static-asset requests are free and unlimited** and don't count — but with `run_worker_first` matching paths always invoke the Worker and get 429 once over the cap. Durable Objects (SQLite backend only): 100,000 requests, 13,000 GB-s, 5M rows read, 100,000 rows written per day. | cross-cutting |
| **⚠️ RLS helpers can't live in the `auth` schema** | `MVP-1.md` §13 says `auth_role()`, `is_teacher_of()` etc. are `SECURITY DEFINER` functions "in the `auth` schema". On this project `auth` is owned by `supabase_admin` and `postgres` has **no CREATE** on it (checked 2026-09-15) — Supabase locked down `auth` for user objects. A migration creating them there will fail. Put them in a non-exposed schema (e.g. `private` — not in `config.toml` `[api] schemas`, so PostgREST can't call them). **Resolved 2026-09-15** — `private` schema, M0-06; §13 and step 19 corrected. | M0-05 |
| **Append-only tables can't have `ON DELETE SET NULL` foreign keys** | The FK action is an UPDATE, and the `forbid_update` trigger refuses it, so the *parent's* delete fails. Hit in `plan_history.actor_id` (fixed in M0-10). Audit-style tables keep ids without FKs. | M0-10 |
| **Supabase grants every new `public` table to `anon` and `authenticated`** | The live project's `pg_default_acl` gives `anon`, `authenticated`, `service_role` full rights (`arwdDxtm`) on new tables, sequences and functions in `public`. RLS still filters rows, but grants are the other gate: every migration must `revoke all … from anon, authenticated` and grant back explicitly. M0-06 also revokes the table/sequence defaults for `anon`. | M0-06 |
| **Column grants make `select *` fail** | With column-limited `SELECT` (e.g. `user_devices` without `pin_hash`), `select *` — and supabase-js `.select()` with no column list — returns *permission denied*, not partial rows. Always name columns in queries on `user_devices` and `invitations`. | M0-06 |
| **Function `EXECUTE` defaults to `PUBLIC`** | Postgres grants `EXECUTE` on every new function to `PUBLIC`, and a per-schema `alter default privileges … revoke … from anon` can't undo that (global defaults win). Revoke from `public` on each function you create, then grant to the roles that need it. RLS helpers need `EXECUTE` for `authenticated`, because policy expressions run as the caller. | M0-06 |
| **⚠️ iCloud Drive makes " 2" duplicate files** | *(update 2026-09-16)* iCloud also **resurrected a deleted file** as `src/proxy 2.ts` (the old probe) — outside the build folders, where it could have been committed or compiled. Cleaned at the user's request: that file plus 86 build-folder copies; `.git` and `node_modules` had none; no copy has ever been committed. Check with `find . -path ./node_modules -prune -o -name '* [0-9]*' -print`. Moving the repo out of iCloud Drive remains the real fix. |
| ~~**⚠️ iCloud Drive makes " 2" duplicate files**~~ | The repo lives in iCloud Drive. iCloud creates conflict copies named `file 2` — seen: `.gitignore 2` (an old vinext-era copy), and 38 duplicates in `.next/` plus 9 in `.open-next/`. The `.next/types/* 2.ts` copies **break `tsc`** ("Duplicate identifier"). Fix: `find .next .open-next -depth -name "* 2*" -exec rm -rf {} +` (build output, regenerated). `.git/` was clean when checked, but git inside iCloud risks corruption. **Recommendation to the user: move the repo out of iCloud Drive** (e.g. `~/code/`). | M0-06 |
| **Postgres cuts identifiers at 63 characters** | A policy name longer than 63 bytes is silently truncated (a NOTICE, not an error) — the live `tests` policy is named `Read: assigned, practice or sat (students), published + own (st`. `drop policy` with the full long name still works because it's truncated the same way. Keep policy names under 63 characters. | M0-11 |
| **`public/_headers` already existed** | OpenNext's template ships it with `Cache-Control: public,max-age=31536000,immutable` for `/_next/static/*`. It was nearly overwritten in M0-13 (caught from the Write result, restored). A unit test now asserts the cache rule stays. Read before writing any scaffold file. | M0-13 |
| **Branches get Cloudflare preview builds automatically** | Workers Builds builds every pushed branch (non-production builds are on) with a preview deploy: the GitHub check "Workers Builds: insignia-test" gives a per-version URL (`https://<version8>-insignia-test.yellow-moon-d66b.workers.dev`) and a per-branch alias (`https://<branch-slug>-insignia-test.yellow-moon-d66b.workers.dev`). Live is `https://insignia-test.yellow-moon-d66b.workers.dev`. **Workflow from 2026-09-16:** risky changes go on a branch → PR → check the preview → merge (merge = deploy). CI (`ci.yml`) runs on pull requests, not on plain branch pushes. | M0-13 |
| ~~**`gh` can't open PRs; git can push**~~ | ~~`goverdhan-gaur` had read-only access~~ — **resolved 2026-09-16**: the user granted write access (API shows `push: true`, `triage: true`); the agent can now create and merge PRs. Merging still waits for the user's say-so (merge = deploy). | M0-13 |
| **Supabase's GitHub integration is connected** | Commits get a "Supabase Preview" check; it's `skipped` because database branching is a paid feature. Harmless. | M0-13 |
| **zsh: never name a loop variable `path`** | In zsh `path` is tied to `PATH`; `for path in …` wipes it and `node` "isn't found". Use `route`, `p`, etc. | M0-13 |
| **The editor can stage files on its own** | Twice a throwaway probe file showed up as staged (`A`) without any `git add` — the VS Code tab that had it open. Before every commit, check `git status` and add files by name, never `git add -A`. | M0-13 |
| **Next 16 `proxy.ts` on OpenNext + Workers: works locally, officially "experimental"** | Probe 2026-09-15 (not committed): a `src/proxy.ts` setting headers. `opennextjs-cloudflare build` succeeds but warns *"Node.js middleware support is experimental in cloudflare, and not officially maintained by OpenNext maintainers. Use at your own risk."* On local workerd (`wrangler dev` of the built worker) it ran on **every** route, prerendered ones included, with a fresh nonce per request; no runtime warnings. **Not yet verified on a deployed Worker** — a `wrangler versions upload` preview would do that without touching live traffic. **Implication:** a per-request nonce only helps if pages render per request, and static pages can't embed one — so a nonce CSP means dynamic rendering, which costs Worker CPU against the 10 ms free limit (§4). | step 9 |
| **Testing migrations without Docker: PGlite** | No Docker or local Postgres on the dev Mac. `@electric-sql/pglite` (real Postgres in WASM, **v18** — the project is 17) runs migrations in Node. A shim creates `anon`/`authenticated`/`service_role`, `auth.users`, `auth.uid()` reading `request.jwt.claims`, and copies Supabase's default grants; tests then `set local role authenticated` with claims per user, in a rolled-back transaction. It can't reproduce Supabase-only pieces (the `ensure_rls` event trigger, PostgREST, Auth), so it complements `db push --dry-run` and the MCP checks after a push, not replaces them. | M0-06 |
| **`supabase login` needs a real terminal** | The agent's shell has no TTY, so the CLI's browser login can't run there. The user runs `npx supabase login` in the VS Code terminal; the token is saved on the Mac and the agent's CLI calls pick it up. Never paste the token into chat. | M0-05 |
| **`db push` needs no DB password** | CLI 2.117 connects through a temporary login role ("Initialising login role…") using the CLI login, not the database password. `npx supabase db push --dry-run` is safe to run any time — it lists pending migrations and changes nothing. | M0-05 |
| **Who runs `db push`** | The agent permission policy blocks agent-side writes to the live database (it refused `apply_migration`). Running `db push` from the agent's shell would be the same write by another route — so the agent writes and dry-runs migrations, and **the user runs the real push**. | M0-05 |
| **`supabase/config.toml` is local-stack config** | Its `[auth] enable_signup = true` etc. only affect `supabase start`, not the live project (unless `supabase config push` is run — don't, without review). Align it with rule #7 at M1-01. | M0-05 |
| **npm 11 skips install scripts by default** | `npm install` warns that `esbuild`, `workerd`, `unrs-resolver`, `fsevents` have unapproved install scripts (`npm install-scripts ls`). Pre-existing, not caused by the Supabase install — the CLI itself works. Worth a look if a build tool ever misbehaves after a fresh `npm install`. | M0-05 |
| **Screenshots: use the CDP helper, not iframe offsets** | Guessing iframe offsets from a scaled overview is unreliable (the scaled render uses a different viewport width). Driving Chrome over `--remote-debugging-port` with `Runtime.evaluate` → `getBoundingClientRect` → `Page.captureScreenshot` with a `clip` captures any section, and can click first to open dialogs and toasts. Node 22+ has `WebSocket` built in, so it needs no dependencies. | M0-03 |

---

## 6. Environment and resources

**Names and locations only. Never a value.**

| Resource | Identifier | Where | Status |
|---|---|---|---|
| Git repo | `insignia-ielts`, branch `main` | local + origin | ✅ exists |
| Supabase project | `insignia-ielts` · ref `zpqszkwavnjomxjgimni` · **`ap-south-1`** · Postgres 17 | supabase.com dashboard | ✅ M0-04 |
| ~~Supabase project~~ | ~~`ielts-test` · `fypfpveynadsbbfbuenc` · `ap-northeast-2`~~ | — | ~~superseded~~ wrong region, removed 2026-09-15 |
| R2 bucket — content | `insignia-ielts-content` · APAC · binding `CONTENT_BUCKET` | Cloudflare dashboard, `wrangler.jsonc` | ✅ private, r2.dev off |
| R2 bucket — audio | `insignia-ielts-audio` · APAC · binding `AUDIO_BUCKET` | Cloudflare dashboard, `wrangler.jsonc` | ✅ private, r2.dev off |
| R2 bucket — `listenings` | pre-existing in the account, **not created by this project** | Cloudflare dashboard | ❓ ask the user whether it's legacy content to import or unrelated — untouched |
| Worker | `insignia-test` | `wrangler.jsonc`, `package.json` | ✅ named |
| Domain | *user says one exists; **not yet named*** | needed for `APP_BASE_URL`, `MAIL_FROM`, Turnstile | ⚠️ blocking M1-03/04/11 |
| Bootstrap Owner auth user | `auth.users` id `1b7d0ff5-e86a-4050-8870-9fd80ed0a3ce` — created by hand by the user, 2026-09-17 | Supabase dashboard; pinned in `20260917101500_bootstrap_owner.sql` | ✅ created, ⬜ `/setup` not yet run |
| Resend sending domain | *TBD* | needs SPF/DKIM/DMARC | ⬜ M1-04 |
| Sentry project | *TBD* | | ⬜ |
| Turnstile site | *TBD* | | ⬜ M1-11 |

### Secrets — names only

Set via `wrangler secret put`. Local dev values go in `.dev.vars` (gitignored); `.dev.vars.example` lists the names.

| Secret name | Used by | Set? |
|---|---|---|
| `SUPABASE_URL` | server (`lib/supabase/env.ts`) | ✅ 2026-09-15 |
| `SUPABASE_PUBLISHABLE_KEY` | server — RLS-scoped client (`server.ts`) | ✅ 2026-09-15 |
| `SUPABASE_SECRET_KEY` | **server only**, `admin.ts`, behind `lib/rbac.ts` — bypasses RLS | ✅ 2026-09-15 |
| `R2_ACCESS_KEY_ID` | **server only**, `lib/r2.ts` — scoped object-read token id | ⬜ provision in M0-14 |
| `R2_SECRET_ACCESS_KEY` | **server only**, `lib/r2.ts` — scoped object-read token secret | ⬜ provision in M0-14 |
| ~~`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`~~ | superseded 2026-09-15 by the publishable/secret key names above — Supabase's current key model; IP forwarding for Auth rate limits (§4) requires a secret key | — |
| `RESEND_API_KEY` | invite email (`lib/mail/mailer.ts`) — **required in production**; unset in dev prints the link to the console | ⬜ awaiting the user |
| `TURNSTILE_SECRET_KEY` | login + accept-invite (M1-11) | ⬜ awaiting the user |
| `SENTRY_DSN` | error reporting | ⬜ |
| `MCP_SERVICE_CREDENTIAL` | authoring MCP (M8) | ⬜ |

Non-secret settings, in `wrangler.jsonc` `vars` and `.dev.vars.example`:

| Name | Used by | Set? |
|---|---|---|
| `APP_BASE_URL` | `lib/env.ts` — the absolute origin invitation links are built from | ⚠️ placeholder `insignia-test.workers.dev`; needs the real domain |
| `MAIL_FROM` | `lib/mail/mailer.ts` — must be a domain verified in Resend | ⚠️ placeholder `invites@example.com`; needs the real domain |

⚠️ **`SUPABASE_SECRET_KEY` and `R2_SECRET_ACCESS_KEY` values must never appear in `wrangler.jsonc` vars, a client bundle, or this file.** `.dev.vars.example` lists names only.

---

## 7. Open blockers and questions for the user

| # | Question | Why it matters | Blocking? |
|---|---|---|---|
| ~~Q1~~ | ~~"Hard" or "Difficult"?~~ | **Answered 2026-09-15 (goverdhan-gaur): Easy / Medium / Hard.** | ✅ closed |
| ~~Q2~~ | ~~Mock results — auto-release, or held for the teacher?~~ | **Answered 2026-09-15:** admin or teacher chooses **per assignment** — release right away, automatically on a schedule, or manually. They stay in control and can change it later. Spec: `MVP-1.md` §6 `assignments.results_release`. Default `manual` is Claude's pick (safest) — change it if you'd rather. | ✅ closed |
| ~~Q3~~ | ~~Practice library — reuse mock papers, or a separate pool?~~ | **Answered 2026-09-15:** three separate pools. **Mock** = full tests. **Class** = full tests, different papers from the mocks. **Practice** = totally different content, organised **by question type**. Spec: `MVP-1.md` §6 `tests.kind`. | ✅ closed |
| ~~Q9~~ | ~~Do class tests run under full exam conditions like mocks?~~ | **Confirmed 2026-09-15 (goverdhan-gaur): yes** — server timer, audio once, no seek. | ✅ closed |
| ~~Q10~~ | ~~Is each practice set one question type?~~ | **Confirmed 2026-09-15: yes, one type per set** (`tests.practice_question_type`). | ✅ closed |
| ~~Q12~~ | ~~Should a student see the **notes** on their own plan?~~ | **Answered 2026-09-16 (goverdhan-gaur): no.** Plan facts yes, internal notes no. `student_plans.notes` dropped; staff-only `student_plan_notes` table added (§4, migration `20260916125048_plan_notes.sql`). | ✅ closed |
| ~~Q11~~ | ~~Which Cloudflare Workers plan — Free or Paid?~~ | **Answered 2026-09-15 (goverdhan-gaur): Free.** Design budget in `MVP-1.md` §4: ~120 Worker requests per student per test, 60 s heartbeat, no DO call on autosave. Still to measure: real CPU per route against the 10 ms limit. | ✅ closed |
| Q14 | **What is the domain?** Said to exist, never named. | `APP_BASE_URL`, `MAIL_FROM` and the Turnstile site all need it; invitation links are absolute and read in an email client. Placeholders are committed and marked TODO. | **Yes — M1-03/04/11** |
| Q15 | A `RESEND_API_KEY` with send permission, and confirmation the sending domain shows **Verified** in Resend. | The Supabase↔Resend connection covers Supabase Auth's own mail, not our invitation (§4). Without it, production refuses to send. | **Yes — M1-03** |
| Q16 | Approval for the Supabase dashboard changes in M1-01, above all **JWT expiry 3600 → 7200 s**. | A 60-minute Reading test outlasts the default hour, so a token refresh would land mid-test. | **Yes — before any real test runs** |
| Q4 | Plan validity — purely time-based, or also test-count based? | `test_quota` column exists and is nullable, so either works. Cheap now, awkward later. | No |
| Q5 | Multiple branches, ever? | `branch_id` is already in the schema, so building it in costs nothing. Confirm it should stay. | No |
| Q6 | Who enters test content? | 40-question answer keys per test is the real bottleneck, not code. The MCP (M8) and answer-key editor (M5-09) address it, but someone's time still has to be budgeted. | No |
| Q7 | "Sign in with Google" OAuth later? | D9 uses email + password. OAuth is additive, not a rewrite, but worth knowing now. | No |
| Q8 | Writing and Speaking eventually? | The `skill` column already has room. Writing needs manual grading and a teacher review queue. | No |
| Q13 | Provide the real MP3 and exact section-end timestamps for the legacy Listening test; identify or create an active user with `test:author`. | M0-20 cannot create an honest, audited Listening draft without its recording/timings and attributed author. | **Yes — M0-20 live import** |

---

## 8. Session handoff notes

### 2026-09-15 (third session)

**Done.** M0-04. Cross-checked the user's Supabase project over the MCP. It was in Seoul, so the user recreated it in Mumbai while it was still empty. The new project was verified: `ap-south-1`, empty schema, UTC, RLS auto-enable on, leaked-password protection on. Wrote the repo's first migration, which clears the one remaining advisor warning. Then, at the user's call, dropped Drizzle: no ORM, just `supabase-js` + generated types + Postgres functions (§4). The spec and walkthrough are corrected.

**Not done.** The migration is **not applied** remotely because the agent's permission policy blocked `apply_migration`. It goes out with the first `supabase db push` at M0-05. No Supabase keys are set anywhere yet (`.dev.vars`, Wrangler secrets); that's M0-14.

**Left for the user (dashboard only).** (1) Authentication → Sign In / Providers → switch **off** "Allow new users to sign up" (rule #7, M1-01). (2) Usage alert at 70% (step 2). Neither can be read over the MCP.

**Then.** M0-05 mostly done: the user ran `login`, `init` and `link`; the CLI is a devDependency and types are generated. The only step left is `npx supabase db push`, which is **the user's to run** (§5).

**Then.** The user ran `db push`; verified and M0-05 closed.

**Then.** User confirmed Q9/Q10 and the free-plan constraint (200 concurrent, Supabase Free) — spec redesigned for it (§4). M0-06 identity migration written and tested locally; not pushed.

**Then.** User pushed M0-06; verified and closed. User asked where the "test tables" are — `tests` is M0-08, `attempts`/`answers` M0-09; all tables are empty until seeding (M0-19) and real use.

**Then.** M0-07 cohorts migration written and tested; not pushed.

**Then.** M0-07 pushed, verified, closed. M0-08 content migration written and tested; not pushed.

**Then.** M0-08 pushed, verified, closed. M0-09 assessment migration written and tested; not pushed.

**Then.** M0-09 pushed, verified, closed. M0-10 written and tested; not pushed.

**Then.** M0-10 pushed, verified, closed — all 24 tables live. M0-11 done: the harness is in the repo (`npm run test:db`, `test:db:sweep`).

**Then.** User supplied the three band charts and chose "Below 4". M0-19 migration written and tested; not pushed.

**Then.** M0-19 pushed, verified, closed. Step 21 done (clients, no browser client).

**Then.** User chose Owner + Admin; step 22 written and tested; not pushed.

**Start with.** If the user has pushed `role_permissions`: verify (Owner label, 5 permission maps, `CHECK`), `db:types`. Then offer the unfinished early steps (R2 buckets, CSP, CI, docs) before Phase 3. Secrets are set and verified (M0-14). **Every future migration:** extend `tests/db/rls.test.mjs` (see its README) and run both `test:db` commands before asking the user to push. Q11 answered: Workers Free. Open: whether to commit the PGlite harness as the M0-11 test; the Worker's workers.dev URL (not in the repo, and wrangler can't print it) — needed to measure real CPU per request with `wrangler tail`.

### 2026-09-15 (second session)

**Done.** M0-01 closed (lint fixed; the user fixed auto-deploy). M0-03 done: all shadcn primitives restyled to the tokens. That completes the M0-23 gallery. Every new section was checked by screenshot at 1280 and 390px, including an open dialog and a toast. Three bugs caught on screen before commit: inputs with black borders, a grey loading button, and a "select all" showing ✓ for a partial selection. One caught in code: `outline-none` killing the focus ring.

**Left for the user.** (1) `next dev` appended a Next.js agent-rules block to `CLAUDE.md`; it was reverted, not committed — see §5. (2) An untracked `.mcp.json` (a Supabase MCP server entry) and a `.gitignore` line ignoring it appeared mid-session. Origin unclear — nothing in this work writes either. Neither was committed.

**Start with.** M0-04 — the Supabase project in `ap-south-1`. It's a dashboard action for the user, and the region is permanent.

### 2026-09-15

**Done.** M0-01 scaffold swap is in (`576a7f3`). Verified the Worker build end to end and confirmed `.dev.vars` has never been committed.

**Half-done.** M0-01 stays `in_progress` for two fixes, both in §5: (1) the Cloudflare Workers Builds auto-deploy fails because the dashboard build step runs `next build` instead of `opennextjs-cloudflare build` — a dashboard setting, not a code change; (2) replace the `next lint` script and the `FlatCompat` ESLint config. The worker rename to `insignia-test` is committed and pushed (`6f4a4b0`).

**Not yet touched, but worth knowing.** `src/app/layout.tsx` still loads Geist fonts with "Create Next App" metadata and `globals.css` has scaffold colours — that's M0-02 (tokens + Inter / IBM Plex Mono), not a defect. The README is the stock OpenNext starter text.

**Start with.** The dashboard build-command fix (and confirm the dashboard Worker is named `insignia-test`), then the lint fix, then `BUILD-STEPS.md` step 2 — the Supabase project in `ap-south-1`.

### 2026-09-14

**Done.** Read every planning document and design file in the repo. Wrote `MVP-1.md` as the full specification, this file as the tracker, and `CLAUDE.md` as the agent entry point. Fetched the three official ielts.org format pages and built the question-type taxonomy (18 canonical types, 6 widgets) from them rather than from the prototype's 7 types.

**Not done.** No code. The repo still holds the `vinext` scaffold, which M0-01 replaces.

**Check first next session.** Q1–Q8 in §7 above — none block M0, but Q1 is a one-word answer and Q2/Q3 shape the assignment defaults built in M5/M6.

**Start with.** M0-04 (the Supabase project, because the region is irreversible) alongside M0-01 and M0-15, which have no DB dependency.

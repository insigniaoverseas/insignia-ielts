# Security

The threat model, the controls as built, what is deliberately not prevented, and the data-protection posture. The plan is `MVP-1.md` §8 and §13; this page describes the code as of October 2026, and says plainly what is not built yet.

## What the product guarantees

No system is foolproof, and a test in a browser cannot be made cheat-proof against a determined student. What this product does guarantee — and tests — is narrower:

1. **The answer key never reaches a browser.**
2. **One student can never read another student's data.**
3. **The clock cannot be edited.**
4. **Progress and scores cannot be forged.**

Everything outside that is **detected and flagged, or left to invigilation** — see [Residual risks](#residual-risks). Tell the institute this is not a secure exam browser.

## The two gates on data

Every read and write meets two independent checks, so one mistake does not leak data.

1. **Postgres Row-Level Security.** Every table is RLS-on and default-deny; policies ship in the same migration as the table; grants are column-limited where secrets live. Request-scoped queries carry the user's JWT, so RLS always applies — which is why there is no ORM ([ADR 0014](adr/0014-no-orm.md)).
2. **`src/lib/rbac.ts` and the guards.** Pages and layouts call `requireRole` / `requirePermissionOrRedirect` (`src/lib/auth/guard.ts`); every Server Action calls `requirePermission` and, for attempts, re-checks that the session is live and the attempt is the caller's. The actor is resolved with the secret-key client, so this gate does not inherit an RLS mistake.

Staff layout bundles add one rule on top: a sidebar page the person lacks permission for is withheld on the server with **no data** (`src/lib/bundle-slots.ts`, unit-tested).

### Who can read what

RLS intent, from the migrations (`MVP-1.md` §13). "Own batches" means students *currently* in a batch the teacher teaches.

| Table | Student | Teacher | Admin | Owner |
|---|---|---|---|---|
| `users` | own row | students in own batches | own branch | all |
| `student_plans` | own | own batches | own branch | all |
| `student_plan_notes`, `plan_history` | none | none | own branch | all |
| `batches` | own membership | assigned batches | own branch | all |
| `batch_students` | own rows — never classmates | own batches | own branch | all |
| `tests` | published practice; mock/class only when assigned (or already sat) | own + published | all (shared library) | all |
| `assignments` and targets | those targeting them | created, or targeting own batches | own branch | all |
| `attempts`, `answers` | **own only** (answers writable only while open and in time) | own batches | own branch | all |
| `attempt_scores` | own, once finished **and released** (practice: at once) | own batches | own branch | all |
| `answer_marks` | own, once finished, released **and review allowed** | own batches | own branch | all |
| `attempt_events`, `audit_log` | none | own batches (events) | own branch | all |
| `rate_limits`, `password_resets` | none — server code only | | | |

**A student-role session has no route, query or policy that returns another user's name, email, attempt, answer, band or plan.**

## Threats and controls

| Threat | Control | Where |
|---|---|---|
| **Answer key leaks** | `key.json` read only through the R2 binding, inside server code, to mark; never signable; never in a response body. `lib/scoring.ts` is `server-only`. CI fails the build if scoring code, `key.json`, `accepted_variants`, the `r2_key_key` column or a secret key appears in client output. | `src/lib/r2.ts`, `scripts/check-client-bundle.mjs` |
| **Correctness seen mid-test** | Correctness and scores live in `answer_marks` / `attempt_scores`, which RLS hides from a student until the attempt is finished and released. The player's DOM holds no answers during a mock. | migrations, `src/lib/queries/student.ts` |
| **Forged clock, score or progress** | Postgres triggers set `expires_at` and status, enforce the state machine, refuse late or replayed answer writes for every role. No endpoint accepts a client score, band or time. | `supabase/migrations/*assessment*`, [`data-model.md`](data-model.md#what-the-database-enforces-by-itself) |
| **One student reading another's data** | The two gates above; UUID keys; ownership re-checks in every attempt action. | everywhere |
| **Account takeover** | Supabase-managed password hashing, leaked-password protection on; lockout after 5 wrong passwords per account and 30 per IP in 15 minutes; Turnstile on sign-in and invitation acceptance (Siteverify on the server, action-bound). | `src/lib/auth/lockout.ts`, `src/lib/turnstile.ts` |
| **Credential sharing / hijacked session** | httpOnly, Secure, SameSite cookies. A JWT cannot be revoked, so the `insignia_session` cookie names a `user_sessions` row the guard checks; a student's new sign-in ends their other session; staff can hold several. Devices can be signed out from Profile. Password reset revokes every session. | `src/lib/auth/sessions.ts`, `guard.ts` |
| **Invite abuse / public signup** | No signup route exists; Supabase signup is disabled. Single-use hashed invitation tokens (7 days), revocable; accepting can never grant a role above the inviter's; nobody can be invited as Owner. The first Owner is a pinned uuid with a one-time `/setup`. | `src/lib/auth/invitations.ts`, `acceptance.ts` |
| **Stored XSS via passage HTML** — the likeliest web bug here | Sanitised on write (import) **and** on render (once per request on the server, `sanitize-attempt.ts`) with a strict allowlist: text formatting, headings, lists, tables, `p data-label`; no links, images, ids, classes or styles. Plus a nonce CSP with no `unsafe-inline` scripts ([ADR 0015](adr/0015-nonce-csp-dynamic-pages.md)). | `src/lib/security/sanitize.ts`, `headers.ts` |
| **CSRF** | Server Actions' origin checking; route handlers are `GET` reads behind the guard. | Next.js |
| **SQL injection** | Only `supabase-js` and `.rpc()` — values travel as parameters. No string-built SQL. zod at every input boundary. | `src/lib/actions/` |
| **Privilege escalation** | The secret key is a Wrangler secret, used only in role-checked server code; never in `wrangler.jsonc` vars or a client bundle. Role changes are Owner-only and audit-logged. | `src/lib/supabase/admin.ts` |
| **Malicious upload** | Server-generated R2 keys (no user-controlled path); content validated against the upload schema; the importer refuses unreferenced files and audio above 64 kbps; CSV invites validated row by row before any write. | `src/lib/import/`, `src/lib/csv-invite.ts` |
| **R2 exposure** | Buckets private, public dev URL off; signed URLs 5 minutes; `content.json` and `key.json` never signable. | [`r2-layout.md`](r2-layout.md) |
| **Shared lab PC** | The audio cache is keyed by its owner and purged for anyone else; signing out deletes it and local attempt state. The mistakes-review cache lives in the student layout's memory and goes on log out. | `src/lib/audio-cache.ts`, `src/components/student/student-data.tsx` |
| **Transport** | HSTS, nonce CSP, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`. | `src/lib/security/headers.ts`, `public/_headers` |
| **Supply chain** | Committed lockfile; `npm audit --audit-level=high` in CI (fixed at the cause, never allow-listed). | `.github/workflows/ci.yml` |
| **Auditability** | `audit_log` on every privileged action (append-only); `attempt_events` for integrity signals. | `src/lib/audit.ts` |

## Residual risks

Not solved by this software. Say so to the institute.

| Risk | What actually happens |
|---|---|
| Student photographs the screen or uses a second device | Nothing technical. Invigilation. |
| Someone else sits the test | One active session per student; invigilator checks identity. |
| Password shared and used elsewhere | The second sign-in ends the first session. |
| **Pre-listening at home** | The recording downloads before Start so the clock never runs during a download; a student with DevTools can play it from Cache Storage first. Accepted: streaming after Start is the failure the design exists to prevent in a 200-seat lab. Mitigations: invigilation in the lab; anti-cheat flags (M9-01) can record time on the pre-test screen. |
| Browser extension reads the page | Nothing — but during a mock the page holds no answers. |
| Tab-switching to search | Counted in `attempts.tab_switches`; shown to staff. A flag, not a block. |
| Review screen holds correct answers in memory | Only the answers that student is allowed to see on that screen, after release ([ADR 0016](adr/0016-layout-bundles.md)). The key file never leaves the server. |

## Data protection (DPDP Act 2023)

- **Where:** all personal data in Supabase Mumbai (`ap-south-1`) and Cloudflare; email through Resend.
- **Notice and consent:** accepting an invitation shows what is kept, why, who sees it and for how long, and requires "I agree"; the acceptance is recorded in `audit_log` against the notice version (`PRIVACY_NOTICE_VERSION` in `src/lib/privacy.ts` — **bump it whenever the text or the facts behind it change**). Full notice at `/privacy`.
- **Guardians:** no verifiable-guardian-consent flow. The DPDP Rules 2025 exempt educational institutions from s.9(1) for educational activities, and families enrol in person (decided with the user, `PROJECT-MEMORY.md` §4). `users.dob` / `guardian_*` columns exist if that changes.
- **Retention:** 12 months after the student's plan ends.
- **Deletion:** the erasure path (M9-08) is **in progress, not finished**. Audit rows keep actor ids without foreign keys so the trail survives an erasure.
- **Error reporting:** Sentry is not wired yet; when it is, it must scrub personal data.

## Not done yet

Honest list, so nobody assumes these exist:

| Item | Status |
|---|---|
| Durable Object rate limiter (M1-10) | Lockout runs on the Postgres `rate_limits` fallback, which works; the DO is deferred |
| Device list clean-up, dead PIN columns (M1-14) | In progress |
| Full security review (M9-07) | In progress — run `/security-review`, then walk `MVP-1.md` §19 by hand |
| JWT expiry 7,200 s and raised sign-in limit on the live project (M1-01, Q16) | Awaiting the dashboard change |
| Backups and a restore drill (M9-06) | **Not built** — Supabase Free has no backups ([`runbook.md`](runbook.md#backups)) |
| Anti-cheat flags (M9-01), DPDP erasure (M9-08), Sentry | After beta |

## Checking it

- `npm run test:db` runs every migration on PGlite and probes each role's access; `npm run test:db:sweep` drops each policy in turn and requires a test to fail.
- `npm run test:unit` covers permissions against the seeded roles, routing rules, bundle slots, scoring and the refresh policy.
- `npm run check:bundle` after `next build` greps client output for anything server-only.
- `MVP-1.md` §19 lists the end-to-end verification checks; all must pass before a paying student uses the product.

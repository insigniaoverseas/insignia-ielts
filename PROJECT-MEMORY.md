# Project Memory — Insignia IELTS

> **This file is where the project remembers itself.** It changes every session.
> For *what to build and what it must never do*, read [`MVP-1.md`](MVP-1.md) — that is the contract.
> For *what to do next, in order*, read [`BUILD-STEPS.md`](BUILD-STEPS.md) — 103 dependency-ordered steps.

---

## Rules for this file

1. **Update it in the same commit as the work.** Never as a batch afterwards, never "I'll write it up later."
2. **Never delete history.** Supersede an entry with a new one and mark the old one `~~superseded~~`.
3. **If `MVP-1.md` and reality disagree, fix `MVP-1.md`** and record the correction in §4 below.
4. **No secrets. Ever.** This file is committed to git. Record *names and locations* — "the Supabase service-role key lives in Wrangler secrets as `SUPABASE_SERVICE_ROLE_KEY`" — never a value.
5. Tick tasks **here**, not in `MVP-1.md`.

---

## 1. Current state

| | |
|---|---|
| **Active milestone** | **M0 — Foundations** |
| **Last completed** | **M0-04** Supabase project `insignia-ielts` in `ap-south-1`, verified over the Supabase MCP (§6). Earlier: M0-03 + M0-23 (shadcn primitives, gallery), M0-01 (scaffold, lint, auto-deploy). |
| **Next task** | **M0-06** identity migration + RLS ([`BUILD-STEPS.md`](BUILD-STEPS.md) step 14) — ⚠️ RLS helpers can't go in the `auth` schema as `MVP-1.md` §13 says (§5); resolve that first. Agent drafts the migration, user reviews and runs `db push`. No-DB tasks that can run alongside: M0-12 part 1 (R2 buckets), M0-13 (CSP), M0-15 (`question-types.ts`), M0-18 (`scoring.ts`), M0-21 (docs). |
| ~~**Next task**~~ | ~~**M0-05** finish: only `npx supabase db push` left~~ — superseded 2026-09-15: pushed by the user, advisor clean. |
| **Blocked on** | Nothing. Q1–Q3 answered 2026-09-15. Q9 and Q10 confirmed the same day. |
| **Branch** | `main` |

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
| M0-06 Migration + RLS: identity tables | todo | | | branches, roles, users, invitations, user_devices, user_sessions |
| M0-07 Migration + RLS: cohorts & plans | todo | | | |
| M0-08 Migration + RLS: content & assignment | todo | | | |
| M0-09 Migration + RLS: attempts & answers | todo | | | |
| M0-10 Migration + RLS: audit & rate limits | todo | | | |
| M0-11 RLS helpers + default-deny test | todo | | | The test is the point, not the helpers |
| M0-12 R2 private buckets + `lib/r2.ts` signing | todo | | | `key.json` never signable |
| M0-13 Security headers + nonce CSP + sanitize | todo | | | |
| M0-14 Wrangler secrets + `.dev.vars.example` | todo | | | Verify nothing sensitive in `wrangler.jsonc` |
| M0-15 `lib/question-types.ts` | todo | | | MVP-1 §10 matrix — single source of truth |
| M0-16 Upload schema + `docs/test-authoring.md` | todo | | | One worked sample per variant |
| M0-17 Importer: validate → split → upload | todo | | | The split is what keeps the key server-side |
| M0-18 `lib/scoring.ts` + Vitest suite | todo | | | Word limits, hyphens, variants, plurals, bands |
| M0-19 Seed roles + default band scale | todo | | | ⚠️ Verify band ladder against a current Cambridge book |
| M0-20 Port legacy Listening test | todo | | | From `Design files/.../ielts-data.js` |
| M0-21 `docs/` tree + ADRs 0001–0013 | todo | | | |
| M0-22 CI gates incl. bundle-grep guard | todo | | | |
| M0-23 `/dev/components` gallery | done | Claude | 2026-09-15 | Live at `/dev/components`, `noindex`. Sections now match `00 Design System.dc.html` one-for-one (A2–A4, 1–20). Only gap: `image_label` widget, which waits for M2-14 (no design). |

### M1 — Invites & auth

| Task | Status | Owner | Date | Note |
|---|---|---|---|---|
| M1-01 Supabase Auth config, signup disabled | in_progress | goverdhan-gaur, Claude | 2026-09-15 | ✅ Signup **off** (user, dashboard) — verified: `GET /auth/v1/settings` → `disable_signup: true`; email is the only provider. ✅ Leaked-password protection on. ⬜ Rest of Auth config (password rules, email templates, site URL) with the auth work. ⬜ Align local `supabase/config.toml` `enable_signup`. |
| M1-02 Invitation server actions | todo | | | create, bulk, revoke, resend |
| M1-03 Resend + invite email template | todo | | | |
| M1-04 SPF / DKIM / DMARC | todo | | | Invite in spam = enrolment blocked |
| M1-05 Accept-invitation screen + token verify | todo | | | No rendered design |
| M1-06 Set-password screen | todo | | | |
| M1-07 Set-PIN screen + device binding | todo | | | |
| M1-08 Login: password path + PIN fast path | todo | | | Existing design shows phone+PIN — needs rework |
| M1-09 Lockout on password and PIN | todo | | | |
| M1-10 Durable Object rate limiter | todo | | | |
| M1-11 Turnstile on login + accept-invite | todo | | | |
| M1-12 Session cookies + single active session | todo | | | |
| M1-13 `lib/rbac.ts` + route guards | todo | | | Independent second gate over RLS |
| M1-14 Device list + revoke (server side) | todo | | | UI lands in M4-06 |

### M2 — Student core, Listening

| Task | Status | Owner | Date | Note |
|---|---|---|---|---|
| M2-01 Student app shell + nav | todo | | | Max 4 labelled tabs |
| M2-02 Student Home (03) | todo | | | |
| M2-03 My Tests (04) | todo | | | Locked items must say *why* |
| M2-04 Assignment eligibility resolver | todo | | | Windows, attempts, plan validity, unlocks |
| M2-05 Pre-test instructions (05) + headphone check | todo | | | Prevents most support calls |
| M2-06 Audio preload + owner-bound cache purge | todo | | | Highest-value lines in the caching layer |
| M2-07 Attempt lifecycle server actions | todo | | | start, resume, autosave, submit, expire |
| M2-08 Server-authoritative timer + countdown | todo | | | |
| M2-09 Question navigator + flags | todo | | | |
| M2-10 Widget `text_gap` + 7 containers | todo | | | |
| M2-11 Widget `radio` | todo | | | |
| M2-12 Widget `checkbox_n` | todo | | | |
| M2-13 Widget `dropdown_bank` (Listening) | todo | | | |
| M2-14 Widget `image_label` + asset signing | todo | | | No rendered design |
| M2-15 Listening player shell (06) | todo | | | |
| M2-16 Submit confirmation modal (08) | todo | | | |
| M2-17 Scoring on submit + band + section scores | todo | | | |
| M2-18 Result screen (09) | todo | | | |
| M2-19 Crash-recovery E2E | todo | | | V1 in MVP-1 §19 |

### M3 — Reading player

| Task | Status | Owner | Date | Note |
|---|---|---|---|---|
| M3-01 Reading player shell (07) | todo | | | No rendered design |
| M3-02 Multi-passage sections + sanitisation | todo | | | GT s1 has 2–3 texts |
| M3-03 Widget `segmented_3` | todo | | | T/F/NG and Y/N/NG |
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
| M4-01 Review my mistakes (10) + release gating | todo | | | |
| M4-02 Transcript + jump to timestamp | todo | | | Offsets into the one audio file |
| M4-03 My Progress (11) | todo | | | Per-question-type accuracy |
| M4-04 Practice at home (12) | todo | | | |
| M4-05 Practice instant feedback round-trip | todo | | | One verdict, never the key |
| M4-06 Profile (13) + device management | todo | | | |

### M5 — Admin essentials

| Task | Status | Owner | Date | Note |
|---|---|---|---|---|
| M5-01 Admin shell + sidebar | todo | | | |
| M5-02 Admin overview (20) | todo | | | |
| M5-03 Students list (21) | todo | | | |
| M5-04 Invite + bulk CSV invite (22) | todo | | | Column mapping, per-row errors |
| M5-05 Student detail drawer (23) | todo | | | |
| M5-06 Plans & validity workqueue (24) | todo | | | |
| M5-07 Batches (25) | todo | | | |
| M5-08 Test library (26) | todo | | | |
| M5-09 Answer key editor (27) | todo | | | Optimise for speed, not beauty |

### M6 — Teacher

| Task | Status | Owner | Date | Note |
|---|---|---|---|---|
| M6-01 Teacher dashboard (14) | todo | | | |
| M6-02 Batch view (15) | todo | | | |
| M6-03 Assign a test (16) | todo | | | |
| M6-04 Results & release (18) | todo | | | |
| M6-05 Mark override + note | todo | | | |
| M6-06 Class analytics (19) | todo | | | |

### M7 — Live session monitor

| Task | Status | Owner | Date | Note |
|---|---|---|---|---|
| M7-01 Realtime channel on `attempts` | todo | | | |
| M7-02 Live session monitor (17) | todo | | | |
| M7-03 Invigilator actions | todo | | | +5 min, force submit, unlock |

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
| M9-02 Audit log screen (29) | todo | | | |
| M9-03 Users & roles (28) | todo | | | |
| M9-04 Error / edge screens (30) | todo | | | |
| M9-05 Load test at 40 concurrent | todo | | | |
| M9-06 Backups + restore drill | todo | | | The drill must actually restore |
| M9-07 Full security review | todo | | | |
| M9-08 DPDP retention + deletion path | todo | | | |
| M9-09 Docs completeness pass | todo | | | |

---

## 3. Changelog

Newest first. `date · task · what changed · files · who`

| Date | Task | What changed | Files | Who |
|---|---|---|---|---|
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
| **Worker size** | 10 MB compressed limit. |
| **SMS in India** | Requires DLT registration with a telecom operator — weeks of approvals. We avoid SMS entirely (D9 uses email). WhatsApp Business API if reminders are ever needed. |
| **Timezones** | Store UTC in Postgres, render `Asia/Kolkata` everywhere. Never `new Date()` on the client for scheduling. |
| **Test devices** | The player must work on a four-year-old mid-range Android, not your laptop. Budget ~200 KB gzipped. |
| **Official GT question list** | Omits Yes/No/Not Given and Matching sentence endings. That is what ielts.org says — not a transcription error. Don't "fix" it. |
| **Legacy answer keys** | The prototype's `ielts-data.js` has answers, but `PLAN-V2.md` §10 notes the original `tests/*.js` keys were empty. Verify before relying on any ported key. |

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
| **⚠️ RLS helpers can't live in the `auth` schema** | `MVP-1.md` §13 says `auth_role()`, `is_teacher_of()` etc. are `SECURITY DEFINER` functions "in the `auth` schema". On this project `auth` is owned by `supabase_admin` and `postgres` has **no CREATE** on it (checked 2026-09-15) — Supabase locked down `auth` for user objects. A migration creating them there will fail. Put them in a non-exposed schema (e.g. `private` — not in `config.toml` `[api] schemas`, so PostgREST can't call them). **Open — fix §13 and step 19 with M0-06.** | M0-05 |
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
| R2 bucket — content | *TBD* | Cloudflare dashboard | ⬜ M0-12 |
| R2 bucket — audio | *TBD* | Cloudflare dashboard | ⬜ M0-12 |
| Worker | `insignia-test` | `wrangler.jsonc`, `package.json` | ✅ named |
| Domain | *TBD* | | ⬜ |
| Resend sending domain | *TBD* | needs SPF/DKIM/DMARC | ⬜ M1-04 |
| Sentry project | *TBD* | | ⬜ |
| Turnstile site | *TBD* | | ⬜ M1-11 |

### Secrets — names only

Set via `wrangler secret put`. Local dev values go in `.dev.vars` (gitignored); `.dev.vars.example` lists the names.

| Secret name | Used by | Set? |
|---|---|---|
| `SUPABASE_URL` | server + client | ⬜ |
| `SUPABASE_ANON_KEY` | client | ⬜ |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only**, role-checked code paths | ⬜ |
| `RESEND_API_KEY` | invite email | ⬜ |
| `TURNSTILE_SECRET_KEY` | login + accept-invite | ⬜ |
| `SENTRY_DSN` | error reporting | ⬜ |
| `MCP_SERVICE_CREDENTIAL` | authoring MCP (M8) | ⬜ |

⚠️ **`SUPABASE_SERVICE_ROLE_KEY` must never appear in `wrangler.jsonc` vars, a client bundle, or this file.**

---

## 7. Open blockers and questions for the user

| # | Question | Why it matters | Blocking? |
|---|---|---|---|
| ~~Q1~~ | ~~"Hard" or "Difficult"?~~ | **Answered 2026-09-15 (goverdhan-gaur): Easy / Medium / Hard.** | ✅ closed |
| ~~Q2~~ | ~~Mock results — auto-release, or held for the teacher?~~ | **Answered 2026-09-15:** admin or teacher chooses **per assignment** — release right away, automatically on a schedule, or manually. They stay in control and can change it later. Spec: `MVP-1.md` §6 `assignments.results_release`. Default `manual` is Claude's pick (safest) — change it if you'd rather. | ✅ closed |
| ~~Q3~~ | ~~Practice library — reuse mock papers, or a separate pool?~~ | **Answered 2026-09-15:** three separate pools. **Mock** = full tests. **Class** = full tests, different papers from the mocks. **Practice** = totally different content, organised **by question type**. Spec: `MVP-1.md` §6 `tests.kind`. | ✅ closed |
| ~~Q9~~ | ~~Do class tests run under full exam conditions like mocks?~~ | **Confirmed 2026-09-15 (goverdhan-gaur): yes** — server timer, audio once, no seek. | ✅ closed |
| ~~Q10~~ | ~~Is each practice set one question type?~~ | **Confirmed 2026-09-15: yes, one type per set** (`tests.practice_question_type`). | ✅ closed |
| Q4 | Plan validity — purely time-based, or also test-count based? | `test_quota` column exists and is nullable, so either works. Cheap now, awkward later. | No |
| Q5 | Multiple branches, ever? | `branch_id` is already in the schema, so building it in costs nothing. Confirm it should stay. | No |
| Q6 | Who enters test content? | 40-question answer keys per test is the real bottleneck, not code. The MCP (M8) and answer-key editor (M5-09) address it, but someone's time still has to be budgeted. | No |
| Q7 | "Sign in with Google" OAuth later? | D9 uses email + password. OAuth is additive, not a rewrite, but worth knowing now. | No |
| Q8 | Writing and Speaking eventually? | The `skill` column already has room. Writing needs manual grading and a teacher review queue. | No |

---

## 8. Session handoff notes

### 2026-09-15 (third session)

**Done.** M0-04. Cross-checked the user's Supabase project over the MCP. It was in Seoul, so the user recreated it in Mumbai while it was still empty. The new project was verified: `ap-south-1`, empty schema, UTC, RLS auto-enable on, leaked-password protection on. Wrote the repo's first migration, which clears the one remaining advisor warning. Then, at the user's call, dropped Drizzle: no ORM, just `supabase-js` + generated types + Postgres functions (§4). The spec and walkthrough are corrected.

**Not done.** The migration is **not applied** remotely because the agent's permission policy blocked `apply_migration`. It goes out with the first `supabase db push` at M0-05. No Supabase keys are set anywhere yet (`.dev.vars`, Wrangler secrets); that's M0-14.

**Left for the user (dashboard only).** (1) Authentication → Sign In / Providers → switch **off** "Allow new users to sign up" (rule #7, M1-01). (2) Usage alert at 70% (step 2). Neither can be read over the MCP.

**Then.** M0-05 mostly done: the user ran `login`, `init` and `link`; the CLI is a devDependency and types are generated. The only step left is `npx supabase db push`, which is **the user's to run** (§5).

**Then.** The user ran `db push`; verified and M0-05 closed.

**Start with.** M0-06: first settle where the RLS helpers live (not `auth` — §5), then draft the identity migration for the user to review before they push.

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

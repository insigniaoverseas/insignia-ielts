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
| **Last completed** | Specification written (`MVP-1.md`), design docs reviewed, all decisions D1–D13 locked |
| **Next task** | **[`BUILD-STEPS.md`](BUILD-STEPS.md) step 1** — answer Q1–Q3 in §7 below, then step 2: ⚠️ create the Supabase project in `ap-south-1` (irreversible). Steps 3–4 run in parallel. |
| **Blocked on** | Nothing. Two non-blocking open questions in §7. |
| **Branch** | `main` |

---

## 2. Task status board

`todo` · `in_progress` · `blocked` · `done`

### M0 — Foundations

| Task | Status | Owner | Date | Note |
|---|---|---|---|---|
| M0-01 Re-scaffold Next.js 16 + OpenNext | todo | | | Discard `vinext`, `app/page.tsx`, `next.config.ts` |
| M0-02 Tailwind v4 `@theme` tokens + fonts | todo | | | v4 is CSS-first — not a `tailwind.config.js` |
| M0-03 shadcn/ui init + restyle to tokens | todo | | | |
| M0-04 ⚠️ Supabase project in `ap-south-1` | todo | | | **Region cannot be changed later** |
| M0-05 Drizzle setup + `db/schema.ts` | todo | | | |
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
| M0-23 `/dev/components` gallery | todo | | | |

### M1 — Invites & auth

| Task | Status | Owner | Date | Note |
|---|---|---|---|---|
| M1-01 Supabase Auth config, signup disabled | todo | | | |
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

*(No build-time decisions yet — D1–D13 in `MVP-1.md` §3 cover everything decided so far.)*

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

*(none yet)*

---

## 6. Environment and resources

**Names and locations only. Never a value.**

| Resource | Identifier | Where | Status |
|---|---|---|---|
| Git repo | `insignia-ielts`, branch `main` | local + origin | ✅ exists |
| Supabase project | *TBD* — must be **`ap-south-1`** | supabase.com dashboard | ⬜ M0-04 |
| R2 bucket — content | *TBD* | Cloudflare dashboard | ⬜ M0-12 |
| R2 bucket — audio | *TBD* | Cloudflare dashboard | ⬜ M0-12 |
| Worker | `insignia-ielts` | `wrangler.jsonc` | ✅ named |
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
| Q1 | **"Hard" or "Difficult"** as the display label for the third difficulty level? Stored value is `hard` either way. | You said "difficult"; the rendered design system says "Hard". One word, easy to change now. | No — default to "Hard" |
| Q2 | Mock results — auto-release, or held for the teacher to release? | Changes the default on every assignment. `MVP-1.md` assumes **held for mock, instant for practice**. | No |
| Q3 | Practice library — reuse mock papers, or a separate pool? | Reusing mock papers at home burns them. `tests.usage_policy` supports either; just needs a default. | No |
| Q4 | Plan validity — purely time-based, or also test-count based? | `test_quota` column exists and is nullable, so either works. Cheap now, awkward later. | No |
| Q5 | Multiple branches, ever? | `branch_id` is already in the schema, so building it in costs nothing. Confirm it should stay. | No |
| Q6 | Who enters test content? | 40-question answer keys per test is the real bottleneck, not code. The MCP (M8) and answer-key editor (M5-09) address it, but someone's time still has to be budgeted. | No |
| Q7 | "Sign in with Google" OAuth later? | D9 uses email + password. OAuth is additive, not a rewrite, but worth knowing now. | No |
| Q8 | Writing and Speaking eventually? | The `skill` column already has room. Writing needs manual grading and a teacher review queue. | No |

---

## 8. Session handoff notes

### 2026-09-14

**Done.** Read every planning document and design file in the repo. Wrote `MVP-1.md` as the full specification, this file as the tracker, and `CLAUDE.md` as the agent entry point. Fetched the three official ielts.org format pages and built the question-type taxonomy (18 canonical types, 6 widgets) from them rather than from the prototype's 7 types.

**Not done.** No code. The repo still holds the `vinext` scaffold, which M0-01 replaces.

**Check first next session.** Q1–Q8 in §7 above — none block M0, but Q1 is a one-word answer and Q2/Q3 shape the assignment defaults built in M5/M6.

**Start with.** M0-04 (the Supabase project, because the region is irreversible) alongside M0-01 and M0-15, which have no DB dependency.

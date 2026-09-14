# IELTS Platform — Build Plan v2

**Date:** 6 Sep 2026
**Status:** Prototype done (`index.html` player + `admin.html` dashboard, localStorage only). This plan covers turning it into a real multi-user product.
**Supersedes:** the scope sections of `PLAN.md` (costing there is still broadly valid — see §9).

---

## 1. What you asked for, refined

Your list was right. Below it is restated as buildable requirements, with gaps filled in. Anything marked **[added]** wasn't in your list but you'll need it.

### 1.1 Student

| # | Requirement | Refined into |
|---|---|---|
| S1 | Do Reading + Listening tests | Full 4-section Listening (single audio or per-section), 3-passage Reading, real IELTS timing (Listening 30 min + 10 min transfer; Reading 60 min), all 7 question types the player already supports |
| S2 | Login with contact number | Phone + admin-set PIN. Country code stored separately. **[added]** forced PIN change on first login; account lockout after 5 wrong PINs; admin can reset |
| S3 | Mock test | A *mode*, not a test type: strict timer, no pausing, no answers revealed until released, one attempt, results possibly held back until the teacher publishes them |
| S4 | Scores + progress | Per-attempt band + raw score; trend chart over time; separate Listening vs Reading bands; **[added]** per-question-type accuracy (e.g. "T/F/NG 41%, Matching Headings 33%") — this is what actually tells a student what to fix |
| S5 | See mistakes | Post-test review screen: their answer vs correct answer, per question, with the passage/transcript visible and the audio replayable at the right timestamp. **[added]** teacher-controlled toggle for whether review is available |
| S6 | Practice at home | Practice mode: same content, relaxed rules — pause allowed, unlimited attempts, instant answers, optional untimed. Marked separately from mock scores so home practice doesn't pollute progress data |
| **[added]** S7 | Session recovery | Browser crash / power cut mid-test must not lose the attempt. Answers autosave every ~10s; student resumes with the remaining time intact |
| **[added]** S8 | Access expiry visible | Student sees "Access valid till 12 Nov 2026" and a warning in the last 7 days |

### 1.2 Admin

| # | Requirement | Refined into |
|---|---|---|
| A1 | Create batches and tests | Batches: name, branch, start date, teacher(s), student list. Tests: the existing authoring screens, plus draft/published states and a 40-question answer-key editor (already built) |
| A2 | Create student accounts | Single create + **[added]** bulk CSV import (name, phone, batch, plan length) — you will not hand-type 30 students per batch |
| A3 | Assign batches / tests to students | Assignment targets any mix of batches + individual students (prototype already does this). **[added]** scheduling: available-from and due-by datetime, and attempt limit |
| A4 | See plan validity, extend it | Every student has an access window (start, end). Dashboard lists expiring-in-7-days and already-expired. Bulk extend for a whole batch. **[added]** an audit trail of who extended what and when |
| A5 | Clean dashboard | See §5 |
| **[added]** A6 | Roles & branches | Super Admin / Admin / Teacher / Invigilator / Student, scoped by branch, so a second centre doesn't see the first one's data |
| **[added]** A7 | Content library | Tests stored centrally with tags (Academic/GT, difficulty, source book), reusable across batches — not copied per batch |
| **[added]** A8 | Live session monitor | During a lab session: who's started, who's stuck, who submitted, time remaining. Force-submit or grant extra time to one student |

### 1.3 Teacher

| # | Requirement | Refined into |
|---|---|---|
| T1 | Assign tests to students | Same assignment engine as admin, restricted to their own batches |
| T2 | Unlock tests on certain days | Scheduled unlock: a test appears in the student's list at a set date/time and locks after due-by. Plus a manual "unlock now" override for a named student (latecomer, retake) |
| **[added]** T3 | Grade + override | Fix an auto-marked answer that's wrong-but-acceptable (spelling variants, "twenty" vs "20"). Adjust and leave a comment |
| **[added]** T4 | Class analytics | Batch-level view: average band, weakest question types, most-missed questions — drives what to teach next class |
| **[added]** T5 | Release results | Hold mock results, review, then release to the batch in one click |

### 1.4 Cross-cutting **[added]**

- **Writing & Speaking** — out of scope now, but design the schema so a `skill` column exists (`listening | reading | writing | speaking`). Retrofitting this later is painful.
- **Notifications** — WhatsApp/SMS "your mock is tomorrow", "your access expires in 3 days". Optional, phase 4.
- **Anti-cheat (light)** — tab-switch counter, copy/paste disabled, one active session per account. You can't stop a determined cheat in a browser; you can flag one.
- **Data export** — results to Excel for records/parent reporting.
- **Offline/LAN fallback** — 30 students pulling a 9 MB MP3 at once is the single biggest operational risk. See §8.

---

## 2. Backend decision: AWS vs Supabase vs Firebase

You said you're torn. Here's the honest comparison for *this* product.

| | **Supabase** | **Firebase** | **AWS** |
|---|---|---|---|
| Database | Postgres (relational, SQL) | Firestore (NoSQL documents) | Your choice (RDS/DynamoDB) |
| Fit for your data | **Excellent** — students↔batches↔assignments↔attempts is a classic relational graph with many-to-many joins | Poor — you'd denormalise and duplicate constantly | Fine, but you build it |
| Auth by phone + PIN | Custom (phone as identifier, hashed PIN) — straightforward | Phone auth is OTP-only; PIN needs custom tokens + a Cloud Function | Cognito can do it, with effort |
| Per-user data isolation | Row-Level Security in the DB — one policy protects every query | Security Rules — workable but easy to get subtly wrong | IAM + your own API layer |
| File storage (audio) | Built-in, but egress-metered | Built-in, egress-metered | S3 + CloudFront, cheap at scale |
| Time to first working version | **Days** | Days | Weeks |
| Ops burden | Near zero | Near zero | Real (you become a sysadmin) |
| Cost at 500 students | ₹0–2,100/mo | ₹0–2,500/mo, spikes unpredictably | ₹1,500–4,000/mo + your time |
| Cost at 50,000 students | Scales; you'd shard or move | Gets expensive, read-count pricing bites | Cheapest at this scale |
| Lock-in | Low — it's just Postgres, `pg_dump` and leave | **High** — Firestore data model doesn't port anywhere | Low-ish |

### Recommendation: **Supabase**

Reasons, in order of weight:

1. **Your data is relational.** "Which students in batch B have an unexpired plan and haven't attempted test T?" is one SQL query in Postgres and a mess of client-side joins in Firestore.
2. **Row-Level Security is the whole security model.** A policy like *"a student can read only their own attempts"* is enforced in the database, so a bug in the frontend can't leak another student's marks. This matters when the frontend is the thing you're iterating fastest on.
3. **Phone + PIN.** Firebase pushes you toward SMS OTP; you chose PIN. Supabase lets you own the auth logic.
4. **Exit is cheap.** If you outgrow it, it's a standard Postgres dump into RDS. Nothing is rewritten. That makes this a low-regret decision, which is the right kind of decision when you're unsure.
5. **AWS is the right answer to a scale problem you don't have.** At 20–30 concurrent students, and even at 1,000, AWS buys you control you don't need and charges you weeks of setup for it. Go there when Supabase actually hurts — you'll know, and the migration is a week.

**One exception:** put the **audio on Cloudflare R2**, not in Supabase Storage. R2 charges nothing for egress; audio is 90%+ of your bandwidth. This is the single decision that keeps the bill near zero (carried over from `PLAN.md` §1).

**Final stack**

```
Frontend    React + Vite (evolve index.html/admin.html)  →  Cloudflare Pages
Database    Supabase Postgres + Row-Level Security
Auth        Supabase Auth, custom phone+PIN flow
API         Supabase client SDK + Edge Functions for privileged ops
Audio/media Cloudflare R2 (zero egress)
Optional    LAN mini-PC audio cache for the lab
```

> Note: move off Vercel Hobby — its terms bar commercial use and you're a paid institute. Cloudflare Pages has no such clause.

---

## 3. Roles & permissions

| Capability | Super Admin | Admin | Teacher | Invigilator | Student |
|---|:--:|:--:|:--:|:--:|:--:|
| Manage branches, billing | ✅ | — | — | — | — |
| Create/edit any user | ✅ | own branch | — | — | — |
| Create/edit tests | ✅ | ✅ | ✅ own | — | — |
| Publish test to library | ✅ | ✅ | — | — | — |
| Create batches | ✅ | ✅ | — | — | — |
| Assign test to batch/student | ✅ | ✅ | own batches | — | — |
| Unlock / extend deadline | ✅ | ✅ | own batches | during session | — |
| Extend plan validity | ✅ | ✅ | — | — | — |
| View results | all | branch | own batches | live session only | own |
| Override a mark | ✅ | ✅ | own batches | — | — |
| Release mock results | ✅ | ✅ | own batches | — | — |
| Take a test | — | — | — | — | ✅ |

Store as `roles` + `permissions` tables, not hardcoded strings, so a new role doesn't need a deploy.

---

## 4. Data model (core tables)

```
branches            id, name, address
users               id, phone (unique), country_code, name, email?, role_id,
                    branch_id, pin_hash, pin_must_change, failed_attempts,
                    locked_until, status, created_at
roles               id, name, permissions[]

student_plans       id, student_id, plan_name, starts_on, expires_on,
                    status(active|expired|suspended), created_by, notes
plan_history        id, plan_id, action(create|extend|suspend), old_expiry,
                    new_expiry, reason, actor_id, at        ← audit trail (A4)

batches             id, name, branch_id, starts_on, ends_on, status
batch_teachers      batch_id, teacher_id
batch_students      batch_id, student_id, joined_at, left_at

tests               id, title, skill(listening|reading|writing|speaking),
                    variant(academic|general), difficulty, duration_seconds,
                    total_marks, status(draft|published|archived), tags[],
                    created_by
test_sections       id, test_id, order, title, audio_url, passage_html
questions           id, section_id, order, type, prompt, options,
                    correct_answers[], marks, accepted_variants[]

assignments         id, test_id, mode(mock|practice|homework),
                    available_from, due_by, max_attempts, allow_review,
                    results_released, created_by, created_at
assignment_targets  assignment_id, target_type(batch|student), target_id
assignment_unlocks  assignment_id, student_id, unlocked_by, until  ← T2 override

attempts            id, assignment_id, test_id, student_id, mode,
                    started_at, submitted_at, time_remaining_seconds,
                    status(in_progress|submitted|expired|voided),
                    raw_score, band, tab_switches
answers             id, attempt_id, question_id, given_answer,
                    is_correct, marks_awarded, overridden_by, override_note,
                    answered_at
                                          ← §S5 mistakes view reads from here

audit_log           id, actor_id, action, entity, entity_id, meta, at
```

Key rules:

- `attempts.time_remaining_seconds` + autosaved `answers` = crash recovery (S7).
- Practice attempts (`mode='practice'`) are excluded from progress charts by default, toggleable.
- `questions.accepted_variants[]` handles "20" / "twenty" / "colour" / "color" without a teacher override every time.
- One RLS policy per table; students match on `student_id = auth.uid()`, teachers on batch membership.

---

## 5. Screens

### Student (mobile-friendly — they practise at home on a phone)
1. **Login** — country code + phone + PIN. First login forces PIN change.
2. **Home** — "Next up" card (assigned mock with countdown), plan validity strip, band trend sparkline.
3. **My Tests** — tabs: Assigned / Practice library / Completed. Locked items show *why* ("opens Mon 9:00").
4. **Test player** — existing player, plus autosave, review-flag per question, section navigator. Listening: audio non-rewindable in mock mode, free in practice.
5. **Result** — band, raw score, section breakdown, accuracy by question type.
6. **Review mistakes** — question list, your answer vs correct, passage highlighted / audio jump-to-timestamp.
7. **Progress** — band over time, Listening vs Reading, weakest question types, attempts count.

### Teacher
1. **Dashboard** — my batches, upcoming sessions, ungraded overrides, recent results.
2. **Batch view** — roster with each student's last band, attendance of attempts, expiry flags.
3. **Assign test** — pick test → pick batches/students → mode, window, attempts, review on/off.
4. **Live session monitor** — real-time grid of students × status/time left; force-submit, +time, unlock.
5. **Results & release** — batch results table, override marks, release button.
6. **Class analytics** — most-missed questions, weakest types, band distribution.

### Admin (adds to the above)
1. **Overview** — active students, tests taken this week, expiring plans (7/30 days), expired list, live sessions now.
2. **Students** — search, filter by batch/status/expiry; bulk CSV import; per-student drawer (plan, batches, history, reset PIN).
3. **Plans & validity** — the expiry workqueue: select many → extend by 1/3/6 months → reason → done.
4. **Batches** — CRUD, assign teachers, move students.
5. **Test library** — all tests, filter by skill/variant/difficulty, draft/published, answer-key editor (already built).
6. **Users & roles** — create admins/teachers, set permissions.
7. **Audit log** — who changed what.

---

## 6. Build phases

| Phase | Goal | Contents | Est. |
|---|---|---|---|
| **0. Foundations** | Nothing user-visible, everything depends on it | Supabase project, schema + RLS, seed data, React/Vite skeleton, migrate the 2 existing tests into the DB | 1 wk |
| **1. Auth + student core** | A student can log in and take an assigned test for real | Phone+PIN login, PIN change/lockout, student home, player wired to DB, autosave + crash recovery, result screen | 1.5 wk |
| **2. Admin essentials** | You can run a real batch without touching code | Student CRUD + CSV import, batches, plans/expiry with extend + audit, assignment engine with schedule windows, admin overview | 2 wk |
| **3. Teacher + review** | Teaching loop closes | Teacher dashboard, assign/unlock, live session monitor, mistakes review screen, mark override, release results | 2 wk |
| **4. Progress + analytics** | Students see improvement, teachers see gaps | Progress charts, per-question-type accuracy, class analytics, Excel export | 1 wk |
| **5. Practice at home** | Self-serve usage between classes | Practice library, practice mode rules, unlimited attempts, separate scoring bucket, mobile polish | 1 wk |
| **6. Hardening** | Safe to sell | Anti-cheat flags, notifications, backups, load test at 40 concurrent, LAN audio fallback, penetration sanity check | 1 wk |

**~9–10 weeks solo.** Phases 0–2 alone (≈4.5 wk) already replace your current localStorage prototype with something you can run a real batch on.

---

## 7. Decisions still open

1. **Mock results — auto-release or teacher-released?** Default proposed: mock = held for release, practice = instant.
2. **Practice library — all tests or a separate pool?** Reusing mock papers at home burns them. Suggest tagging tests `mock_only` vs `practice_ok`.
3. **Plan model** — is validity purely time-based (3 months), or also test-count based (20 mocks)? Schema above assumes time; adding a quota column is cheap now, awkward later.
4. **Multi-branch?** If a second centre is even possible, keep `branch_id` from day one (it's already in the schema).
5. **Writing/Speaking** — confirming they're out of scope, but `skill` column stays.
6. **Who owns content entry?** 40-question answer keys per test is the real bottleneck, not code. Budget someone's time for it.

---

## 8. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| 30 students downloading a 9 MB MP3 simultaneously on lab wifi | Session collapses | Cloudflare R2 + preload audio before the timer starts; LAN mini-PC cache (~₹12,000) as fallback |
| Power/browser crash mid-mock | Lost attempt, angry student | Autosave every 10s + server-side remaining-time |
| Phone number reused / student changes number | Locked-out student | Admin can change the number on the account; audit it |
| PIN sharing between students | Cheating | One active session per account; flag concurrent logins |
| Content entry backlog | Platform with nothing to test on | Bulk import from your Word files; keep the existing key-editor screen |
| Free-tier limits hit silently | Outage mid-session | Alerts on Supabase usage at 70% |

---

## 9. Cost (rough, monthly, INR)

| Scale | Supabase | R2 | Pages | Domain | Total |
|---|---|---|---|---|---|
| ≤100 students | ₹0 (free tier) | ₹0 | ₹0 | ₹75/mo | **~₹75** |
| 100–500 | ₹2,100 (Pro) | ₹0–100 | ₹0 | ₹75 | **~₹2,300** |
| 500–2,000 | ₹2,100 + usage | ₹200–500 | ₹0 | ₹75 | **~₹3,000–4,000** |

SMS only enters the picture if you later add OTP reset or reminders (~₹0.15–0.25/message).

---

## 10. Immediate next steps

1. Confirm the six open decisions in §7.
2. Create the Supabase project and apply the schema (§4) — can be done in this session.
3. Migrate `tests/reading-er-01.js` and `tests/listening-t1.js` into the DB, **with their answer keys** (still empty — this blocks everything downstream).
4. Build Phase 1 login + player, test it with 2–3 real students before scaling to a batch.

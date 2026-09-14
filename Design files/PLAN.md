# IELTS Reading + Listening Test Platform — Plan & Costing

Scope: in-house daily practice tests, ~100 students concurrently, Chrome browser, login + role management, mock-test mode.
Prices Aug 2026, INR. Rates marked *(est.)* are from memory, not verified this session — confirm before committing.

---

## 1. Recommended cheap solution

**Stack (₹0/month to start):**

| Layer | Choice | Cost |
|---|---|---|
| Frontend | Existing `index.html` player, rebuilt as a small React/Vite app | ₹0 |
| Hosting | Cloudflare Pages (unlimited bandwidth, free) | ₹0 |
| Auth + DB + API | Supabase free tier (Postgres, row-level security, 50k users) | ₹0 |
| **Audio files** | **Cloudflare R2 — 10 GB storage, zero egress fees** | ₹0 |
| Domain | .in or .com | ~₹900/yr |

**Why R2 matters:** 100 students × ~30 MB of listening audio = **~3 GB per test session**. Daily use = ~60 GB/month. That destroys Vercel's and Supabase's bandwidth allowances but is free on R2, which charges nothing for egress. This single choice is what keeps the bill at zero.

**Fallback if lab internet is slow:** run a mini PC (Intel N100, ~₹12,000 *(est.)*) on the lab LAN serving audio locally, cloud only for logins and results. Removes all internet dependency during the test.

**Move off Vercel Hobby.** Its terms prohibit commercial use — a paid coaching institute counts. Cloudflare Pages has no such restriction.

---

## 2. Roles & access

| Role | Can do |
|---|---|
| **Super Admin** | Everything; create branches, manage all users, billing/settings |
| **Manager** | Create teachers/students in their branch, assign tests, view all results, publish/unpublish tests |
| **Teacher** | Create & edit tests, assign to their batches, start/stop sessions, view + override marks for their students |
| **Invigilator** | Start/stop a live session, monitor progress, grant extra time, reset a stuck attempt. No content editing. |
| **Student** | Take assigned tests, view own results only |

Model as `roles` + `permissions` tables (not hardcoded strings) so new roles can be added without a code change. Scope everything by `branch_id` and `batch_id`.

---

## 3. Data model (core tables)

```
users            id, name, email/username, password_hash, role_id, branch_id, active
batches          id, name, branch_id, teacher_id
batch_students   batch_id, student_id
tests            id, title, type (listening|academic_reading|gt_reading), status, created_by
sections         id, test_id, order, passage_html, audio_url
questions        id, section_id, order, type, prompt, options, correct_answers[], marks
assignments      id, test_id, batch_id | student_id, opens_at, closes_at, duration_min, mode (practice|mock)
attempts         id, assignment_id, student_id, started_at, submitted_at, status, raw_score, band
answers          attempt_id, question_id, value, flagged, updated_at
audit_log        actor_id, action, target, timestamp
```

Many-to-many via `assignments` + `attempts` gives you 1 student → many tests and 1 test → many students, with each attempt independent.

---

## 4. Test mechanics to build

**Listening** — 4 parts, 40 questions, ~30 min audio + 10 min transfer (paper) / 2 min check (computer). Audio plays **once, straight through**, no pause/rewind, no seek bar. Volume control only. One shared timer for the whole test.

**Reading** — Academic: 3 passages, 40 questions, 60 min, no extra transfer time. General Training: 5 sections across 3 parts, 40 questions, 60 min.

**Question types (build all of these):** multiple choice single, multiple choice multi-answer, True/False/Not Given, Yes/No/Not Given, matching headings, matching information, matching features, matching sentence endings, sentence completion, note/table/flow-chart/summary completion (with and without word bank), diagram/map/plan labelling, short answer.

**Marking rules:** 1 mark each, no negative marking. Case-insensitive. Accept both British and American spelling. Enforce word limits ("NO MORE THAN TWO WORDS AND/OR A NUMBER") — over the limit = 0. Hyphenated words count as one. Store multiple accepted answers per question. Plural mismatch = wrong.

**Scoring:** raw /40 → band via a lookup table, kept editable in admin (not hardcoded), since official conversions vary by paper. Roughly: L 39-40→9.0, 37-38→8.5, 35-36→8.0, 32-34→7.5, 30-31→7.0, 26-29→6.5, 23-25→6.0, 18-22→5.5, 16-17→5.0. Verify against a current Cambridge book before go-live.

---

## 5. Computer-delivered IELTS UI to replicate

Students should see something familiar on test day:

- Split screen: passage left, questions right, draggable divider
- Countdown timer top-right, warnings at 10 min and 5 min
- Question palette along the bottom — numbers, answered/unanswered state, flag-for-review
- Highlight + add-note on passage text (right-click menu)
- Live word count on text answers
- Font size and contrast settings
- Volume slider + headphone check screen before Listening starts
- **Auto-save every 5–10 seconds** and on every keystroke pause; resume exactly where they left off after a crash or refresh
- Hard auto-submit at time expiry
- Mock mode: no answers or score shown until the invigilator releases results; practice mode: instant feedback with explanations

---

## 6. Handling 100 concurrent students

Not a hard problem at this size, but three things will break if ignored:

1. **Audio** — pre-load the full file before the timer starts, not streamed mid-test. Serve from R2 or LAN. Never from a bandwidth-metered host.
2. **Auto-save writes** — 100 students × 1 write/8s = ~12 writes/sec. Fine for Postgres, but **debounce and batch** rather than one request per keystroke, or you'll hit rate limits.
3. **Offline resilience** — keep answers in browser `localStorage` as the source of truth and sync to server in the background. If the lab's internet drops mid-test, nobody loses work.

Also: a bulk "start session" button so the invigilator releases the test to all 100 at once, and a live monitor grid showing who's started, progress, and time left.

---

## 7. Costing

### Option A — build it yourself / hire cheap (recommended)

| Item | One-time | Monthly |
|---|---|---|
| UI/UX design, ~18 screens (India freelancer) *(est.)* | ₹15,000–30,000 | — |
| Development — Tier-2 city freelancer, ~150–200 hrs @ ₹400–700/hr *(est.)* | ₹60,000–1,40,000 | — |
| Cloudflare Pages + R2 + Supabase free tier | ₹0 | **₹0** |
| Domain | ₹900/yr | — |
| **Total** | **₹75,000–1,70,000** | **₹0** |

Skip the designer entirely and use a free Tailwind/shadcn admin template to save the ₹15–30k. The test player itself needs custom design; the dashboards don't.

### Option B — Indian dev agency
₹3,00,000–8,00,000 one-time *(est.)*, plus ₹5,000–15,000/month AMC. Faster and lower-risk, 4–5× the price.

### Option C — off-the-shelf
Existing IELTS mock platforms sold to institutes typically charge per student per month. At 300–500 students that runs into tens of thousands monthly and never stops — worse than Option A within a few months, and you can't add your own papers freely. Moodle self-hosted is free but cannot do single-play audio or the CD-IELTS layout without significant custom plugin work.

### Recurring costs once you outgrow free tiers
Only two things will ever push you off ₹0: Supabase database size (500 MB free — that's roughly 2–3 years of attempt data at your volume) and R2 storage past 10 GB (~100 listening tests).

| Trigger | Upgrade | Monthly |
|---|---|---|
| DB > 500 MB or need daily backups | Supabase Pro ($25) | ~₹2,300 |
| Audio library > 10 GB | R2 paid (~$0.015/GB) | ~₹50–200 |
| Want full self-hosting | Hostinger India VPS *(est.)* | ~₹500–900 |

**Realistic year-1 total: ₹75,000–1,70,000 one-time, ₹0–2,500/month.**

---

## 8. Build order

1. **Phase 1 (2–3 weeks)** — Auth + roles, student dashboard, test player for Reading only, auto-scoring, results. Ship to one batch.
2. **Phase 2 (2 weeks)** — Listening with audio, single-play enforcement, headphone check.
3. **Phase 3 (2 weeks)** — Teacher test builder UI (so you stop hand-editing files), all remaining question types.
4. **Phase 4 (1–2 weeks)** — Mock mode, invigilator live monitor, bulk session start, analytics per student/batch.
5. **Phase 5** — Band-score trend reports, question-level difficulty analysis, PDF result slips.

Run Phase 1 alongside the existing static player rather than replacing it — you keep classes running while the new system is proven.

---

## Open decisions for you

1. **Login method** — email + password, or roll/admission number + PIN? The second is far easier for a classroom and avoids students needing email.
2. **Where does test content come from?** Your own typed papers, or scanned Cambridge books? This decides whether Phase 3's builder needs a PDF/Word import path.
3. **Single branch or multiple?** Building `branch_id` in from day one costs almost nothing; retrofitting it is painful.
4. **Writing and Speaking later?** If yes, leave room in the data model now — Writing needs manual grading and a teacher review queue.

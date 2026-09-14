# IELTS Platform — Master Design Prompt

> **How to use:** copy everything below the line into Claude Design (or any design tool) as a single prompt. It contains the design system, the rules, and every screen. If the tool struggles with the length, run Part A (design system) first, then paste Part C screens in batches of 3–4.

---

You are designing the complete UI for **an IELTS practice-test platform** used by a coaching institute in India. It has three kinds of users: **students** (age 16–30, often first-time computer users, testing in a noisy lab under time pressure), **teachers**, and **admins**.

Design the full system described below: a design system first, then every screen. Output clean, modern, production-ready screens.

## THE ONE RULE THAT OVERRIDES EVERYTHING

**A 10-year-old must be able to use the student side without being told how.**

Concretely, this means:

- On any student screen there is **exactly one obvious next action** — one big primary button. Everything else is visibly secondary.
- **Words over icons.** Never a bare icon for a real action. Icons only ever *accompany* a label. No hamburger menus on the student side.
- **Plain language.** "Start Test", "See My Mistakes", "Practice at Home". Never "Dashboard", "Submit Assessment", "Analytics", "Session Expired".
- **Big targets.** Minimum 48×48px tappable, primary buttons 56px tall.
- **No nesting.** Nothing important is more than 2 taps from the student home screen.
- **Say what's happening and what to do.** Every locked, empty or error state explains the reason in one sentence and offers a way forward.
- If a screen needs an explanation, it's designed wrong. Simplify it.

The **teacher and admin** sides may be denser and more information-rich — those are power users doing repetitive work — but must use the same visual language.

---

# PART A — DESIGN SYSTEM

Produce a design-system sheet with all of the following, then use it consistently in every screen.

## A1. Personality

Calm, confident, encouraging. This is a high-anxiety product — people are being tested. The UI must reduce stress, never add to it. **Not** playful/childish, **not** corporate/cold. Think "a good teacher's handwriting on a clean whiteboard": friendly, clear, serious about the work.

Avoid: gradients everywhere, glassmorphism, neon, heavy shadows, decorative illustrations that carry no meaning, dark patterns, dense dashboards on the student side.

## A2. Color

Light theme is primary. Design a dark theme for the palette too, but all screens are shown in light.

| Token | Value | Use |
|---|---|---|
| `--brand` | `#1D4ED8` (deep blue) | Primary buttons, active nav, links, focus |
| `--brand-hover` | `#1E40AF` | Hover/pressed |
| `--brand-soft` | `#EFF4FF` | Selected rows, info panels, active chips |
| `--success` | `#15803D` | Correct answers, passed, active plan |
| `--success-soft` | `#ECFDF3` | Correct-answer row background |
| `--warning` | `#B45309` | Expiring soon, time running low |
| `--warning-soft` | `#FFFBEB` | Warning banners |
| `--danger` | `#B42318` | Wrong answers, expired, destructive |
| `--danger-soft` | `#FEF3F2` | Wrong-answer row background |
| `--ink` | `#111827` | Primary text |
| `--ink-2` | `#4B5563` | Secondary text |
| `--ink-3` | `#9CA3AF` | Hints, placeholders, disabled |
| `--line` | `#E5E7EB` | Borders, dividers |
| `--surface` | `#FFFFFF` | Cards, inputs |
| `--bg` | `#F7F8FA` | Page background |

**Never use color alone to carry meaning.** Correct/wrong always pair the color with an icon (✓ / ✕) **and** a word ("Correct" / "Your answer"). Some students are colour-blind; all of them are stressed.

Contrast: everything meets WCAG AA (4.5:1 body text, 3:1 large text and UI borders).

## A3. Typography

One family: **Inter** (fallback: system-ui, Segoe UI, Roboto). No second display font.

| Token | Size / Line / Weight | Use |
|---|---|---|
| `display` | 32/40, 700 | Result band score, big numbers |
| `h1` | 24/32, 700 | Screen title |
| `h2` | 20/28, 600 | Section heading |
| `h3` | 17/24, 600 | Card title |
| `body` | 16/26, 400 | Default. **Never below 16px for students** |
| `body-strong` | 16/26, 600 | Emphasis, labels |
| `small` | 14/20, 400 | Metadata, timestamps — admin/teacher only |
| `mono` | 16/24, 500, tabular | Timers, scores, phone numbers |

Reading passages and question text: 17px, line-height 1.7, max ~70 characters per line. This is a reading test — legibility is the product.

## A4. Space, shape, depth

- **Spacing scale (8pt):** 4, 8, 12, 16, 24, 32, 48, 64. Nothing off-scale.
- **Radius:** 8px inputs/buttons, 12px cards, 999px pills/chips.
- **Elevation:** almost none. Cards use a 1px `--line` border on `--surface`. One soft shadow (`0 1px 3px rgba(16,24,40,.06)`) reserved for modals, dropdowns and sticky bars only.
- **Layout:** 12-column desktop, max content width 1200px; single column mobile with 16px gutters. Comfortable whitespace — crowded screens read as "hard".

## A5. Components to design

Design each with **all states**: default, hover, focus (visible 2px `--brand` ring — keyboard users exist), active, disabled, loading, error.

1. **Buttons** — Primary (filled brand, 56px student / 40px admin), Secondary (white + border), Ghost (text only), Danger. Full-width on mobile.
2. **Text input / PIN input** — large label above (never placeholder-as-label), 56px tall, error message below in `--danger` with an icon. PIN input: 4 separate large boxes, numeric keypad, dots masked, with a "show" toggle.
3. **Phone input** — fixed `+91` prefix chip + 10-digit field.
4. **Card** — the workhorse. Title, optional meta row, body, one action.
5. **Status pill** — Not started / In progress / Submitted / Locked / Expired / Active. Icon + word + soft background.
6. **Big countdown timer** — mono, tabular, sticky. Calm grey → `--warning` at 5 min → `--danger` + gentle pulse at 1 min. Never flashing red-alarm styling.
7. **Question navigator** — grid of numbered squares 1–40. Four states: unanswered (white/border), answered (filled soft brand), flagged for review (small corner dot in warning), current (brand ring). Legend always visible.
8. **Answer widgets**, one per question type: short text, radio (single MCQ), checkbox with "choose 2" counter, True/False/Not Given as three big segmented buttons, Yes/No/Not Given, matching (dropdown per item), note/gap-fill inline in a paragraph.
9. **Audio player** — huge play button, waveform or plain progress bar, elapsed/total, volume. **Mock mode: no seeking, no replay** — show a small lock note "You can't rewind in a real test". **Practice mode: full controls + speed.**
10. **Band score display** — the hero: number 0–9 at `display` size, out of 9, with a short plain-English descriptor ("Good user").
11. **Data table** (admin/teacher) — sticky header, zebra-free, row hover, checkbox multi-select, sticky bulk-action bar appearing at the bottom when rows are selected, sort, pagination.
12. **Filter chips + search bar** for lists.
13. **Modal / confirm dialog** — one question, two buttons, destructive action always the secondary-styled one.
14. **Toast** — top-right desktop, bottom mobile, auto-dismiss, never for errors that need action.
15. **Empty state** — friendly one-line explanation + one action. Design one for: no tests assigned, no results yet, no students in batch, no search results.
16. **Loading** — skeleton blocks matching final layout. No spinners on full pages.
17. **Banner** — info / warning / danger, one line, optional action link. Used for plan expiry.
18. **Stat card** (admin) — big number, label, small trend delta.
19. **Simple line chart** (band over time) and **horizontal bar chart** (accuracy by question type). Minimal axes, no gridline clutter, labelled directly rather than with a legend.
20. **Navigation** —
    - **Student:** bottom tab bar on mobile / top bar on desktop, **max 4 items with labels**: Home · My Tests · Progress · Profile.
    - **Teacher/Admin:** left sidebar, collapsible, labelled icons, grouped.

---

# PART B — GLOBAL BEHAVIOUR

- **Mobile-first for students** (they practise at home on phones), **desktop-first for teacher/admin**. Show student screens at 390px *and* 1280px.
- **Test player is desktop/lab-first** (1280px+) but must not break on tablet.
- Every destructive or irreversible action gets a confirm dialog naming what will happen.
- Every list has a designed empty state.
- Timers, scores and phone numbers use tabular mono figures so they don't jitter.
- Language: English, simple, short sentences. Assume the reader is nervous.

---

# PART C — SCREENS

Design every screen below. For each, show the default state plus the noted variants.

## C1. STUDENT (mobile 390px + desktop)

**1. Login**
Logo, one line of welcome, `+91` phone field, "Continue". Then PIN screen: 4 large boxes, "Forgot PIN? Ask your teacher." Nothing else on the page. No signup link — accounts are created by admin.
*Variants:* wrong PIN (inline error, "2 tries left"), account locked, account expired.

**2. First-login PIN change**
"Create your PIN" — enter new PIN, confirm PIN, one sentence on why. Single primary button.

**3. Student Home** — the most important screen in the product.
Top: "Hi Priya 👋" and, if relevant, a plan-expiry banner ("Your access ends in 5 days").
Then **one big "Next up" card**: test name, Listening/Reading badge, mock-vs-practice badge, when it opens or closes, duration, and a 56px **"Start Test"** button. If nothing is due, this card becomes "Practice at home" instead.
Below: three simple tiles — **My Tests**, **My Progress**, **My Mistakes** — each with a word and an icon.
Bottom: last band score as a single friendly line ("Last test: Band 6.5 in Reading").
Nothing else. No charts, no stats grid, no feed.
*Variants:* nothing assigned, plan expired (start button disabled with a clear reason).

**4. My Tests**
Three tabs: **To do** / **Practice** / **Done**. Each row is a card: test name, skill badge, status pill, and either a Start button or the reason it's locked ("Opens Monday 9:00 AM" / "You've used all 2 attempts"). Locked cards are visibly dimmed but readable.

**5. Pre-test instructions**
Before every mock: test name, number of questions, time allowed, 4–5 plain bullet rules ("The timer will not stop", "You cannot rewind the audio"), a headphone check for Listening with a **"Play test sound"** button, and one **"I'm ready — Start"** button. This screen prevents most support calls; make it calm and confident.

**6. Test player — Listening**
Sticky top bar: test name (left), big countdown (centre), Section 1 of 4 (right).
Audio player below it, prominent, non-seekable in mock.
Main area: questions for the current section, generous spacing, one question block per card.
Right rail (desktop) / collapsible sheet (mobile): question navigator grid + legend.
Sticky bottom: "Previous" · flag-for-review toggle · "Next", and on the last section a primary "Finish Test".
*Variants:* 5 minutes left, 1 minute left, audio not playing (error + retry help).

**7. Test player — Reading**
Split view: passage left (scrollable, 17px, comfortable measure, text-selection highlight allowed), questions right. Draggable divider on desktop; on tablet, a Passage/Questions toggle. Same top bar, navigator and bottom bar as above.

**8. Submit confirmation**
"You have 3 unanswered questions." List their numbers as clickable chips. Two buttons: "Go back" (primary) / "Submit anyway" (secondary). Never let a student submit blind.

**9. Result**
Hero: the **band number**, huge, with descriptor. Below: raw score ("32 out of 40"), a simple section-by-section bar, and time taken.
Two clear actions: **"See my mistakes"** (primary) and "Back to home".
*Variants:* results held ("Your teacher will release the result — you'll see it here"), practice result (instant, plus a "Try again" button).

**10. Review my mistakes**
The teaching screen. A summary strip (32 correct · 8 wrong), then a list of every wrong question: the question, **"Your answer: X" in red with ✕**, **"Correct answer: Y" in green with ✓**, and a "Show why" expander revealing the passage sentence highlighted, or a "Play this part" button that jumps the audio to the right timestamp. Filter toggle: "Show all questions / only my mistakes".

**11. My Progress**
A simple line chart of band over time (Listening and Reading as two clearly labelled lines). Below: a horizontal bar chart, **"What to practise"** — accuracy by question type, worst at the top ("True/False/Not Given — 41%"). Then a plain sentence of advice. Then tests-taken count and average band. Keep it to one screen; no filters, no date pickers.

**12. Practice at home**
Library of practice tests as cards, filterable by Listening/Reading only. Each shows difficulty and "You've done this 2 times". Practice rules stated once at the top in one line.

**13. Profile**
Name, phone, batch, **plan validity with a clear date and a progress bar of time used**, change PIN, log out. Nothing else.

## C2. TEACHER (desktop 1280px)

**14. Teacher dashboard** — my batches (cards with student count and average band), today's scheduled tests, "needs attention" list (results waiting to be released, marks flagged for override).

**15. Batch view** — roster table: student, last band, tests done, plan expiry (with warning pill if <7 days), last active. Row click opens a student drawer.

**16. Assign a test** — 3-step inline flow on one page: ① pick test from library (searchable list with skill/difficulty filters) ② pick who (batch chips + individual student search, showing a live "42 students selected" count) ③ set rules (mock or practice, available from, due by, attempts, allow review after). One "Assign" button. Show a plain-English summary sentence before confirming.

**17. Live session monitor** — the invigilator screen. Grid of student tiles: name, status pill, time remaining, questions answered (e.g. 18/40). Colour-coded but always labelled. Per-student actions: +5 minutes, force submit, unlock. Auto-refreshing; show a "last updated" stamp.

**18. Results & release** — table of attempts for one assignment: student, raw score, band, time, flags (tab switches). Multi-select → "Release results". A row expands to allow overriding a single answer's mark with a note.

**19. Class analytics** — band distribution bar chart, most-missed questions list, weakest question types for the batch. Designed to answer "what do I teach tomorrow?".

## C3. ADMIN (desktop 1280px)

**20. Admin overview** — four stat cards (active students, tests taken this week, plans expiring in 7 days, live sessions now), an "expiring soon" table with inline Extend buttons, and recent activity.

**21. Students list** — search + filters (batch, status, expiry). Table with multi-select. Sticky bulk bar: "Extend plan", "Move to batch", "Deactivate". Buttons: "Add student" and "Import CSV".

**22. Add / import students** — single-student form (name, phone, batch, plan start, plan length, PIN auto-generated and shown once). CSV import: upload → **column-mapping preview table with errors highlighted per row** → "Import 28 students, 2 rows have problems".

**23. Student detail drawer** — plan and validity timeline, batches, attempt history, reset PIN, change phone number, audit trail of changes.

**24. Plans & validity** — the expiry workqueue. Grouped: Expired / Expiring this week / Expiring this month. Multi-select → "Extend by 1 / 3 / 6 months or custom date" → reason field → confirm dialog stating exactly what will change ("28 students, new expiry 12 Mar 2027").

**25. Batches** — list + create/edit batch (name, branch, dates, assign teachers, add students).

**26. Test library** — grid or table of tests with skill, variant, difficulty, questions count, status (Draft/Published), tags. Filters. "Create test" button.

**27. Answer key editor** — a single table of 40 rows: question number, type, correct answer(s), accepted variants (chips, e.g. "20", "twenty"), marks. Fast keyboard entry, tab moves down, autosave indicator, progress "34 of 40 keys entered". This screen is used a lot — optimise for speed, not beauty.

**28. Users & roles** — user list with role badges; role permission matrix as a checkbox grid.

**29. Audit log** — filterable table: who, what, when, details.

## C4. SHARED

**30. Error / edge screens** — page not found; connection lost during a test (reassuring: "Your answers are saved. Reconnecting…"); test not available yet; session expired; browser unsupported.

---

# PART D — DELIVERABLES

1. **Design system sheet** — colors, type scale, spacing, radii, then every component in every state.
2. **All 30 screens**, student screens shown at both 390px and 1280px.
3. **Three annotated flows** — (a) student logs in and completes a mock, (b) teacher assigns a test and releases results, (c) admin imports students and extends plans.
4. **A one-page rationale** noting the accessibility choices and where the "a 10-year-old could use this" rule changed a decision.

Keep it simple. When in doubt, remove something.

# `lib/attempts`

**One responsibility:** a student's sitting of a test, from Start to marked — on the server.

| File | What it does |
|---|---|
| `answers.ts` | Pure. The one mapping between the player's values and `public.answers` rows (one row per numbered question), in all three directions: autosave, resume, and the scorer's input. |
| `band.ts` | Pure. The raw score a band chart (always out of 40) is read at, for papers of any size. |
| `clock.ts` | Pure. Seconds left, overdue, and the practice check-in rule — all arithmetic on the server's `expires_at`. |
| `finish.ts` | `server-only`. Closes an attempt as `submitted` or `expired` (secret-key client, after the caller proved ownership); a second close is a no-op. |
| `mark.ts` | `server-only`. `ensureMarked`: the only place an attempt is *marked* against `key.json`. Marks, looks up the band, writes `answer_marks` then `attempt_scores`. Idempotent. |
| `review.ts` | `server-only`, pure. Screen 10's rows: content + key + saved answers + the **stored** marks, joined per control. Called only after the release and `allow_review` gates. |
| `pause.ts` | `server-only`. `checkInPractice`: records a practice check-in and gives back time spent away. Mock/class untouched. Runs before every overdue check. |
| `load.ts` | `server-only`. Reads the student's own attempt through their RLS client, its pinned `content.json` from R2, their saved answers, and signs five-minute audio/image URLs scoped to the attempt. |

Rules this folder keeps (`CLAUDE.md`, `MVP-1.md` §7):

- **The server owns the clock.** `expires_at` is set by a database trigger; everything here reads it, nothing here computes a deadline.
- **The key never reaches the browser before release.** `key.json` is read by the scorer, and — only for a released attempt whose assignment allows review — by the review screen, which renders on the server.
- **An attempt is pinned to its `content_version`.** Re-importing a test never changes questions under someone mid-test.
- **Students write their own answers through RLS**, so a bug here still cannot write into someone else's attempt or after the deadline — the `answers_before_write` trigger refuses it for every role.

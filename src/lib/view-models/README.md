# `lib/view-models` — what a screen shows

**One responsibility:** the type of the data each screen renders. No queries, no
fixtures, no React. Types only, so this module compiles away to nothing.

## Why it exists

Screens were built before the queries (the front end and back end are worked in
parallel). These types are the contract between the two halves:

```
lib/view-models/student.ts   ← the contract (types)
lib/mock/student.ts          ← satisfies it today  (fixtures)
lib/queries/student.ts       ← satisfies it later  (Supabase)
app/(student)/**/page.tsx    ← renders it, and never changes when the source does
```

When a real query lands, it must return one of these types unchanged. If the
query can't, the type is wrong — fix the type and the screen together, in one
commit, rather than bending the screen around the query.

## Rules

- **Nothing here is a database row.** A view-model is what the screen *shows*:
  already joined, already resolved, already formatted where formatting needs a
  server (Indian dates, eligibility reasons, band descriptors).
- **UTC in, `Asia/Kolkata` out.** Raw instants are ISO-8601 UTC strings; anything
  a student reads has a pre-rendered `…Label` field beside it. A screen never
  calls `new Date()` to decide whether a test is open (`CLAUDE.md` §9).
- **Remaining time is a number of seconds, computed server-side** — never a
  deadline the browser subtracts from its own clock (`MVP-1.md` §7).
- **A lock always carries its reason.** `LockedReason` has no plain "locked"
  member on purpose, so a dimmed card can always say why it's dimmed.
- **No field may carry an answer key** into a list or card type. The single
  exception is `ReviewQuestion.correctAnswer`, which exists only inside
  `MyMistakes` — a screen that is built solely for a released attempt of the
  signed-in student.

# ADR 0006: The client holds no authority over anything affecting a score

- **Status:** Accepted
- **Date:** 2026-09-14
- **Origin:** `MVP-1.md` §3 D6

## Context

A browser can be edited by its user. A timer, score or answer state that the browser decides can be forged.

## Decision

The server — in the end Postgres — decides the clock, the attempt state, correctness and statistics. The browser only renders.

## Consequences

- `attempts.expires_at` is set by a database trigger from the test's duration; whatever the caller sends is ignored. Triggers also enforce the state machine and refuse answer writes after expiry for every role.
- Autosave is a Server Action sent when an answer changes (1.2 s after typing stops), with a 30 s heartbeat that re-syncs the clock. `localStorage` is crash recovery only.
- `answers.revision` must rise, so a replayed or out-of-order save is refused.
- `lib/scoring.ts` is server-only; CI fails the build if it reaches a client bundle.
- Correctness and scores live in `answer_marks` / `attempt_scores`, whose RLS shows a student nothing until the attempt is finished and released.
- Details: `docs/architecture.md` → *An attempt, end to end*; `docs/security.md`.

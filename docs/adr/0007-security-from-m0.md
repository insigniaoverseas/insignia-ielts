# ADR 0007: Security is designed in from the first milestone

- **Status:** Accepted
- **Date:** 2026-09-14
- **Origin:** `MVP-1.md` §3 D7

## Context

Students' personal data and exam answer keys are both in scope; retrofitting access control onto a live app is error-prone.

## Decision

Security controls ship with the feature they protect, starting in M0. RLS policies ship in the same migration as their table. A security review gates each milestone, and a full review precedes go-live (M9-07).

## Consequences

- Two independent gates on data: Postgres RLS and `lib/rbac.ts` (see `docs/security.md`).
- Every table is default-deny; grants are column-limited where secrets live.
- Nonce CSP, passage HTML sanitised on write and render, bundle guard in CI — see 0015 and `docs/security.md`.

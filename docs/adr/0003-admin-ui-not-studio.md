# ADR 0003: Build an admin UI; never ask staff to use Supabase Studio

- **Status:** Accepted
- **Date:** 2026-09-14
- **Origin:** `MVP-1.md` §3 D3

## Context

The institute's office staff are not technical. If enrolling a student or extending a plan needs the database console, a developer becomes part of every batch.

## Decision

Every routine staff task has a screen: invitations (single and CSV), students, plans and validity, batches, the test library and upload, the answer-key editor, users and roles, the audit log.

## Consequences

- The bootstrap Owner is the one exception: created once by hand in the Supabase dashboard, then `/setup` (see `PROJECT-MEMORY.md` §4, *The first Owner is linked, not invented*).
- Identity tables are read-only through the API; every staff write is a Server Action behind `lib/rbac.ts`, audit-logged.

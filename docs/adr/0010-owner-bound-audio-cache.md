# ADR 0010: The audio cache belongs to the student who cached it

- **Status:** Accepted
- **Date:** 2026-09-14
- **Origin:** `MVP-1.md` §3 D10

## Context

Lab PCs are shared. Without care, student B could play a cached recording of a test B has not sat yet.

## Decision

The cached recording is bound to its owner. Every read deletes anything cached by someone else, and signing out deletes everything. The R2 object is never touched.

## Consequences

- Ownership is part of the Cache API key (`/audio-cache/{ownerId}/…`, `lib/audio-cache-key.ts`) rather than a separate IndexedDB record — same guarantee, one store (`PROJECT-MEMORY.md` §4, 2026-10-10).
- `AudioCacheGuard` in the student layout runs the purge on every student page.

# ADR 0015: Nonce CSP for scripts; every page rendered per request

- **Status:** Accepted
- **Date:** 2026-09-15
- **Origin:** `PROJECT-MEMORY.md` §4, 2026-09-15 (M0-13)

## Context

The likeliest web vulnerability here is teacher-authored passage HTML. Sanitising can miss something; a script that has no nonce should still not run.

## Decision

Scripts: `'self' 'nonce-…' 'strict-dynamic'`, no `'unsafe-inline'` or `'unsafe-eval'` in production. Styles: `'self' 'unsafe-inline'`. `connect-src 'self'` — the browser never talks to Supabase. `src/proxy.ts` sets a fresh nonce per request, and the root layout awaits `connection()` so every page renders per request.

## Consequences

- Every page view runs the Worker (CPU against the 10 ms free limit).
- Static files (`/_next/static`, favicon, `/brand/`) bypass the proxy and get their headers from `public/_headers`.
- Rejected: `'unsafe-inline'` scripts; nonce styles (would break `style=""` progress bars and the toaster); SRI hash CSP.

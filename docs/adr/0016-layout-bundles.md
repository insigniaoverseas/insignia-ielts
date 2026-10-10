# ADR 0016: Each area loads its pages' data once and keeps it in the browser

- **Status:** Accepted
- **Date:** 2026-10-11
- **Origin:** `PROJECT-MEMORY.md` §4, 2026-10-10 / 2026-10-11 (M10-06, M10-07)

## Context

Tab switching was slow: each click paid several sequential Supabase round trips (~350 ms each from the office), and nothing was kept between clicks.

## Decision

The student, teacher and admin layouts each read every sidebar page's data in **one parallel round**, alongside the login check, and hand it to client views. Moving between those pages makes no database trip. `AutoRefresh` re-reads after a save (`revalidatePath`), every 60 s while someone is active, on return to the tab and on the first touch after idle — which also signs out a session ended on another device. Staff pages the person lacks permission for are withheld on the server with no data (`lib/bundle-slots.ts`).

## Consequences

- The login/session check stays on reads; it costs no time because it runs in the same round.
- `staleTimes.dynamic` stays 0 so the test player is never served from the router cache.
- The mistakes review is fetched by the result screen and held in the student layout's state, wiped on log out. It holds the correct answers that student may already see; the answer key never leaves the server.
- Limited admins still run the (RLS-scoped) queries of pages they cannot open; the data is dropped server-side.
- Rejected: dropping auth on reads, a 30–60 s idle logout, Supabase Realtime for sign-outs, GraphQL.

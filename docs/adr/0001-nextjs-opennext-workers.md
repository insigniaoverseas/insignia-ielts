# ADR 0001: Next.js 16 on Cloudflare Workers via OpenNext

- **Status:** Accepted
- **Date:** 2026-09-14
- **Origin:** `MVP-1.md` §3 D1

## Context

The product needs server rendering (the answer key and test content must stay on the server), Server Actions for autosave, and cheap hosting in India for a coaching institute. Vercel Hobby forbids commercial use.

## Decision

Build on **Next.js 16 App Router, React 19 and TypeScript**, deployed to **Cloudflare Workers** with `@opennextjs/cloudflare`. Avoid `@vercel/*` packages so hosting stays a swap, not a rewrite. App code lives under `src/`.

## Consequences

- Cloudflare's Indian points of presence serve the app; R2 sits in the same network with no egress fee (see 0004).
- Workers Free limits shape the design: 100,000 requests/day (resets 05:30 IST), 10 ms CPU per request, 50 subrequests per request. See `docs/architecture.md` → *Budget*.
- Next 16's `proxy.ts` runs on OpenNext but is labelled experimental; it is kept small (`src/proxy.ts`).
- `npm run start` is plain Node; `npm run preview` (or `wrangler dev` on the built Worker) is the real runtime locally.
- Workers Builds must run `npx opennextjs-cloudflare build`, never `npm run build` alone (`docs/runbook.md`).

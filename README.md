# Insignia IELTS

IELTS Listening and Reading practice tests for a coaching institute in India: students take timed mock, class and practice tests; teachers assign, monitor and release results; admins run students, plans, batches and the test library.

**Next.js 16 on Cloudflare Workers (OpenNext) · Supabase Postgres (Mumbai) with Row-Level Security · Cloudflare R2 for content and audio.**

## Start here

1. [`CLAUDE.md`](CLAUDE.md) — the entry point and the non-negotiables
2. [`MVP-1.md`](MVP-1.md) — what to build and how it must behave
3. [`PROJECT-MEMORY.md`](PROJECT-MEMORY.md) — where the project is
4. [`docs/`](docs/README.md) — architecture, data model, security, question types, runbook, decision records

## Run it

```sh
npm ci
cp .dev.vars.example .dev.vars   # fill in the values
npm run dev                      # Node, http://localhost:3000
npm run preview                  # the real Cloudflare runtime, with R2
```

Checks: `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:db`, `npx next build && npm run check:bundle`.

**Deploying is merging to `main`** — Cloudflare Workers Builds builds every branch as a preview and `main` as the live site. Don't deploy from a laptop with `npm run deploy`. Details: [`docs/runbook.md`](docs/runbook.md).

## The rules that matter most

- The server owns the timer; scoring never runs in the browser; the answer key never leaves the server.
- A student can never read another student's data — Postgres RLS **and** `lib/rbac.ts`.
- No public signup: every account starts as an invitation.
- This repository is public: no secret values, no source papers, no answer keys.

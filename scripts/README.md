# `scripts`

**One responsibility:** command-line tools run by developers and CI — never imported by the app.

| Script | Run with | What it does |
|---|---|---|
| `check-client-bundle.mjs` | `npm run check:bundle` (after `next build`) | Fails if the browser bundle (`.next/static`) contains anything server-only: answer-key fields or paths, scoring functions, the Supabase secret key. CI runs it on every push. |

Coming later (MVP-1 §15): `import-test.ts` and `import-legacy-tests.ts` (M0-17, M0-20).

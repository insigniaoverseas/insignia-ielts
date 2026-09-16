# Insignia IELTS — agent entry point

An IELTS Listening + Reading practice-test platform for a coaching institute in India.

## Read these files first, in this order

1. **[`MVP-1.md`](MVP-1.md)** — the contract. What to build, how it must behave, what it must never do.
2. **[`PROJECT-MEMORY.md`](PROJECT-MEMORY.md)** — where the project actually is. Pick the next `todo` task from its status board.
3. **[`BUILD-STEPS.md`](BUILD-STEPS.md)** — the ordered walkthrough. 103 steps, dependency-sequenced, with commands and a "done when" for each.

Then build. **Update `PROJECT-MEMORY.md` in the same commit as the work** — never as a batch afterwards.

## Non-negotiables

These are not preferences. Breaking one is a defect, not a style choice.

1. **The server owns the timer.** `attempts.expires_at` is set server-side; the browser only renders a countdown. Never trust a client clock.
2. **Scoring never runs in the browser.** `lib/scoring.ts` is server-only. If it ships to the client, the answer key ships with it — CI fails the build on this.
3. **The answer key never leaves the server.** `key.json` is read through the R2 binding inside a Server Action. It is never signed, never in a response body, never in a bundle.
4. **A student can never read another student's data.** Two independent gates: Postgres RLS *and* `lib/rbac.ts`. Every table is default-deny.
5. **RLS policies ship in the same migration as the table.** Retrofitting them is miserable.
6. **One audio file per test**, fully downloaded before the timer starts. Section navigation never seeks or re-requests it.
7. **No public signup route exists.** Every account starts as an admin invitation.
8. **Sanitise teacher-authored HTML** on write *and* on render. Passages are the likeliest XSS vector in this product.
9. **Store UTC, render `Asia/Kolkata`.** Never `new Date()` on the client for scheduling.
10. **Never commit a secret.** Names and locations go in `PROJECT-MEMORY.md` §6; values go in Wrangler secrets.

## The design rule that overrides everything

**A 10-year-old must be able to use the student side without being told how.** One obvious action per screen. Words over icons. Plain language — "Start Test", not "Begin Assessment". Nothing below 16px. Nothing more than two taps from home. If a screen needs an explanation, it is designed wrong.

Teacher and admin sides may be denser — they are power users — but use the same visual language. See [`Design files/DESIGN-PROMPT.md`](Design%20files/DESIGN-PROMPT.md) and `MVP-1.md` §15.

## Definition of done

- [ ] It works, and you ran it — not just typechecked it.
- [ ] Typecheck, lint and tests pass.
- [ ] Any `MVP-1.md` §7 rule it touches has a test.
- [ ] Any `MVP-1.md` §8 threat it touches is addressed, not deferred.
- [ ] Exported functions have TSDoc; new modules have a `README.md`.
- [ ] `PROJECT-MEMORY.md` updated in the same commit.

## Commits

Conventional commits, referencing the task ID:

```
feat(player): server-authoritative timer (M2-08)
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

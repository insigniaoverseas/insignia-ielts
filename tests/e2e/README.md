# `tests/e2e`

**One responsibility:** the `MVP-1.md` §19 checks that only a real browser against a running app can prove (M9-07). The rest of §19 is proven lower down — see the table.

## Running

Start the app first (it needs `.dev.vars`; locally, Turnstile's test keys — see `.dev.vars.example`), then:

```sh
npm run test:e2e                     # Playwright's Chromium (npx playwright install chromium once)
E2E_CHANNEL=chrome npm run test:e2e  # or your installed Google Chrome
E2E_BASE_URL=https://… npm run test:e2e  # against a preview instead of localhost
```

| File | Needs | Writes anything? |
|---|---|---|
| `public.spec.ts` | nothing (`SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY` for one check) | **No** — safe against production |
| `student-loop.spec.ts` | `E2E_STUDENT_A_EMAIL/PASSWORD`, `E2E_STUDENT_B_EMAIL/PASSWORD`, `E2E_LISTENING_REF` | **Yes** — signs two students in (ending their other sessions), starts and submits one real attempt. **Test accounts only.** Skipped when unset. |

`E2E_LISTENING_REF` is an assignment id (or `practice:{testId}`) for a published Listening **mock** that student A may start now, with attempts to spare. Student B must be a different student who cannot see A's attempt.

## Where each §19 check is proven

| # | Check | Proven by |
|---|---|---|
| V1 | Reload mid-test resumes with server time | `student-loop.spec.ts` |
| V2 | Browser clock override doesn't move the test clock | `student-loop.spec.ts` |
| V3 | Timer runs out with the tab closed → expired | `lib/attempts/clock.ts` unit tests + DB trigger tests; ⬜ no E2E (needs a short test) |
| V4 | Replayed autosave refused (`revision`) | `tests/db` (trigger, every role) |
| V5 | No endpoint accepts a score | `tests/db` (no student write on scores/marks) |
| V6 | No key in any response during a mock | `student-loop.spec.ts` |
| V7 | No scoring/key paths in the client bundle | `npm run check:bundle` (CI) |
| V8 | `key.json` never signable | `tests/unit/r2.test.mjs` |
| V9 | Transcript refused before release | `tests/unit/r2.test.mjs` (no transcript route exists yet) |
| V10 | Student B → A's attempt/result/review: 404 at the route | `student-loop.spec.ts` |
| V11 | Same with the route bypassed: empty at RLS | `tests/db` + `test:db:sweep` |
| V12 | No matching policy → nothing | `tests/db` |
| V13 | Section navigation never re-requests audio | `student-loop.spec.ts` |
| V14 | Next student on the machine inherits no audio | `student-loop.spec.ts` + `tests/unit/audio-cache.test.mjs` |
| V15 | Timer can't start before the audio is in | `student-loop.spec.ts` |
| V16 | No signup route; Auth signups disabled | `public.spec.ts` |
| V17 | No PIN, password required | `public.spec.ts` |
| V18 | Dead invite/reset link explains itself | `public.spec.ts` (unknown token); ⬜ reused/revoked token needs fixtures |
| V19 | Invite above the inviter refused | `tests/unit/permissions.test.mjs` |
| V20 | Every canonical type renders/scores | ⬜ needs authored content per type |
| V21–V22 | MCP refusals, publish completeness | ⬜ MCP not built (M8); publish CHECK is in the schema |
| V23 | `<script>` stripped on write and render | `tests/unit/sanitize.test.mjs`, `tests/unit/review.test.mjs` |

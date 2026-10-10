# Runbook

How to run, change, deploy and operate Insignia IELTS. Names and locations only — **never paste a secret value into this file or the repository**; the repository is public.

## Where everything is

| Thing | Name | Where |
|---|---|---|
| Live site | `https://insignia-test.yellow-moon-d66b.workers.dev` (until the real domain is set) | Cloudflare → Workers → `insignia-test` |
| Branch previews | `https://<branch-slug>-insignia-test.yellow-moon-d66b.workers.dev` | built automatically for every pushed branch |
| Database | Supabase project `insignia-ielts`, ref `zpqszkwavnjomxjgimni`, **`ap-south-1`** (cannot be changed) | supabase.com dashboard |
| Test content and keys | R2 bucket `insignia-ielts-content`, binding `CONTENT_BUCKET` | Cloudflare → R2 (private, r2.dev off) |
| Audio | R2 bucket `insignia-ielts-audio`, binding `AUDIO_BUCKET` | Cloudflare → R2 (private, r2.dev off) |
| Email | Resend | needs `RESEND_API_KEY` and a verified sending domain |
| Secrets | `wrangler secret put <NAME>`; locally `.dev.vars` (gitignored) | names in `.dev.vars.example` and `PROJECT-MEMORY.md` §6 |

## Local development

```sh
git worktree add ../insignia-<task> -b <type>/<task> main   # one branch per task, own worktree
cd ../insignia-<task>
npm ci
cp .dev.vars.example .dev.vars    # then fill in the values (ask the user)
npm run dev                       # http://localhost:3000
```

- **Turnstile on localhost:** the real site key is refused off its listed hostnames. Use Cloudflare's published test keys locally — `TURNSTILE_SITE_KEY=1x00000000000000000000AA`, `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA` (also in `.dev.vars.example`). The widget then says "For testing only"; that's expected.
- **The real runtime:** `npm run dev` and `npm run start` run on Node. To run the actual Worker with the remote R2 buckets: `npm run preview`, or `npx opennextjs-cloudflare build && npx wrangler dev`. Needs `wrangler login`. Plain `next start` cannot reach R2 — anything reading the bucket (reviews, audio, previews) fails there with a `getCloudflareContext` error.
- **Prefetching only happens in production builds**, so the instant tab switching is visible only under `preview`, not `dev`.
- **Query timing:** `PERF_LOG=1` in the environment prints every Supabase request with its duration (`[db]  231 ms  GET users`).
- **`next dev` appends a block to `CLAUDE.md`** when an AI agent runs it. Expected; commit it once or leave it.

## Before opening a pull request

```sh
npm run typecheck
npm run lint
npm run test:unit
npm run test:db && npm run test:db:sweep   # if you touched a migration
npx next build && npm run check:bundle
```

CI (`.github/workflows/ci.yml`) runs all of these plus `npm audit --audit-level=high` on every PR. Fix an audit finding at its cause — never allow-list it.

**Definition of done** (`CLAUDE.md`): you ran it, the checks pass, rules and threats it touches have tests, exported functions have TSDoc, new modules have a README, and `PROJECT-MEMORY.md` is updated **in the same commit**.

## Deploying

**Merging to `main` deploys.** Cloudflare Workers Builds builds every branch as a preview and `main` as live.

- The dashboard build command must be `npx opennextjs-cloudflare build` and the deploy command `npx opennextjs-cloudflare deploy`.
- ⚠️ Never change `package.json` to `"build": "opennextjs-cloudflare build"` — it calls `npm run build` itself and recurses forever.
- Stacked PRs: land them with **Merge** or **Squash and merge**, never **Rebase** (rebasing replays commits and conflicts on `PROJECT-MEMORY.md`).

## Changing the database

1. Write a migration in `supabase/migrations/`. **RLS policies and grants go in the same migration as the table** — revoke Supabase's defaults, grant back named columns.
2. `npm run test:db` and `npm run test:db:sweep` (PGlite — no Docker needed).
3. `npx supabase db push --dry-run` lists what would change. Safe any time.
4. **The user runs the real `npx supabase db push`.** Agents don't write to the live database.
5. `npm run db:types` to regenerate `src/lib/supabase/database.types.ts`, and update [`data-model.md`](data-model.md).

`supabase login` needs a real terminal; run it in the VS Code terminal, never paste the token into chat.

## Secrets

- Set or rotate: `npx wrangler secret put <NAME>`, then redeploy or wait for the next deploy.
- `wrangler secret put` only works while the **newest** uploaded version is the deployed one — set secrets *before* pushing branches that upload previews.
- **`R2_SECRET_ACCESS_KEY` is the SHA-256 (64 hex) of the R2 API token's value**, not the token itself; the raw token gives `SignatureDoesNotMatch`.
- Rotating a key: create the new one → `secret put` → check the site → revoke the old one.
- `SUPABASE_SECRET_KEY` bypasses RLS: only ever a Wrangler secret, never in `wrangler.jsonc` vars, a client bundle or a document.

## Adding a test

1. Write the upload JSON ([`test-authoring.md`](test-authoring.md)) — or convert a paper with `npm run import:legacy-listening`.
2. Upload it at **Admin → Test library → Create test**, or from the command line:
   `npm run import:test -- ./test.json --actor <author-uuid> --dry-run`, then again without `--dry-run`.
   The actor must be an active user with `test:author`.
3. **A teacher checks every answer** in the answer-key editor, and plays the audio against the section markers.
4. Publish from the library. Fixing a key later re-marks everyone who already finished; changing questions, marks, word limits or audio needs a re-import (a new content version).

Source papers, their MP3s and upload JSON contain the answer key — **they never go into the repository** (`Sample test/` is gitignored).

## Running a lab session

**The day before**
- Assign the test to the batch with `available_from` 10–15 minutes before the start, so the audio downloads spread out.
- Check every student has an active plan (Admin → Plans & validity).
- Check today's Worker request count in the Cloudflare dashboard is well under 100,000 — over it, every page fails until 05:30 IST.

**On the day**
- Students sign in and open the test's start screen early; it shows "Getting your audio ready…" until the whole recording is downloaded. Nobody presses Start until it says ready.
- The invigilator opens Teacher → the session's live monitor (refreshes every 10 s): who is in, answers saved, time left, tab switches. Extra time and force-submit are there.
- A student whose screen freezes or whose power cuts out: sign in again and resume — answers are saved on every change and the server clock kept running.
- If 200 downloads at once choke the lab network: the fallback is a small PC on the lab LAN caching the audio (~₹12,000, `MVP-1.md` §12).

**After**
- Release results (Teacher → Results) unless the assignment releases automatically.

## Keeping Supabase awake

Supabase Free **pauses a project after about 7 quiet days**; logins then fail until someone presses **Resume** in the dashboard (data is kept 90 days). Daily use prevents it. Before a long holiday, plan a tiny daily scheduled request — or know where the Resume button is.

## Backups

⚠️ **There are none yet.** Supabase Free takes no backups, and the nightly dump plus a restore drill (M9-06) has been deferred. Until it exists, a disk failure loses every account, attempt and result.

Stopgap, run by the user from a machine with the Supabase CLI logged in:

```sh
npx supabase db dump --linked -f schema.sql
npx supabase db dump --linked --data-only -f data.sql
```

Keep the files **outside the repository** (it is public, and the data is personal). An untested backup is not a backup: M9-06 adds the nightly job (to a private R2 bucket, from GitHub Actions) **and** a drill that restores into a throwaway project.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Every page shows Cloudflare **error 1027** | Workers Free daily cap (100,000 requests) reached | Waits until 05:30 IST. Long-term: Workers Paid ($5/month), or fewer requests per test |
| "Too many requests" when a whole lab signs in | Supabase Auth's per-IP sign-in limit | Raise it in Supabase → Authentication → Rate Limits (pending, M1-01); open the test early so sign-ins spread out |
| `SignatureDoesNotMatch` from R2 | `R2_SECRET_ACCESS_KEY` is the raw token | Set the SHA-256 of the token value |
| `permission denied for table tests` | A request-scoped query selected a `tests.r2_*` column | Don't; rebuild keys with `src/lib/r2-keys.ts` |
| A list silently stops at 1,000 rows | PostgREST's row cap | Page with `selectAll` |
| `getCloudflareContext has been called without…` | Running under `next start` | Use `npm run dev` or `npm run preview` |
| Deploy fails: "Could not find compiled Open Next config" | Workers Builds ran `npm run build` | Dashboard build command → `npx opennextjs-cloudflare build` |
| `tsc` reports duplicate identifiers in `.next/types/* 2.ts` | iCloud Drive conflict copies (the main checkout lives in iCloud) | `find .next .open-next -depth -name "* 2*" -exec rm -rf {} +`; better, work in a worktree outside iCloud |
| Sign-in loops back to the form after a password reset or a second device | The session row was revoked — working as designed | Sign in again |

# `scripts`

**One responsibility:** command-line tools run by developers and CI — never imported by the app.

| Script | Run with | What it does |
|---|---|---|
| `check-client-bundle.mjs` | `npm run check:bundle` (after `next build`) | Fails if the browser bundle (`.next/static`) contains anything server-only: answer-key fields or paths, scoring functions, the Supabase secret key. CI runs it on every push. |
| `import-test.ts` | `npm run import:test -- path/test.json --actor <uuid> --dry-run` | Runs the one M0-17 validator/splitter with files beside the JSON. Remove `--dry-run` to upload to remote R2 and create an audited Supabase draft. Requires Cloudflare CLI login and Supabase values in `.dev.vars`; the actor must be active with `test:author`. |
| `import-legacy-tests.ts` | `npm run import:legacy-listening -- --help` | Converts the 40-question prototype Listening test into the canonical upload shape. It requires the real MP3 duration and four contiguous section-end timestamps because the legacy source has neither. With `--import`, it delegates to `import-test.ts`; it does not duplicate validation, splitting or remote writes. |

Generated JSON contains the answer key. Keep it outside `public/`, review it,
and use only the canonical importer to create the private R2 objects.

# `scripts`

**One responsibility:** command-line tools run by developers and CI — never imported by the app.

| Script | Run with | What it does |
|---|---|---|
| `check-client-bundle.mjs` | `npm run check:bundle` (after `next build`) | Fails if the browser bundle (`.next/static`) contains anything server-only: answer-key fields or paths, scoring functions, the Supabase secret key. CI runs it on every push. |
| `import-test.ts` | `npm run import:test -- path/test.json --actor <uuid> --dry-run` | Runs the one M0-17 validator/splitter with files beside the JSON. Remove `--dry-run` to upload to remote R2 and create an audited Supabase draft. Requires Cloudflare CLI login and Supabase values in `.dev.vars`; the actor must be active with `test:author`. |
| `import-legacy-tests.ts` | `npm run import:legacy-listening -- --help` | Converts a 40-question Listening paper, given as `--source` (an ES module exporting `TEST` and `QUESTIONS` in the design prototype's shape), into the canonical upload shape. It requires the real MP3 duration and four contiguous section-end timestamps because a source paper has neither. With `--import`, it delegates to `import-test.ts`; it does not duplicate validation, splitting or remote writes. |

The source paper and the generated JSON both contain the answer key, and this
repository is public. Keep them in an untracked directory — `Sample test/` is
gitignored for this — review the key, and use only the canonical importer to
create the private R2 objects.

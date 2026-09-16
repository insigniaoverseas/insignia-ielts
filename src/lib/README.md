# `lib`

Pure domain modules live at this level; integration-heavy areas use their own
subdirectory README.

## R2 storage

| File | Responsibility |
|---|---|
| `r2-keys.ts` | Pure server-generated key builders, strict key parser and attempt-scoped download policy. No credentials or runtime access. |
| `r2.ts` | `server-only` Cloudflare binding reads and five-minute S3-compatible presigned GET URLs via `aws4fetch`. |

Rules from `MVP-1.md` §14 are code, not caller convention:

- `content.json` and `key.json` can only be read through `CONTENT_BUCKET`.
- `key.json` is never signable, under any condition.
- `content.json` is never signable; React Server Components render it.
- audio and assets must match the attempt's test id and content version.
- transcripts additionally require `submitted` plus released results.
- every URL expires after 300 seconds; callers cannot request a longer TTL.
- author-supplied names never become R2 path segments. Asset keys use a
  server-derived ordinal and a fixed image extension.

Presigning needs `CLOUDFLARE_ACCOUNT_ID`, `R2_ACCESS_KEY_ID` and
`R2_SECRET_ACCESS_KEY`. Only the latter two are secrets. The API token should
be scoped to object read access on the two project buckets. Never use the
account-wide Wrangler OAuth token for application signing.

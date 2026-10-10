# ADR 0004: Postgres for people and results; R2 for content

- **Status:** Accepted
- **Date:** 2026-09-14
- **Origin:** `MVP-1.md` §3 D4

## Context

Test content (passages, questions, audio, images) is large and read-mostly; answer keys must never reach a browser; Supabase Free has 500 MB and 5 GB/month egress.

## Decision

**Supabase Postgres** (Mumbai, `ap-south-1`) holds users, sessions, roles, plans, batches, assignments, attempts, answers and scores. **Cloudflare R2** holds each test version's `content.json`, `key.json`, transcript, labelling images and its one audio file.

## Consequences

- There is **no `questions` table**. `answer_marks` carries `q_number`, `section_no` and `question_type`, denormalised at scoring time, so per-question and per-type analytics still work with SQL.
- Every attempt records the `content_version` it was scored against, so editing content never corrupts history. Key-only corrections are written in place and re-mark finished attempts (`PROJECT-MEMORY.md` §4).
- `tests.r2_*` path columns are never granted to API roles; server code rebuilds keys from id + version (`lib/r2-keys.ts`).
- Layout and signing rules: `docs/r2-layout.md`.

# Architecture decision records

One file per architectural decision: the context, what was chosen, and what follows from it. 0001–0013 are the founding decisions D1–D13 in `MVP-1.md` §3; later ones are promoted from `PROJECT-MEMORY.md` §4 when a day-to-day decision turns out to shape the architecture.

A decision is never edited away. When it changes, add an **Amendments** section (or a new ADR that supersedes it) and say why.

| # | Decision | Status |
|---|---|---|
| [0001](0001-nextjs-opennext-workers.md) | Next.js 16 on Cloudflare Workers via OpenNext | Accepted |
| [0002](0002-full-product-scope.md) | Scope: the full product, student + teacher + admin | Accepted |
| [0003](0003-admin-ui-not-studio.md) | Build an admin UI; never ask staff to use Supabase Studio | Accepted |
| [0004](0004-postgres-people-r2-content.md) | Postgres for people and results; R2 for content | Accepted |
| [0005](0005-difficulty-easy-medium-hard.md) | Difficulty is easy / medium / hard | Accepted |
| [0006](0006-server-authority.md) | The client holds no authority over anything affecting a score | Accepted |
| [0007](0007-security-from-m0.md) | Security is designed in from the first milestone | Accepted |
| [0008](0008-one-audio-file-per-test.md) | One audio file per Listening test | Accepted |
| [0009](0009-invite-only-accounts.md) | Invite-only accounts; no public signup route | Accepted — amended |
| [0010](0010-owner-bound-audio-cache.md) | The audio cache belongs to the student who cached it | Accepted |
| [0011](0011-authoring-mcp.md) | An MCP server for authoring tests | Accepted — not yet built |
| [0012](0012-all-official-question-types.md) | All official IELTS question types, gated per skill and variant | Accepted |
| [0013](0013-documentation-tree.md) | A prescribed docs tree, ADRs, TSDoc and per-module READMEs | Accepted |
| [0014](0014-no-orm.md) | No ORM: supabase-js, generated types and Postgres functions | Accepted |
| [0015](0015-nonce-csp-dynamic-pages.md) | Nonce CSP for scripts; every page rendered per request | Accepted |
| [0016](0016-layout-bundles.md) | Each area loads its pages' data once and keeps it in the browser | Accepted |

## Template

```markdown
# ADR NNNN: <decision in a sentence>

- **Status:** Proposed | Accepted | Accepted — amended | Superseded by NNNN
- **Date:** YYYY-MM-DD
- **Origin:** where it was first recorded

## Context
## Decision
## Consequences
## Amendments   (only when it has changed)
```

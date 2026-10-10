# ADR 0013: A prescribed docs tree, ADRs, TSDoc and per-module READMEs

- **Status:** Accepted
- **Date:** 2026-09-14
- **Origin:** `MVP-1.md` §3 D13

## Context

Several agents and people work on this codebase in turn; the reasoning behind a choice is lost unless it is written where the next person looks.

## Decision

Keep `docs/` as in `MVP-1.md` §16: architecture, data model, security, question types, test authoring, runbook and `adr/`. Every exported function has TSDoc; every `lib/` module has a `README.md`. `PROJECT-MEMORY.md` §4 records day-to-day decisions; architectural ones are promoted here.

## Consequences

- `docs/README.md` is the index.
- The definition of done in `CLAUDE.md` checks TSDoc and READMEs.

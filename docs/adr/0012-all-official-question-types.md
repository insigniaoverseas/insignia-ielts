# ADR 0012: All official IELTS question types, gated per skill and variant

- **Status:** Accepted
- **Date:** 2026-09-14
- **Origin:** `MVP-1.md` §3 D12

## Context

The prototype supported seven types; IELTS has more, and analytics must group by the official names.

## Decision

Support every official Listening, Academic Reading and General Training Reading type: **18 canonical types** rendered by **6 widgets**, with a container for completion layouts. `lib/question-types.ts` is the single source of truth for the importer, player and scorer.

## Consequences

- The official GT list omits Yes/No/Not Given and Matching sentence endings; they are allowed with a warning, not blocked.
- Full matrix and marking rules: `docs/question-types.md`.

# ADR 0005: Difficulty is easy / medium / hard

- **Status:** Accepted
- **Date:** 2026-09-15
- **Origin:** `MVP-1.md` §3 D5

## Context

Tests need a difficulty for filtering and for students to choose practice. The design files varied between "Hard" and "Difficult".

## Decision

`tests.difficulty` is `easy` | `medium` | `hard`, shown as **Easy / Medium / Hard** with a word **and** a three-bar indicator — never colour alone.

## Consequences

- The library filter (M10-02) and test cards use these three values.

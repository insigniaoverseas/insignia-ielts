# ADR 0011: An MCP server for authoring tests

- **Status:** Accepted — not yet built
- **Date:** 2026-09-14
- **Origin:** `MVP-1.md` §3 D11

## Context

The real bottleneck is content: each test needs 40 questions and a careful answer key.

## Decision

An MCP server lets an authoring agent create tests through the **same server-side importer** the admin upload uses, with a scoped credential tied to a real staff user, normal RBAC and audit, and **no access** to students, attempts, answers, results or plans.

## Consequences

- Planned as M8-01 … M8-07 (after beta). Until then, tests arrive through the admin upload (M0-17) or `npm run import:test`.
- Upload format: `docs/test-authoring.md`.

# Documentation

Start with the three files at the root, then come here for the detail.

| At the root | What it is |
|---|---|
| [`CLAUDE.md`](../CLAUDE.md) | Entry point and the non-negotiables |
| [`MVP-1.md`](../MVP-1.md) | The contract: what to build and how it must behave |
| [`PROJECT-MEMORY.md`](../PROJECT-MEMORY.md) | Where the project is: task board, changelog, day-to-day decisions |

| Here | Read it when |
|---|---|
| [`architecture.md`](architecture.md) | You need the big picture: the pieces, a page load, an attempt end to end, the free-plan budget |
| [`data-model.md`](data-model.md) | You touch the database: every table, trigger and function |
| [`security.md`](security.md) | You touch auth, data access, uploads or HTML — or someone asks "is it secure?" |
| [`question-types.md`](question-types.md) | You touch the player, the importer or marking |
| [`test-authoring.md`](test-authoring.md) | You write or import a test |
| [`r2-layout.md`](r2-layout.md) | You touch storage or signed URLs |
| [`runbook.md`](runbook.md) | You run, deploy, migrate, rotate a secret, or run a lab session |
| [`adr/`](adr/README.md) | You want to know *why* something is built the way it is |

Code-level documentation lives next to the code: every `src/lib` folder has a `README.md`, and every exported function has TSDoc.

## Where `MVP-1.md` is out of date

`MVP-1.md` was written before the build. These points changed during it; the reason for each is in `PROJECT-MEMORY.md` §4. Trust the code and these docs over the plan on them.

| `MVP-1.md` says | What was built |
|---|---|
| Password **and a device PIN** (§3 D9, §6 `user_devices`, §8) — §9 already notes its removal | Email and password only — no PIN ([ADR 0009](adr/0009-invite-only-accounts.md)) |
| Audio fetched from a signed URL on the pre-test screen (§12) | Streamed through the Worker into the Cache API; ownership in the cache key |
| A Durable Object rate limiter (§4, §8) | Postgres `rate_limits` fallback; the Durable Object is deferred (M1-10) |
| 60 s heartbeat (§4, §7) | 30 s in the player; budget to be re-checked in the load test |
| Recharts for charts (§4, §15) | Hand-rolled SVG charts — kept the student bundle small |
| Guardian consent flow for under-18s (§8) | Notice + recorded consent; no guardian flow (DPDP Rules 2025 education exemption) |

## Keeping these docs true

- A PR that changes a table updates `data-model.md`; one that changes a question type updates `question-types.md`; one that changes a control updates `security.md`; one that changes how to run something updates `runbook.md`.
- An architectural decision gets an ADR in the same PR. A decision that changes an old one amends that ADR rather than deleting it.

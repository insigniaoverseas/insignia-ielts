# ADR 0008: One audio file per Listening test

- **Status:** Accepted
- **Date:** 2026-09-14
- **Origin:** `MVP-1.md` §3 D8

## Context

Real IELTS Listening is one continuous recording. Separate files per section invite seeking, re-requests and gaps on a busy lab network.

## Decision

Each Listening test has **one** MP3 (48–64 kbps mono). Sections are timestamp markers into it. It downloads in full **before** the timer starts and plays straight through; moving between sections never seeks or re-requests it.

## Consequences

- The pre-test screen downloads it through the Worker (`GET /tests/[ref]/start/audio`) into the Cache API — changed from a signed URL on 2026-10-10 to avoid CORS on the private bucket (`PROJECT-MEMORY.md` §4). The in-player fallback still uses a short-lived signed URL.
- Residual risk accepted: the recording is in the browser before Start, so a determined student can pre-listen at home (`docs/security.md`).

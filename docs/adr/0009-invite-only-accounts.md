# ADR 0009: Invite-only accounts; no public signup route

- **Status:** Accepted — amended
- **Date:** 2026-09-14
- **Origin:** `MVP-1.md` §3 D9

## Context

A coaching institute knows exactly who its students are. A public signup page is an attack surface and lets strangers in.

## Decision

Every account starts as an **admin invitation** by email. The invitee sets a password. **No public signup route exists.** Accepting an invitation can never grant a role above the inviter's.

## Consequences

- Invitations use our own single-use, hashed, 7-day tokens (`lib/auth/invitations.ts`), not Supabase's built-in invite — so they can be revoked without deleting an account (`PROJECT-MEMORY.md` §4).
- A self-serve password reset exists for every role (1-hour token, revokes all sessions) — added because the Owner has nobody above them to re-invite them.
- Students hold one active session; staff may hold several.

## Amendments

**Amended 2026-09-16: no PIN.** The original decision added a device-bound PIN for fast login. The user chose email and password only; the PIN, device-secret binding and *Set your PIN* step were dropped (M1-07). `user_devices` still has the unused PIN columns (`MVP-1.md` §9 is out of date on this).

# `lib/auth` — invitations, sign-in, sessions

Everything about *how someone gets into this product*. There is **no signup
route** (D9, `CLAUDE.md` rule 7): every account begins as an invitation, so this
folder is the only door.

## The flow, end to end

```
admin fills in screen 22
  └─ actions/invitations.ts  inviteAction
       └─ auth/invitations.ts  createInvitation
            ├─ canInviteRole()          never grant above the inviter
            ├─ tokens.ts mint           raw token ─┐  hash ──► invitations.token_hash
            └─ mail/  send ─────────────────────────┘
                                                    │
student clicks the emailed link                     ▼
  └─ /invite/[token]  →  auth/acceptance.ts  lookupInvitation   (hash lookup)
       └─ SetPasswordForm → acceptInvitationAction
            └─ acceptance.ts  acceptInvitation
                 ├─ 1. Supabase Auth createUser      (API — cannot join a txn)
                 ├─ 2. rpc accept_invitation          (user + batch + plan + close)
                 └─ 3. on failure, deleteUser         (so a retry is clean)

returning student
  └─ /login → signInAction → sign-in.ts  signIn
       ├─ lockout.ts  checkSignInAllowed   before the password is tried
       ├─ supabase.auth.signInWithPassword
       ├─ users.status must be 'active'
       └─ sessions.ts  startSession        students: revokes the previous one
```

## Files

| File | What it owns |
|---|---|
| `tokens.ts` | Minting and hashing invitation tokens. Web Crypto only. |
| `password.ts` | The password rules. **Pure** — the form and the server both import it. |
| `invitations.ts` | Create, revoke, resend. Where "never grant above the inviter" lives. |
| `acceptance.ts` | Token lookup and turning an invitation into an account. |
| `sign-in.ts` | Verifying a password; one message for every failure. |
| `sessions.ts` | `user_sessions` records, the session cookie, revocation. |
| `lockout.ts` | Five wrong passwords → a fifteen-minute lock, by account **and** IP. |
| `password-reset.ts` | `/forgot` and `/reset/[token]`. Same answer whether or not the account exists. |
| `guard.ts` | Page-level guards that redirect, rather than throw. |

### Password reset, end to end

```
/forgot  →  requestPasswordReset(email)
              ├─ rate limit by email AND ip      (quietly stops; same reply)
              ├─ no account, or suspended?        stop — same reply
              └─ mint token, store SHA-256, email it

/reset/[token]  →  lookupPasswordReset            expired / used / unknown
                     └─ completePasswordReset
                          ├─ our password rules
                          ├─ Auth updateUserById
                          └─ complete_password_reset
                               ├─ mark used, kill sibling tokens
                               └─ REVOKE EVERY SESSION
```

**One hour**, not the invitation's seven days: a reset is asked for by someone at
the screen right now, so a long life is exposure bought for nothing.

**The reply never varies.** Real address, unknown address, suspended account —
all get the same sentence. The login screen refuses to say which addresses are
real; a reset form that said would hand back the list it protects.

**It revokes every session.** If an intruder is signed in, a reset that left them
there has fixed nothing.

## Three things that will bite you

**The raw token is unrecoverable.** Only its SHA-256 hash is stored, so nothing
can show an admin an existing invite link — "resend" mints a *new* token and
invalidates the old one. That is deliberate; see `tokens.ts`.

**Acceptance is not one transaction, and cannot be.** Creating the Supabase Auth
user is an API call. The database half is one `accept_invitation` RPC, and the
auth user is deleted if that RPC fails. Change the order and you will leave
accounts nobody can sign in to.

**The bootstrap Owner has no profile until `/setup` runs.** `signIn` therefore
has an explicit branch for them — without it, first-run deadlocks: `/setup`
needs a session, the session needs `signIn`, and `signIn` wanted a profile only
`/setup` creates. Shipped broken on 2026-09-17 and found by a human trying to
log in, because nothing here has an integration test yet.

**A valid JWT is not a live session.** The JWT lifetime is deliberately longer
than the longest test, so revocation cannot come from expiry. It comes from the
`user_sessions` row named by the session cookie, which `guard.ts` checks on every
guarded page.

## Related

- `lib/rbac.ts` — `getActor` / `requirePermission`, the throwing half of the gate.
- `lib/permissions.ts` — the permission vocabulary and `canInviteRole`.
- `supabase/migrations/20260917101500_bootstrap_owner.sql` — the one account that
  is not an invitation, and why it is safe.
- `MVP-1.md` §9 (D9), §8 (threats), BUILD-STEPS steps 31–40.

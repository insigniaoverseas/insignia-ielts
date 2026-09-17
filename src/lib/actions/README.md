# `lib/actions` — Server Actions

Every export from a `"use server"` module is a **public endpoint the browser can
call directly**. Treat each one as untrusted input:

1. Re-establish the caller with `requirePermission` or a guard. Never trust a
   role, id or branch that arrived in the `FormData`.
2. Re-read the row being acted on. The page that rendered the form may be
   minutes stale — an invitation can be revoked in between.
3. Let the database have the last word. These actions check things *again* so
   the person gets a friendly message; RLS and the table constraints are what
   actually stop the write.

Types live in `types.ts`, not in the action modules — a `"use server"` file may
only export async functions.

## Files

| File | Endpoints |
|---|---|
| `auth.ts` | `signInAction`, `signOutAction`, `acceptInvitationAction`, `completeFirstRunSetupAction` |
| `batches.ts` | `createBatchAction`, `updateBatchAction` |
| `invitations.ts` | `inviteAction`, `bulkInviteAction`, `revokeInvitationAction`, `resendInvitationAction` |
| `types.ts` | `FormState`, `LoginFormState`, `AcceptFormState` — no runtime exports. |

The logic these call lives in `lib/auth/`, which is plain server-only code and is
therefore unit-testable without a form.

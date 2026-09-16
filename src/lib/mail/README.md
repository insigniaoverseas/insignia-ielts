# `lib/mail` — sending email

One narrow interface, two implementations, chosen by whether `RESEND_API_KEY` is
set:

| Environment | Implementation | Behaviour |
|---|---|---|
| Key set | `resendMailer` | POSTs to Resend's REST API. |
| Development, no key | `consoleMailer` | Prints the message, including the invite link. |
| Production, no key | — | Throws. A deployment that cannot send invitations fails loudly. |

That split exists so the invitation flow can be walked end to end by a real
person before the sending domain is provisioned.

## The Supabase ↔ Resend connection does not cover this

Connecting Resend to Supabase configures **SMTP for Supabase Auth's own emails**
— confirmation, recovery, magic links. Our invitation is not one of those: it
carries a token from `public.invitations` with a role, branch, batch and plan
attached, and an admin must be able to revoke it. So we send it ourselves, with
our own API key.

## Deliverability is not polish

Invite-only enrolment means **an invite in spam blocks enrolment outright**
(BUILD-STEPS step 34). Hence: a `text/plain` alternative on every message, no
images, and a verified sending domain with SPF, DKIM and DMARC before launch.

## Files

- `mailer.ts` — the `Mailer` interface and the two implementations.
- `templates.ts` — pure functions returning `{ subject, html, text }`. No I/O,
  so they unit-test without a provider.

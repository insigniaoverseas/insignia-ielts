/**
 * What the sign-in, sign-in-code and forgotten-password screens say when
 * something is wrong (M10-11).
 *
 * **They say exactly what is wrong.** The user chose this on 2026-10-11 over
 * one message for every failure: a student who mistyped their email was being
 * told their password was wrong, and went to the front desk. The cost is that
 * the screens confirm which emails have accounts. It is kept small by
 * invitation-only accounts, Turnstile on sign-in, the per-account lock and the
 * per-IP limits, which together stop anyone checking addresses in bulk
 * (`MVP-1.md` §8, updated).
 *
 * Pure, so the wording is unit-tested and shared by every screen.
 */

/** Plain-language messages. Written for a 10-year-old (`CLAUDE.md`, the design rule). */
export const SIGN_IN_MESSAGES = {
	noAccount: "There's no account with this email. Check the spelling, or ask your teacher.",
	wrongPassword: "That password isn't right.",
	switchedOff: "This account has been switched off. Ask your teacher.",
	tooManyFromNetwork: "Too many sign-in attempts from this network. Please wait a few minutes.",
	codeFormat: "The code is 6 numbers. Please check it and try again.",
	codeWrong: "That code isn't right. Check the newest email and try again.",
	codeGone: "That code has run out or has already been used. Ask for a new one.",
	tooManyEmails: "We've already sent 3 emails in the last 15 minutes. Use the newest one, or wait a few minutes.",
	emailFailed: "We couldn't send the email. Please try again.",
} as const;

/** What asking for an email (a sign-in code or a reset link) can come to. */
export type EmailRequestOutcome = "sent" | "no_account" | "switched_off" | "too_many" | "failed";

/**
 * The sentence for a refused email request, or `null` when it was sent — the
 * caller then says what was sent and where.
 */
export function emailRequestProblem(outcome: EmailRequestOutcome): string | null {
	switch (outcome) {
		case "sent":
			return null;
		case "no_account":
			return SIGN_IN_MESSAGES.noAccount;
		case "switched_off":
			return SIGN_IN_MESSAGES.switchedOff;
		case "too_many":
			return SIGN_IN_MESSAGES.tooManyEmails;
		default:
			return SIGN_IN_MESSAGES.emailFailed;
	}
}

/**
 * Whether a `users.status` may sign in. Anything but `active` — suspended by an
 * admin, or deactivated — is "switched off".
 */
export function canSignIn(status: string): boolean {
	return status === "active";
}

/**
 * Shapes shared by the Server Actions in this folder.
 *
 * Kept out of the `"use server"` modules themselves: those may only export
 * async functions, because every export becomes a callable endpoint.
 */

/** What a form shows after a submission. `null` is the untouched initial state. */
export type FormState = {
	/** The sentence to show. Always written for the person reading it. */
	message: string;
	/** `true` when the action succeeded and the message is a confirmation. */
	ok: boolean;
	/** Which field to mark, when the problem belongs to one. */
	field?: string;
} | null;

/** The login form's state — richer, because it drives the lockout UI. */
export type LoginFormState = {
	message: string;
	/** Counts down as attempts are used. `null` when not applicable. */
	triesLeft: number | null;
	/** ISO timestamp the lock lifts at, or `null`. Rendered in `Asia/Kolkata`. */
	lockedUntil: string | null;
} | null;

/** The accept-invitation form's state. `dead` replaces the form with a dead end. */
export type AcceptFormState = {
	message: string;
	dead?: "expired" | "used" | "revoked" | "unknown";
} | null;

/**
 * The reset-request form's state. Success and "no such account" are the *same*
 * state on purpose — the form must not reveal which it was.
 */
export type ResetRequestState = { message: string; sent: boolean } | null;

/** The choose-a-new-password form's state. */
export type ResetFormState = { message: string } | null;

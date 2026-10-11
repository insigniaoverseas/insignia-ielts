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
	/** Which box the message is about — shown under it. `undefined` for the form as a whole. */
	field?: "email" | "password" | "code";
	/** What they typed, so a wrong password doesn't make them type the email again. */
	email?: string;
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

/**
 * The sign-in-with-a-code screen's state (M10-10). `sent` moves it from "your
 * email" to "type the code", keeping the email so it isn't asked for twice.
 */
export type SignInCodeState = { email: string; sent: boolean; message: string | null; error: boolean } | null;

/**
 * The change-password form's state. `field` says which box the message is
 * about, so it can be shown under the right one.
 */
export type ChangePasswordState = { message: string; ok: boolean; field?: "current" | "password" } | null;

/** What signing a device out from Profile returns. */
export type SignOutDeviceResult = { ok: true } | { ok: false; message: string };

/**
 * What +5 minutes and Finish for them return to the live monitor (M7-03).
 * `secondsRemaining` is the server's figure after the change; `null` once handed in.
 */
export type InvigilatorActionResult = { ok: true; secondsRemaining: number | null } | { ok: false; message: string };

/** One CSV row as screen 22 sends it, already mapped to fields. `line` is its row in the file. */
export type CsvInviteRow = { line: number; name: string; email: string; phone: string; batch: string; planMonths: string };

/** What happened to each row of one chunk, by its line in the file. */
export type CsvInviteResult = { line: number; ok: boolean; message: string }[];

/** The choose-a-new-password form's state. */
export type ResetFormState = { message: string } | null;

/** The Start button's state: `null`, or why the test could not start. */
export type StartAttemptState = { message: string } | null;

/** One control's new value (or one flag), as the player autosaves it. */
export type SaveAnswerInput = {
	attemptId: string;
	sectionNo: number;
	/** The control's first question number. */
	number: number;
	/** Every number a multi-answer control answers; omitted for one. */
	covers?: number[];
	value?: string | string[];
	/** A flag change for one question number. */
	flag?: { qNumber: number; flagged: boolean };
	/** Strictly rising per attempt; the database rejects a lower one as stale. */
	revision: number;
};

/** What autosave and the heartbeat report back to the player. */
export type AttemptSaveResult =
	| { ok: true; secondsRemaining: number }
	| { ok: false; reason: "time_up" | "closed" | "session_ended" | "invalid" | "error" };

import { can, type Actor, type Permission } from "../permissions.ts";

/**
 * The numbers and keys behind the sign-in lockout (M1-09) — pure, so they can
 * be unit-tested and shared by `lockout.ts` and the staff screens that show
 * who is locked out.
 */

/** Wrong passwords for one account before it locks. */
export const ACCOUNT_LIMIT = 5;

/** Failed attempts from one IP before it is throttled, across all accounts. */
export const IP_LIMIT = 30;

/** The lock window, in seconds. Fifteen minutes (BUILD-STEPS step 39). */
export const WINDOW_SECONDS = 15 * 60;

/** The `rate_limits` key that counts one account's wrong passwords. Case and spaces don't matter. */
export const accountKey = (email: string) => `signin:account:${email.trim().toLowerCase()}`;

/** The `rate_limits` key that counts one IP's failures. */
export const ipKey = (ip: string) => `signin:ip:${ip}`;

/**
 * The start of the fixed window `now` falls in — the same floor
 * `bump_rate_limit` takes in the database, so both address the same row.
 */
export function windowStartAt(now: Date): Date {
	const ms = WINDOW_SECONDS * 1000;
	return new Date(Math.floor(now.getTime() / ms) * ms);
}

/** Fixed windows end at `window_start + WINDOW_SECONDS`; that is when the lock lifts. */
export function windowEndOf(windowStart: Date | string): Date {
	return new Date(new Date(windowStart).getTime() + WINDOW_SECONDS * 1000);
}

/**
 * Who may lift a student's sign-in lock: teachers (who hold
 * `assignment:manage` for their batches), and admins and the Owner
 * (`student:manage`). The login screen tells a locked-out student to ask their
 * teacher, so the teacher has to be able to answer. *Which* students is decided
 * by RLS: the student must be readable through the actor's own client.
 */
export const UNLOCK_PERMISSIONS = ["student:manage", "assignment:manage"] as const satisfies readonly Permission[];

/** Whether `actor` may lift a student's sign-in lock. See {@link UNLOCK_PERMISSIONS}. */
export function canUnlockSignIn(actor: Actor): boolean {
	return UNLOCK_PERMISSIONS.some((permission) => can(actor, permission));
}

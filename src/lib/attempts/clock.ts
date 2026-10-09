/**
 * The attempt clock, as arithmetic on the server's `expires_at` (M2-08).
 *
 * Pure and dependency-free so it is unit-tested. Nothing here *sets* a
 * deadline — the `attempts_before_insert` trigger does, from the test's
 * duration — and nothing here trusts a browser's clock: `now` is always the
 * server's, defaulted where this runs.
 */

/** Seconds left on the server clock. Never negative. */
export function secondsLeft(attempt: { expires_at: string }, now = Date.now()): number {
	return Math.max(0, Math.floor((new Date(attempt.expires_at).getTime() - now) / 1000));
}

/** Whether an in-progress attempt is past its deadline and must be closed as `expired`. */
export function isOverdue(attempt: { status: string; expires_at: string }, now = Date.now()): boolean {
	return attempt.status === "in_progress" && new Date(attempt.expires_at).getTime() <= now;
}

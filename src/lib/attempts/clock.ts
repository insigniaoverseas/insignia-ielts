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

/** How often an open, visible test checks in with the server. */
export const HEARTBEAT_SECONDS = 30;
/** A gap between check-ins longer than this means the student was away. */
export const AWAY_AFTER_SECONDS = 45;

/**
 * Practice pauses while the student is away (beta feedback, 2026-10-09);
 * mock and class tests never do.
 *
 * The server is the only judge of "away": an open, visible test checks in
 * every {@link HEARTBEAT_SECONDS}. `checkpoint` is the seconds left at the last
 * check-in (`attempts.time_remaining_seconds`). If the clock has since used
 * more than {@link AWAY_AFTER_SECONDS}, the student was gone: they are charged
 * one check-in interval and the rest is given back by moving the deadline
 * later — the only direction the database allows.
 *
 * @returns The new deadline (or `null` to leave it), and the checkpoint to store.
 */
export function practiceCheckIn(
	attempt: { expires_at: string; time_remaining_seconds: number | null },
	now = Date.now(),
): { expiresAt: string | null; checkpoint: number } {
	const left = secondsLeft(attempt, now);
	const checkpoint = attempt.time_remaining_seconds;
	if (checkpoint === null || checkpoint - left <= AWAY_AFTER_SECONDS) {
		return { expiresAt: null, checkpoint: left };
	}
	const resumed = Math.max(0, checkpoint - HEARTBEAT_SECONDS);
	if (resumed <= left) return { expiresAt: null, checkpoint: left };
	return { expiresAt: new Date(now + resumed * 1000).toISOString(), checkpoint: resumed };
}

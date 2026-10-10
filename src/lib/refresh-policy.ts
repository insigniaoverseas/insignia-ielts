/**
 * When the student app re-reads its data and re-checks the session.
 *
 * Pure and import-free so it can be unit-tested; `StudentAutoRefresh` in
 * `components/student/student-data.tsx` applies it.
 */

/** How often an active student's data is re-read, and their session re-checked. */
export const REFRESH_MS = 60_000;

/**
 * Whether a regular tick should refresh: only for a visible tab that someone
 * has used within the last {@link REFRESH_MS}. An idle or hidden tab makes no
 * requests.
 */
export function shouldRefreshOnTick(now: number, lastActivity: number, visible: boolean): boolean {
	return visible && now - lastActivity < REFRESH_MS;
}

/**
 * Whether a touch, key or scroll should refresh at once: when it is the first
 * after being idle for {@link REFRESH_MS} and nothing refreshed in that time.
 * A device whose session ended while nobody used it signs out on that touch.
 */
export function shouldRefreshOnActivity(now: number, lastActivity: number, lastRefresh: number): boolean {
	return now - lastActivity >= REFRESH_MS && now - lastRefresh >= REFRESH_MS;
}

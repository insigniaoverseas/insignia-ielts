/**
 * Rendering times for people (`CLAUDE.md` non-negotiable 9: store UTC, render
 * `Asia/Kolkata`).
 *
 * Every formatter here names the zone explicitly rather than relying on the
 * runtime's own. A Worker runs in UTC and a student's phone runs in whatever
 * their device says, so "the local time" is never the right answer — the
 * institute is in India and its timetable is in IST.
 *
 * Pure, and free of `new Date()` with no argument, so both server and client
 * may import it.
 */

/** The institute's timezone. The only one this product renders in. */
export const INSTITUTE_TIME_ZONE = "Asia/Kolkata";

/** A clock time, e.g. "10:45 am". Used wherever a deadline is stated. */
export function formatTime(instant: Date | string): string {
	return new Intl.DateTimeFormat("en-IN", {
		timeZone: INSTITUTE_TIME_ZONE,
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	}).format(new Date(instant));
}

/** A date, e.g. "17 September 2026". */
export function formatDate(instant: Date | string): string {
	return new Intl.DateTimeFormat("en-IN", {
		timeZone: INSTITUTE_TIME_ZONE,
		day: "numeric",
		month: "long",
		year: "numeric",
	}).format(new Date(instant));
}

/** A date and time together, e.g. "17 September 2026, 10:45 am". */
export function formatDateTime(instant: Date | string): string {
	return `${formatDate(instant)}, ${formatTime(instant)}`;
}

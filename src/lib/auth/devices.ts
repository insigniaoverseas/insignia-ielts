import { deviceLabel } from "./device-label.ts";

/**
 * The "where you're signed in" list, shared by the student Profile and the
 * staff My account page (M10-12). Pure, so it is unit-tested.
 *
 * Students hold one session at a time, so their list is usually one row.
 * Staff may hold several — a laptop and a phone — which is why they need the
 * list most: an admin who forgets to log out of a lab PC stays signed in there
 * until they sign it out from here.
 */

/** One device on the list. */
export type DeviceRow = {
	/** The `user_sessions.id` — what "Sign out" revokes. */
	id: string;
	/** "Chrome on Windows". */
	label: string;
	/** "Today", "3 days ago". */
	lastUsedLabel: string;
	/** The browser reading the list. It has no Sign out — Log out is the way out of here. */
	current: boolean;
};

/** A live `user_sessions` row, as read. */
export type SessionRow = { id: string; user_agent: string | null; last_seen_at: string };

/**
 * Turns live sessions into the list: **this device first**, then most recently
 * used, so the row someone is looking for — the one they don't recognise — is
 * never above their own.
 */
export function deviceRows(
	sessions: readonly SessionRow[],
	currentId: string | undefined,
	lastUsed: (iso: string) => string,
): DeviceRow[] {
	return [...sessions]
		.sort((a, b) => {
			if (a.id === currentId) return -1;
			if (b.id === currentId) return 1;
			return b.last_seen_at.localeCompare(a.last_seen_at);
		})
		.map((session) => ({
			id: session.id,
			label: deviceLabel(session.user_agent),
			lastUsedLabel: lastUsed(session.last_seen_at),
			current: session.id === currentId,
		}));
}

/** Where each role's device list lives — refreshed after a device is signed out. */
export function accountPathFor(role: string): string {
	if (role === "student") return "/profile";
	if (role === "teacher" || role === "invigilator") return "/teacher/account";
	return "/admin/account";
}

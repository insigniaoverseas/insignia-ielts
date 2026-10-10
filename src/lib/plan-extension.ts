/**
 * Extending students' plans (screen 24) — the pure half: what a request must
 * look like, and what the new end date is.
 *
 * Import-free, like `batch-input.ts` and `assignment-input.ts`, so it is
 * unit-tested directly. `lib/plans.ts` does the writing.
 */

/** The lengths screen 24 offers. Anything else is refused, not rounded. */
export const EXTENSION_MONTHS = [1, 3, 6] as const;

/** One press extends at most this many students — a whole batch, never the whole centre by accident. */
export const MAX_STUDENTS_PER_EXTENSION = 200;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A checked request, or the sentence to show instead. */
export type ExtensionRequest =
	| { ok: true; studentIds: string[]; months: number; reason: string }
	| { ok: false; message: string };

/** Validates what screen 24 posts. The reason is required: it is what the plan history shows later. */
export function validateExtension(input: { studentIds: string[]; months: number; reason: string }): ExtensionRequest {
	const studentIds = [...new Set(input.studentIds.filter(Boolean))];
	if (studentIds.length === 0) return { ok: false, message: "Pick at least one student." };
	if (studentIds.length > MAX_STUDENTS_PER_EXTENSION) {
		return { ok: false, message: `Extend at most ${MAX_STUDENTS_PER_EXTENSION} students at a time.` };
	}
	if (!studentIds.every((id) => UUID.test(id))) return { ok: false, message: "One of those students couldn't be found. Reload the page." };
	if (!(EXTENSION_MONTHS as readonly number[]).includes(input.months)) return { ok: false, message: "Choose 1, 3 or 6 months." };
	const reason = input.reason.trim();
	if (!reason) return { ok: false, message: "Say why — it's kept in each student's history." };
	if (reason.length > 300) return { ok: false, message: "Keep the reason under 300 characters." };
	return { ok: true, studentIds, months: input.months, reason };
}

/**
 * The new end date, as `YYYY-MM-DD`.
 *
 * Counted from the plan's own end date, so nobody loses time they already
 * have — unless it has already passed, in which case from today: extending a
 * plan that lapsed two months ago by one month must not leave it lapsed.
 *
 * Month arithmetic clamps to the month's last day (31 Jan + 1 month = 28/29 Feb),
 * as people mean it, rather than spilling into March.
 *
 * @param today Institute date (`Asia/Kolkata`), `YYYY-MM-DD` — from the server.
 */
export function extendedExpiry(expiresOn: string, today: string, months: number): string {
	const from = expiresOn >= today ? expiresOn : today; // ISO dates compare as strings
	const m = DAY.exec(from);
	if (!m) throw new Error(`Not a date: ${from}`);
	const year = Number(m[1]);
	const month = Number(m[2]) - 1 + months;
	const targetYear = year + Math.floor(month / 12);
	const targetMonth = month % 12;
	const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
	const day = Math.min(Number(m[3]), lastDay);
	return `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

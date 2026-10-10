/**
 * What screen 16 (Assign a test) collects and what counts as valid — the pure
 * half of creating an assignment.
 *
 * Kept import-free, like `batch-input.ts`, so it can be unit-tested directly.
 * `lib/assignments.ts` holds the half that needs the database: whether the
 * test is published and whether the actor may reach each batch and student.
 */

/** What screen 16 posts, unvalidated. */
export type AssignInput = {
	testId: string;
	batchIds: string[];
	studentIds: string[];
	/** `datetime-local` value, read as `Asia/Kolkata` wall-clock time. Empty = now. */
	opensAt: string;
	/** `datetime-local` value, read as `Asia/Kolkata`. Empty = no closing date. */
	dueBy: string;
	attempts: string;
	allowReview: boolean;
};

/** A field the teacher has to fix, named so the form can point at it. */
export type AssignField = "test" | "who" | "opensAt" | "dueBy" | "attempts";

export type CheckedAssignment = {
	ok: true;
	testId: string;
	batchIds: string[];
	studentIds: string[];
	/** UTC ISO string, or `null` for "as soon as it is assigned". */
	availableFrom: string | null;
	/** UTC ISO string, or `null` for no closing date. */
	dueBy: string | null;
	maxAttempts: number;
	allowReview: boolean;
};

export type AssignRefusal = { ok: false; message: string; field: AssignField };

/** The most attempts the screen offers. The column allows more; nobody needs them. */
export const MAX_ATTEMPTS = 9;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** India has no daylight saving, so the offset is fixed. */
const KOLKATA_OFFSET_MINUTES = 330;

/**
 * Reads a `datetime-local` value ("2026-10-11T09:30") as institute time and
 * returns the UTC instant, or `null` when it is not a real date and time.
 *
 * The browser's own time zone is deliberately ignored (non-negotiable 9): a
 * teacher on a laptop set to another zone still means 9:30 at the institute.
 */
export function kolkataLocalToUtc(value: string): Date | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
	if (!match) return null;
	const [, y, mo, d, h, mi, s] = match.map(Number);
	const wall = Date.UTC(y, mo - 1, d, h, mi, s || 0);
	const back = new Date(wall);
	// Reject "2026-02-30T10:00", which Date.UTC would quietly roll into March.
	if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d || h > 23 || mi > 59) {
		return null;
	}
	return new Date(wall - KOLKATA_OFFSET_MINUTES * 60_000);
}

/**
 * Validates one assignment. `now` is passed in so a test can pin it; the
 * server action passes the server clock, never the browser's.
 */
export function validateAssignment(input: AssignInput, now: Date): CheckedAssignment | AssignRefusal {
	if (!UUID.test(input.testId)) return { ok: false, message: "Pick a test.", field: "test" };

	const batchIds = [...new Set(input.batchIds.filter(Boolean))];
	const studentIds = [...new Set(input.studentIds.filter(Boolean))];
	if (batchIds.length + studentIds.length === 0) {
		return { ok: false, message: "Pick at least one batch or student.", field: "who" };
	}
	if (![...batchIds, ...studentIds].every((id) => UUID.test(id))) {
		return { ok: false, message: "One of those students or batches couldn't be found. Reload the page.", field: "who" };
	}

	let availableFrom: Date | null = null;
	if (input.opensAt.trim()) {
		availableFrom = kolkataLocalToUtc(input.opensAt.trim());
		if (!availableFrom) return { ok: false, message: "That start time isn't a real date.", field: "opensAt" };
	}

	let dueBy: Date | null = null;
	if (input.dueBy.trim()) {
		dueBy = kolkataLocalToUtc(input.dueBy.trim());
		if (!dueBy) return { ok: false, message: "That due date isn't a real date.", field: "dueBy" };
		if (dueBy <= now) return { ok: false, message: "The due date has already passed.", field: "dueBy" };
		if (availableFrom && dueBy <= availableFrom) {
			return { ok: false, message: "The due date must be after the start time.", field: "dueBy" };
		}
	}

	const attempts = Number(input.attempts);
	if (!Number.isInteger(attempts) || attempts < 1 || attempts > MAX_ATTEMPTS) {
		return { ok: false, message: `Attempts must be a whole number from 1 to ${MAX_ATTEMPTS}.`, field: "attempts" };
	}

	return {
		ok: true,
		testId: input.testId,
		batchIds,
		studentIds,
		availableFrom: availableFrom?.toISOString() ?? null,
		dueBy: dueBy?.toISOString() ?? null,
		maxAttempts: attempts,
		allowReview: input.allowReview,
	};
}

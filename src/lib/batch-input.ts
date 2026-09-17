/**
 * What screen 25a collects and what counts as valid — the pure half of
 * creating a batch.
 *
 * Kept import-free, like `question-types.ts` and `auth/access.ts`, so it can be
 * unit-tested directly and so the form could reuse it. `lib/batches.ts` holds
 * the half that needs the database.
 */

/** What screen 25a collects, unvalidated. */
export type BatchInput = {
	name: string;
	startsOn: string;
	endsOn: string | null;
	branchId: string | null;
	teacherIds: string[];
};

/** A field the admin has to fix, named so the form can point at it. */
export type BatchField = "name" | "startsOn" | "endsOn" | "branch" | "teachers" | "status";

/** The longest batch name the screens can show without truncating. */
const NAME_LIMIT = 120;

/** A `date` column's shape. Rejects "2026-13-40" as well as "not a date". */
function isCalendarDate(value: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const parsed = new Date(`${value}T00:00:00Z`);
	return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/**
 * Checks what the database's own constraints check, but in words an admin can
 * act on.
 *
 * Not the authority — `batches_ends_after_starts` and the `name` check still
 * run in Postgres. This exists so the common mistake comes back as "The end
 * date is before the start date" rather than as a constraint name.
 */
export function validateBatch(input: BatchInput):
	| { ok: true; name: string; startsOn: string; endsOn: string | null }
	| { ok: false; message: string; field: BatchField } {
	const name = input.name.trim();
	if (name.length === 0) return { ok: false, message: "Give the batch a name.", field: "name" };
	if (name.length > NAME_LIMIT) return { ok: false, message: "That name is too long.", field: "name" };

	if (!isCalendarDate(input.startsOn)) {
		return { ok: false, message: "Choose the date the batch starts.", field: "startsOn" };
	}

	const endsOn = input.endsOn?.trim() ? input.endsOn.trim() : null;
	if (endsOn !== null) {
		if (!isCalendarDate(endsOn)) return { ok: false, message: "That end date isn't a real date.", field: "endsOn" };
		if (endsOn < input.startsOn) {
			return { ok: false, message: "The end date is before the start date.", field: "endsOn" };
		}
	}

	return { ok: true, name, startsOn: input.startsOn, endsOn };
}

/**
 * `batches.status`, in the database's own order of life.
 *
 * The screens say "Finished" for `completed`, because that is what a teacher
 * calls a batch that has run its course.
 */
export const BATCH_STATUSES = ["active", "completed", "archived"] as const;

/** One of {@link BATCH_STATUSES}. */
export type BatchStatus = (typeof BATCH_STATUSES)[number];

/** Whether `value` is a status the `batches_status_check` constraint allows. */
export function isBatchStatus(value: string): value is BatchStatus {
	return (BATCH_STATUSES as readonly string[]).includes(value);
}

/** What screen 25b collects: everything on 25a, plus where the batch is in its life. */
export type BatchEdit = BatchInput & { status: string };

/**
 * The edit form's rules: the create rules, plus a status the database accepts.
 *
 * A batch that never existed cannot be edited into a bad state, so this refuses
 * an unknown status outright rather than falling back to `active` — silently
 * reactivating an archived batch is exactly the kind of quiet wrong that a
 * dropdown with a stale value would cause.
 */
export function validateBatchEdit(input: BatchEdit):
	| { ok: true; name: string; startsOn: string; endsOn: string | null; status: BatchStatus }
	| { ok: false; message: string; field: BatchField } {
	if (!isBatchStatus(input.status)) {
		return { ok: false, message: "Choose whether the batch is active, finished or archived.", field: "status" };
	}

	const checked = validateBatch(input);
	if (!checked.ok) return checked;

	return { ...checked, status: input.status };
}

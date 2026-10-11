/**
 * What "Remove batch" does to one batch (M10-14) — pure, so the rule and the
 * words that explain it are unit-tested together.
 *
 * **Never used → deleted.** A batch no test was ever assigned to holds nothing
 * worth keeping: it is a typo, a duplicate, or a plan that never ran.
 *
 * **Used → archived.** Assignments target batches, and teachers see their
 * students' results *through* the batch (RLS). Deleting one that was used
 * would cut both, so it is put away instead — hidden from lists, kept intact,
 * and restorable. The user chose this "smart remove" on 2026-10-11.
 *
 * Either way **its students are freed**: their membership is closed, so they
 * can join another batch straight away (the user, 2026-10-11).
 *
 * **Delete permanently** is separate and always available: it deletes the
 * batch, every **assignment** made only to it, and every result of those
 * assignments. The **tests themselves are never touched** — the Test library
 * stays exactly as it was (the user, 2026-10-11).
 */

export type RemovalPlan = {
	kind: "delete" | "archive";
	title: string;
	description: string;
	confirmLabel: string;
};

/**
 * @param name The batch's name, for the sentences.
 * @param assignedTests How many assignments target this batch, ever.
 * @param students How many students are in it now.
 */
export function planBatchRemoval(name: string, assignedTests: number, students: number): RemovalPlan {
	if (assignedTests === 0) {
		const people =
			students === 0
				? "It has no students."
				: `${students === 1 ? "1 student" : `${students} students`} will no longer be in a batch.`;
		return {
			kind: "delete",
			title: `Delete ${name}?`,
			description: `No tests were ever assigned to it, so it will be deleted for good. ${people}`,
			confirmLabel: "Yes, delete it",
		};
	}
	const tests = assignedTests === 1 ? "1 test was" : `${assignedTests} tests were`;
	return {
		kind: "archive",
		title: `Remove ${name}?`,
		description: `${tests} assigned to it, so it is kept, not deleted: its results stay, and it disappears from your lists and from teachers' dashboards. ${students === 0 ? "" : `Its ${students === 1 ? "student is" : `${students} students are`} freed to join another batch. `}You can restore it from "Show removed batches".`,
		confirmLabel: "Yes, remove it",
	};
}

/** What the list says once it's done. */
export function removalDoneMessage(name: string, kind: RemovalPlan["kind"]): string {
	return kind === "delete" ? `${name} was deleted.` : `${name} was removed. Its results are kept.`;
}

/** What "Delete permanently" would remove, counted from the database. */
export type PurgePreview = {
	/** Assignments made only to this batch — deleted with all their results. */
	ownAssignments: number;
	/** Assignments also given to other batches or students — kept for them; only this batch is unlinked. */
	sharedAssignments: number;
	/** Attempts on the deleted assignments: every answer and score in them goes. */
	attempts: number;
	/** Students in the batch now — freed, not deleted. */
	students: number;
};

/** The sentences for the "Delete permanently" box, in the order someone needs them. */
export function describePurge(name: string, p: PurgePreview): string[] {
	const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
	const lines = [`${name} will be deleted for good. This can't be undone.`];
	if (p.ownAssignments > 0) {
		lines.push(
			`${n(p.ownAssignments, "assignment", "assignments")} made to this batch will be removed, with ${n(p.attempts, "attempt", "attempts")} — every answer, score and band in them.`,
		);
	}
	if (p.sharedAssignments > 0) {
		lines.push(`${n(p.sharedAssignments, "assignment", "assignments")} also given to other batches or students will be kept for them.`);
	}
	lines.push("The tests themselves stay in the Test library, ready to assign again.");
	if (p.students > 0) {
		lines.push(`${n(p.students, "student", "students")} will be freed to join another batch. Their accounts are not deleted.`);
	}
	return lines;
}

/** The person must type the batch's name — spaces and case forgiven, nothing else. */
export function purgeConfirmed(name: string, typed: string): boolean {
	const clean = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
	return clean(typed) !== "" && clean(typed) === clean(name);
}

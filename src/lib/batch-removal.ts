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
		description: `${tests} assigned to it, so it is kept, not deleted: its results stay, and it disappears from your lists and from teachers' dashboards. You can restore it from "Show removed batches".`,
		confirmLabel: "Yes, remove it",
	};
}

/** What the list says once it's done. */
export function removalDoneMessage(name: string, kind: RemovalPlan["kind"]): string {
	return kind === "delete" ? `${name} was deleted.` : `${name} was removed. Its results are kept.`;
}

/**
 * Working out what a membership change actually does to the rows — the pure
 * half of moving students between batches.
 *
 * Kept import-free, like `batch-input.ts`, so it can be unit-tested directly.
 * The rules it encodes are the ones that are easy to get wrong by hand:
 *
 * - `batch_students` is keyed on `(batch_id, student_id)`, so somebody who
 *   left and comes back **cannot** get a second row. Their old row has to be
 *   reopened instead, or the insert fails on the primary key.
 * - Leaving is `left_at`, never a delete: the table's comment calls the row
 *   history, and results earned in a batch should still say which batch.
 */

/** How adding a student to a batch treats the batches they are already in. */
export type JoinMode =
	/** Move them: every other active membership is closed. */
	| "promote"
	/** Add alongside: their existing batches are left as they are. */
	| "addon";

/** One student's current membership of some batch. */
export type Membership = {
	batchId: string;
	studentId: string;
	/** `null` while they are still in the batch. */
	leftAt: string | null;
};

/** The row changes one add should make. */
export type MembershipPlan = {
	/** Rows to insert — students who have never been in this batch. */
	insert: string[];
	/** Rows to reopen — students who left this batch and are coming back. */
	reopen: string[];
	/** Already in the batch; nothing to do, and not an error. */
	unchanged: string[];
	/** `(batchId, studentId)` pairs to close, because `promote` moves them. */
	close: { batchId: string; studentId: string }[];
};

/**
 * Plans an add of `studentIds` into `batchId`.
 *
 * @param memberships Every membership row for the students being added, in any
 *   batch — the caller reads them once and passes them in, so this stays pure.
 * @param mode `promote` closes their other active batches; `addon` does not.
 */
export function planMembershipAdd(
	batchId: string,
	studentIds: string[],
	memberships: Membership[],
	mode: JoinMode,
): MembershipPlan {
	const wanted = [...new Set(studentIds.filter(Boolean))];
	const plan: MembershipPlan = { insert: [], reopen: [], unchanged: [], close: [] };

	for (const studentId of wanted) {
		const here = memberships.find((m) => m.studentId === studentId && m.batchId === batchId);

		if (!here) plan.insert.push(studentId);
		else if (here.leftAt !== null) plan.reopen.push(studentId);
		else plan.unchanged.push(studentId);

		if (mode === "promote") {
			for (const m of memberships) {
				// Their other active batches close. The target batch never does,
				// even when they are already in it.
				if (m.studentId === studentId && m.batchId !== batchId && m.leftAt === null) {
					plan.close.push({ batchId: m.batchId, studentId });
				}
			}
		}
	}

	return plan;
}

/** Whether a plan would change anything at all. */
export function planChangesSomething(plan: MembershipPlan): boolean {
	return plan.insert.length > 0 || plan.reopen.length > 0 || plan.close.length > 0;
}

/**
 * How the result reads to the admin who pressed the button.
 *
 * Says what happened rather than how many rows moved: "Moved 3 students" is
 * the sentence, not "3 inserted, 2 closed".
 */
export function describeMembershipPlan(plan: MembershipPlan, mode: JoinMode): string {
	const added = plan.insert.length + plan.reopen.length;
	const moved = new Set(plan.close.map((c) => c.studentId)).size;

	if (added === 0 && plan.close.length === 0) {
		return plan.unchanged.length === 1
			? "That student is already in this batch."
			: "Those students are already in this batch.";
	}

	const people = (n: number) => `${n} student${n === 1 ? "" : "s"}`;
	if (mode === "promote" && moved > 0) {
		return `Moved ${people(added || moved)} into this batch.`;
	}
	return `Added ${people(added)} to this batch.`;
}

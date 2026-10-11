import "server-only";

import { recordAudit } from "@/lib/audit";
import { planBatchRemoval, type PurgePreview, type RemovalPlan } from "@/lib/batch-removal";
import { validateBatch, validateBatchEdit, type BatchEdit, type BatchField, type BatchInput } from "@/lib/batch-input";
import {
	describeMembershipPlan,
	planChangesSomething,
	planMembershipAdd,
	type JoinMode,
} from "@/lib/batch-membership-plan";
import type { Actor, Scope } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Creating a batch (M5-07, screen 25a).
 *
 * `batches` is granted `select` only and has no write policy, like every other
 * table in this schema: the write runs through the secret key behind a
 * `lib/rbac.ts` check and is audited (`PROJECT-MEMORY.md` §4). RLS is still the
 * gate on *reading* the batch afterwards.
 *
 * `lib/batch-input.ts` holds the pure half: what the form collects and what
 * counts as valid.
 */

export { validateBatch, validateBatchEdit } from "@/lib/batch-input";
export type { BatchEdit, BatchField, BatchInput } from "@/lib/batch-input";
export type { JoinMode } from "@/lib/batch-membership-plan";

export type BatchOutcome =
	/** `name` is the batch's name; `message` is set when the screen should say
	 *  something more specific than "saved" — how many students moved, say. */
	| { ok: true; id: string; name: string; message?: string }
	| { ok: false; message: string; field?: BatchField };

/**
 * Creates one batch, with its teachers attached.
 *
 * @param actor The signed-in user, from `requirePermission("student:manage")`.
 * @param scope That permission's scope. `branch` cannot reach another centre —
 *   the same rule invitations use, for the same reason.
 */
export async function createBatch(actor: Actor, scope: Scope, input: BatchInput): Promise<BatchOutcome> {
	const checked = validateBatch(input);
	if (!checked.ok) return checked;

	// A `branch`-scoped admin is pinned to their own centre; only `all` chooses.
	const branchId = scope === "all" ? (input.branchId ?? actor.branchId) : actor.branchId;
	if (scope !== "all" && input.branchId && input.branchId !== actor.branchId) {
		return { ok: false, message: "You can only create batches at your own centre.", field: "branch" };
	}
	if (!branchId) return { ok: false, message: "Choose which centre this batch belongs to.", field: "branch" };

	const db = createAdminClient();

	const teacherIds = [...new Set(input.teacherIds.filter(Boolean))];
	const refused = await refuseUnusableTeachers(db, teacherIds, branchId);
	if (refused) return refused;

	const { data: created, error } = await db
		.from("batches")
		.insert({ name: checked.name, branch_id: branchId, starts_on: checked.startsOn, ends_on: checked.endsOn })
		.select("id, name")
		.single();

	if (error || !created) {
		console.error("batch create failed:", error?.message);
		return { ok: false, message: "That batch couldn't be created. Try again." };
	}

	if (teacherIds.length > 0) {
		const { error: linkError } = await db
			.from("batch_teachers")
			.insert(teacherIds.map((teacherId) => ({ batch_id: created.id, teacher_id: teacherId })));

		// The batch exists and is usable without its teacher, and screen 25
		// already flags "No teacher yet" — so this is reported, not rolled back.
		if (linkError) {
			console.error("batch teacher link failed:", linkError.message);
			await recordAudit({
				actorId: actor.id,
				branchId,
				action: "batch.create",
				entity: "batch",
				entityId: created.id,
				meta: { name: created.name, teachers_attached: false },
			});
			return { ok: false, message: `${created.name} was created, but the teacher wasn't added.`, field: "teachers" };
		}
	}

	await recordAudit({
		actorId: actor.id,
		branchId,
		action: "batch.create",
		entity: "batch",
		entityId: created.id,
		meta: { name: created.name, teacher_count: teacherIds.length },
	});

	return { ok: true, id: created.id, name: created.name };
}

/**
 * Applies an edit to one batch, and replaces its teacher list.
 *
 * Scope is enforced against the batch's **current** branch, read first: an
 * admin may only edit a batch at their own centre, and cannot move one to
 * another centre by posting a different `branchId`. The centre is therefore
 * not editable here at all — moving a batch would strand its students' RLS
 * visibility, and there is no screen that asks for it.
 *
 * @param actor The signed-in user, from `requirePermission("student:manage")`.
 * @param scope That permission's scope.
 * @param batchId The batch to change.
 */
export async function updateBatch(
	actor: Actor,
	scope: Scope,
	batchId: string,
	input: BatchEdit,
): Promise<BatchOutcome> {
	const checked = validateBatchEdit(input);
	if (!checked.ok) return checked;

	const db = createAdminClient();

	const { data: existing, error: readError } = await db
		.from("batches")
		.select("id, branch_id")
		.eq("id", batchId)
		.maybeSingle();

	if (readError) {
		console.error("batch read failed:", readError.message);
		return { ok: false, message: "Something went wrong. Try again." };
	}
	if (!existing) return { ok: false, message: "That batch no longer exists." };

	if (scope !== "all" && existing.branch_id !== actor.branchId) {
		return { ok: false, message: "You can only change batches at your own centre.", field: "branch" };
	}

	const teacherIds = [...new Set(input.teacherIds.filter(Boolean))];
	const refused = await refuseUnusableTeachers(db, teacherIds, existing.branch_id);
	if (refused) return refused;

	const { data: updated, error } = await db
		.from("batches")
		.update({
			name: checked.name,
			starts_on: checked.startsOn,
			ends_on: checked.endsOn,
			status: checked.status,
		})
		.eq("id", batchId)
		.select("id, name")
		.single();

	if (error || !updated) {
		console.error("batch update failed:", error?.message);
		return { ok: false, message: "That batch couldn't be saved. Try again." };
	}

	const teachersSaved = await syncBatchTeachers(db, batchId, teacherIds);

	await recordAudit({
		actorId: actor.id,
		branchId: existing.branch_id,
		action: "batch.update",
		entity: "batch",
		entityId: batchId,
		meta: { name: updated.name, status: checked.status, teacher_count: teacherIds.length, teachers_saved: teachersSaved },
	});

	// The batch itself saved, so this is a warning about one field, not a
	// failure of the whole edit — saying "couldn't save" would have the admin
	// redo work that is already stored.
	if (!teachersSaved) {
		return { ok: false, message: `${updated.name} was saved, but the teacher list wasn't.`, field: "teachers" };
	}

	return { ok: true, id: batchId, name: updated.name };
}

/**
 * Refuses a teacher list that `batch_teachers` itself cannot police.
 *
 * That table carries no role check — its comment says the check belongs in
 * server code — so this is it: active staff who teach, at this centre, or the
 * write does not happen. Returns `null` when the list is fine.
 */
async function refuseUnusableTeachers(
	db: ReturnType<typeof createAdminClient>,
	teacherIds: string[],
	branchId: string,
): Promise<BatchOutcome | null> {
	if (teacherIds.length === 0) return null;

	const { data: staff, error } = await db
		.from("users")
		.select("id, branch_id, status, roles ( key )")
		.in("id", teacherIds);

	if (error) {
		console.error("batch teacher lookup failed:", error.message);
		return { ok: false, message: "Something went wrong. Try again.", field: "teachers" };
	}

	const usable = (staff ?? []).filter(
		(person) =>
			person.status === "active" &&
			person.branch_id === branchId &&
			(person.roles?.key === "teacher" || person.roles?.key === "invigilator"),
	);
	if (usable.length !== teacherIds.length) {
		return { ok: false, message: "Pick a teacher at this centre.", field: "teachers" };
	}

	return null;
}

/**
 * Makes `batch_teachers` match the list the form posted.
 *
 * Works out the difference rather than deleting everything and re-inserting:
 * an edit that only renames the batch should not churn the teacher rows, and
 * `created_at` on an untouched row is worth keeping honest.
 *
 * @returns Whether the teacher list now matches. The batch's own fields are
 *   saved separately, so a failure here is reported without discarding them.
 */
async function syncBatchTeachers(
	db: ReturnType<typeof createAdminClient>,
	batchId: string,
	teacherIds: string[],
): Promise<boolean> {
	const { data: current, error: readError } = await db
		.from("batch_teachers")
		.select("teacher_id")
		.eq("batch_id", batchId);

	if (readError) {
		console.error("batch teacher read failed:", readError.message);
		return false;
	}

	const before = new Set((current ?? []).map((row) => row.teacher_id));
	const after = new Set(teacherIds);
	const toRemove = [...before].filter((id) => !after.has(id));
	const toAdd = teacherIds.filter((id) => !before.has(id));

	if (toRemove.length > 0) {
		const { error } = await db.from("batch_teachers").delete().eq("batch_id", batchId).in("teacher_id", toRemove);
		if (error) {
			console.error("batch teacher remove failed:", error.message);
			return false;
		}
	}

	if (toAdd.length > 0) {
		const { error } = await db
			.from("batch_teachers")
			.insert(toAdd.map((teacherId) => ({ batch_id: batchId, teacher_id: teacherId })));
		if (error) {
			console.error("batch teacher add failed:", error.message);
			return false;
		}
	}

	return true;
}

/**
 * Adds students to a batch, either moving them or adding alongside.
 *
 * `promote` closes their other active memberships, so "which batch is Priya
 * in?" has one answer again. `addon` leaves those alone, for the student who
 * genuinely attends a weekend course as well as their weekday batch.
 *
 * Somebody who left this batch before is **reopened**, not re-inserted:
 * `batch_students` is keyed on `(batch_id, student_id)` and a second row would
 * fail on the primary key.
 *
 * @param actor The signed-in user, from `requirePermission("student:manage")`.
 * @param scope That permission's scope. `branch` cannot reach another centre.
 */
export async function addStudentsToBatch(
	actor: Actor,
	scope: Scope,
	batchId: string,
	studentIds: string[],
	mode: JoinMode,
): Promise<BatchOutcome> {
	const db = createAdminClient();

	const { data: batch, error: batchError } = await db
		.from("batches")
		.select("id, name, branch_id")
		.eq("id", batchId)
		.maybeSingle();

	if (batchError) {
		console.error("batch read failed:", batchError.message);
		return { ok: false, message: "Something went wrong. Try again." };
	}
	if (!batch) return { ok: false, message: "That batch no longer exists." };
	if (scope !== "all" && batch.branch_id !== actor.branchId) {
		return { ok: false, message: "You can only change batches at your own centre.", field: "branch" };
	}

	const wanted = [...new Set(studentIds.filter(Boolean))];
	if (wanted.length === 0) return { ok: false, message: "Pick at least one student.", field: "students" };

	// Only real, active students at this centre. Nothing else may be put in a
	// batch — a teacher in a batch roster would quietly gain a student's RLS.
	const { data: people, error: peopleError } = await db
		.from("users")
		.select("id, branch_id, status, roles ( key )")
		.in("id", wanted);

	if (peopleError) {
		console.error("batch student lookup failed:", peopleError.message);
		return { ok: false, message: "Something went wrong. Try again.", field: "students" };
	}

	const usable = (people ?? []).filter(
		(person) => person.status === "active" && person.branch_id === batch.branch_id && person.roles?.key === "student",
	);
	if (usable.length !== wanted.length) {
		return { ok: false, message: "Pick an active student at this centre.", field: "students" };
	}

	const { data: rows, error: rowsError } = await db
		.from("batch_students")
		.select("batch_id, student_id, left_at")
		.in("student_id", wanted);

	if (rowsError) {
		console.error("membership read failed:", rowsError.message);
		return { ok: false, message: "Something went wrong. Try again." };
	}

	// A membership left open in a **removed** batch (archived before removing
	// freed students, M10-14) is not a real batch to stay in: close it, whatever
	// the mode, so it never shows as "still in" anywhere.
	const openElsewhere = [...new Set((rows ?? []).filter((r) => r.left_at === null && r.batch_id !== batchId).map((r) => r.batch_id))];
	const removedIds = new Set<string>();
	if (openElsewhere.length > 0) {
		const { data: removed } = await db.from("batches").select("id").in("id", openElsewhere).eq("status", "archived");
		for (const row of removed ?? []) removedIds.add(row.id);
		if (removedIds.size > 0) {
			const { error } = await db
				.from("batch_students")
				.update({ left_at: new Date().toISOString() })
				.in("batch_id", [...removedIds])
				.in("student_id", wanted)
				.is("left_at", null);
			if (error) {
				console.error("closing removed-batch memberships failed:", error.message);
				return { ok: false, message: "Something went wrong. Try again." };
			}
		}
	}

	const plan = planMembershipAdd(
		batchId,
		wanted,
		(rows ?? [])
			.filter((row) => !removedIds.has(row.batch_id))
			.map((row) => ({ batchId: row.batch_id, studentId: row.student_id, leftAt: row.left_at })),
		mode,
	);

	if (!planChangesSomething(plan)) {
		return { ok: false, message: describeMembershipPlan(plan, mode), field: "students" };
	}

	const now = new Date().toISOString();

	// Close first. A crash between the two leaves the student in no batch,
	// which an admin can see and fix; the other order hides them in two.
	for (const { batchId: fromBatch, studentId } of plan.close) {
		const { error } = await db
			.from("batch_students")
			.update({ left_at: now })
			.eq("batch_id", fromBatch)
			.eq("student_id", studentId)
			.is("left_at", null);
		if (error) {
			console.error("membership close failed:", error.message);
			return { ok: false, message: "Those students couldn't be moved. Try again." };
		}
	}

	if (plan.reopen.length > 0) {
		const { error } = await db
			.from("batch_students")
			.update({ left_at: null, joined_at: now })
			.eq("batch_id", batchId)
			.in("student_id", plan.reopen);
		if (error) {
			console.error("membership reopen failed:", error.message);
			return { ok: false, message: "Those students couldn't be added. Try again." };
		}
	}

	if (plan.insert.length > 0) {
		const { error } = await db
			.from("batch_students")
			.insert(plan.insert.map((studentId) => ({ batch_id: batchId, student_id: studentId, joined_at: now })));
		if (error) {
			console.error("membership insert failed:", error.message);
			return { ok: false, message: "Those students couldn't be added. Try again." };
		}
	}

	await recordAudit({
		actorId: actor.id,
		branchId: batch.branch_id,
		action: mode === "promote" ? "batch.promote" : "batch.join",
		entity: "batch",
		entityId: batchId,
		meta: {
			batch: batch.name,
			added: plan.insert.length + plan.reopen.length,
			moved_from: plan.close.length,
			students: wanted,
		},
	});

	return { ok: true, id: batchId, name: batch.name, message: describeMembershipPlan(plan, mode) };
}

/**
 * Takes one student out of a batch.
 *
 * Sets `left_at` rather than deleting: the row is history, and a result earned
 * in this batch should still be able to say so.
 */
export async function removeStudentFromBatch(
	actor: Actor,
	scope: Scope,
	batchId: string,
	studentId: string,
): Promise<BatchOutcome> {
	const db = createAdminClient();

	const { data: batch, error: batchError } = await db
		.from("batches")
		.select("id, name, branch_id")
		.eq("id", batchId)
		.maybeSingle();

	if (batchError) {
		console.error("batch read failed:", batchError.message);
		return { ok: false, message: "Something went wrong. Try again." };
	}
	if (!batch) return { ok: false, message: "That batch no longer exists." };
	if (scope !== "all" && batch.branch_id !== actor.branchId) {
		return { ok: false, message: "You can only change batches at your own centre.", field: "branch" };
	}

	const { data: removed, error } = await db
		.from("batch_students")
		.update({ left_at: new Date().toISOString() })
		.eq("batch_id", batchId)
		.eq("student_id", studentId)
		.is("left_at", null)
		.select("student_id");

	if (error) {
		console.error("membership remove failed:", error.message);
		return { ok: false, message: "That student couldn't be removed. Try again." };
	}
	if (!removed || removed.length === 0) {
		return { ok: false, message: "That student isn't in this batch." };
	}

	await recordAudit({
		actorId: actor.id,
		branchId: batch.branch_id,
		action: "batch.leave",
		entity: "batch",
		entityId: batchId,
		meta: { batch: batch.name, student: studentId },
	});

	return { ok: true, id: batchId, name: batch.name, message: "Student removed from this batch." };
}

/** What removing a batch came to. */
export type RemovalOutcome = { ok: true; name: string; kind: RemovalPlan["kind"] } | { ok: false; message: string };

/** Reads a batch the actor may change, or says why not. Same centre rule as `updateBatch`. */
async function batchInScope(actor: Actor, scope: Scope, batchId: string) {
	const db = createAdminClient();
	const { data, error } = await db.from("batches").select("id, name, branch_id, status").eq("id", batchId).maybeSingle();
	if (error) {
		console.error("batch read failed:", error.message);
		return { ok: false as const, message: "Something went wrong. Try again." };
	}
	if (!data) return { ok: false as const, message: "That batch no longer exists." };
	if (scope !== "all" && data.branch_id !== actor.branchId) {
		return { ok: false as const, message: "You can only change batches at your own centre." };
	}
	return { ok: true as const, db, batch: data };
}

/**
 * "Remove batch" (M10-14): deletes a batch no test was ever assigned to, and
 * archives one that was used — see `lib/batch-removal.ts` for why.
 *
 * The rule is decided **here**, from the database, not from what the screen
 * showed: an assignment made between opening the page and pressing the button
 * must turn a delete into an archive, never the other way round.
 */
export async function removeBatch(actor: Actor, scope: Scope, batchId: string): Promise<RemovalOutcome> {
	const found = await batchInScope(actor, scope, batchId);
	if (!found.ok) return found;
	const { db, batch } = found;

	const [targets, members] = await Promise.all([
		db.from("assignment_targets").select("assignment_id", { count: "exact", head: true }).eq("batch_id", batchId),
		db.from("batch_students").select("student_id", { count: "exact", head: true }).eq("batch_id", batchId).is("left_at", null),
	]);
	if (targets.error || members.error) {
		console.error("batch usage read failed:", targets.error?.message ?? members.error?.message);
		return { ok: false, message: "Something went wrong. Try again." };
	}

	const plan = planBatchRemoval(batch.name, targets.count ?? 0, members.count ?? 0);
	const { error } =
		plan.kind === "delete"
			? // Memberships and teacher links go with it (on delete cascade);
			  // invitations naming it keep their row with no batch (set null).
			  await db.from("batches").delete().eq("id", batchId)
			: await archiveAndFree(db, batchId);
	if (error) {
		console.error(`batch ${plan.kind} failed:`, error.message);
		return { ok: false, message: "That batch couldn't be removed. Try again." };
	}

	await recordAudit({
		actorId: actor.id,
		branchId: batch.branch_id,
		action: plan.kind === "delete" ? "batch.delete" : "batch.archive",
		entity: "batch",
		entityId: batchId,
		meta: { name: batch.name, assigned_tests: targets.count ?? 0, students: members.count ?? 0 },
	});
	return { ok: true, name: batch.name, kind: plan.kind };
}

/** Brings a removed (archived) batch back to Active (M10-14). */
export async function restoreBatch(actor: Actor, scope: Scope, batchId: string): Promise<BatchOutcome> {
	const found = await batchInScope(actor, scope, batchId);
	if (!found.ok) return found;
	const { db, batch } = found;
	if (batch.status !== "archived") return { ok: false, message: `${batch.name} isn't removed.` };

	const { error } = await db.from("batches").update({ status: "active" }).eq("id", batchId);
	if (error) {
		console.error("batch restore failed:", error.message);
		return { ok: false, message: "That batch couldn't be restored. Try again." };
	}
	await recordAudit({
		actorId: actor.id,
		branchId: batch.branch_id,
		action: "batch.restore",
		entity: "batch",
		entityId: batchId,
		meta: { name: batch.name },
	});
	return {
		ok: true,
		id: batchId,
		name: batch.name,
		message: `${batch.name} is back. Its students were freed when it was removed — add them again below if they belong here.`,
	};
}

/**
 * Archives a batch and **frees its students** (closes their membership), so
 * they can be added to another batch straight away (M10-14). Their results
 * stay; only the link to this batch closes.
 */
async function archiveAndFree(db: ReturnType<typeof createAdminClient>, batchId: string) {
	const freed = await db
		.from("batch_students")
		.update({ left_at: new Date().toISOString() })
		.eq("batch_id", batchId)
		.is("left_at", null);
	if (freed.error) return freed;
	return db.from("batches").update({ status: "archived" }).eq("id", batchId);
}

/**
 * Splits the assignments that target a batch into those made **only** to it
 * and those **shared** with other batches or students. Only the first kind is
 * deleted by "Delete permanently"; the second keeps working for everyone else.
 */
async function assignmentSplit(db: ReturnType<typeof createAdminClient>, batchId: string) {
	const mine = await db.from("assignment_targets").select("assignment_id").eq("batch_id", batchId);
	if (mine.error) throw new Error(mine.error.message);
	const ids = [...new Set((mine.data ?? []).map((row) => row.assignment_id))];
	if (ids.length === 0) return { own: [] as string[], shared: [] as string[] };

	const all = await db.from("assignment_targets").select("assignment_id, batch_id").in("assignment_id", ids);
	if (all.error) throw new Error(all.error.message);
	const shared = new Set(
		(all.data ?? []).filter((row) => row.batch_id !== batchId).map((row) => row.assignment_id),
	);
	return { own: ids.filter((id) => !shared.has(id)), shared: [...shared] };
}

/** The counts the "Delete permanently" box shows, before anything happens. */
export async function previewBatchPurge(actor: Actor, scope: Scope, batchId: string): Promise<PurgePreview | null> {
	const found = await batchInScope(actor, scope, batchId);
	if (!found.ok) return null;
	const { db } = found;
	const { own, shared } = await assignmentSplit(db, batchId);
	const [attempts, members] = await Promise.all([
		own.length
			? db.from("attempts").select("id", { count: "exact", head: true }).in("assignment_id", own)
			: Promise.resolve({ count: 0, error: null }),
		db.from("batch_students").select("student_id", { count: "exact", head: true }).eq("batch_id", batchId).is("left_at", null),
	]);
	return {
		ownAssignments: own.length,
		sharedAssignments: shared.length,
		attempts: attempts.count ?? 0,
		students: members.count ?? 0,
	};
}

/**
 * "Delete permanently" (M10-14): deletes the batch, every assignment made only
 * to it and every attempt on those assignments (answers, marks, scores and
 * events cascade from the attempt). Assignments shared with others lose only
 * this batch as a target. **Tests are never touched** — nothing here deletes
 * from `tests`, and nothing cascades into it.
 *
 * Each step is safe to run again, in this order, so a failure part-way is
 * finished by pressing the button again: attempts before their assignments
 * (`attempts.assignment_id` does not cascade), assignments before the batch.
 */
export async function purgeBatch(actor: Actor, scope: Scope, batchId: string): Promise<BatchOutcome> {
	const found = await batchInScope(actor, scope, batchId);
	if (!found.ok) return found;
	const { db, batch } = found;

	try {
		const { own, shared } = await assignmentSplit(db, batchId);
		let attemptsDeleted = 0;
		if (own.length > 0) {
			const gone = await db.from("attempts").delete().in("assignment_id", own).select("id");
			if (gone.error) throw new Error(gone.error.message);
			attemptsDeleted = gone.data?.length ?? 0;
			const assignments = await db.from("assignments").delete().in("id", own);
			if (assignments.error) throw new Error(assignments.error.message);
		}
		if (shared.length > 0) {
			const unlinked = await db.from("assignment_targets").delete().eq("batch_id", batchId);
			if (unlinked.error) throw new Error(unlinked.error.message);
		}
		const deleted = await db.from("batches").delete().eq("id", batchId);
		if (deleted.error) throw new Error(deleted.error.message);

		await recordAudit({
			actorId: actor.id,
			branchId: batch.branch_id,
			action: "batch.purge",
			entity: "batch",
			entityId: batchId,
			meta: { name: batch.name, assignments_deleted: own.length, assignments_unlinked: shared.length, attempts_deleted: attemptsDeleted },
		});
		return { ok: true, id: batchId, name: batch.name, message: `${batch.name} was deleted for good.` };
	} catch (error) {
		console.error("batch purge failed:", error instanceof Error ? error.message : error);
		return { ok: false, message: "That batch couldn't be fully deleted. Press Delete permanently again to finish." };
	}
}

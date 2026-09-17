import "server-only";

import { recordAudit } from "@/lib/audit";
import { validateBatch, validateBatchEdit, type BatchEdit, type BatchField, type BatchInput } from "@/lib/batch-input";
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

export type BatchOutcome =
	| { ok: true; id: string; name: string }
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

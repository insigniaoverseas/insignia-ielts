import "server-only";

import { recordAudit } from "@/lib/audit";
import { validateBatch, type BatchField, type BatchInput } from "@/lib/batch-input";
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

export { validateBatch } from "@/lib/batch-input";
export type { BatchField, BatchInput } from "@/lib/batch-input";

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

	// Only staff who actually teach, and only at this centre. `batch_teachers`
	// has no role check of its own — its comment says this belongs in server
	// code, so this is the check it means.
	const teacherIds = [...new Set(input.teacherIds.filter(Boolean))];
	if (teacherIds.length > 0) {
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
	}

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

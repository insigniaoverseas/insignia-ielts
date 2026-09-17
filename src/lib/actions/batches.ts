"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createBatch, updateBatch } from "@/lib/batches";
import { ForbiddenError, requirePermission } from "@/lib/rbac";
import type { FormState } from "@/lib/actions/types";

/**
 * Server Actions behind the batch screens (M5-07).
 *
 * `student:manage` is the permission: its comment in `lib/permissions.ts` reads
 * "invite students; manage plans and batches", and admins hold it in `branch`
 * scope while the Owner holds it in `all`. The page guard protects the screen;
 * this checks again, because a Server Action is a public endpoint.
 */

/** Creates one batch, then goes to the list so the admin sees it land. */
export async function createBatchAction(_previous: FormState, formData: FormData): Promise<FormState> {
	let created: string;

	try {
		const { actor, scope } = await requirePermission("student:manage");

		const result = await createBatch(actor, scope, {
			name: String(formData.get("name") ?? ""),
			startsOn: String(formData.get("startsOn") ?? ""),
			endsOn: formData.get("endsOn") ? String(formData.get("endsOn")) : null,
			branchId: formData.get("branch") ? String(formData.get("branch")) : null,
			teacherIds: formData.getAll("teachers").map(String).filter(Boolean),
		});

		if (!result.ok) return { ok: false, message: result.message, field: result.field };
		created = result.name;
	} catch (error) {
		if (error instanceof ForbiddenError) {
			return { ok: false, message: "You don't have permission to create a batch." };
		}
		throw error;
	}

	revalidatePath("/admin/batches");
	// `redirect` throws to unwind — it must sit outside the try/catch above.
	redirect(`/admin/batches?created=${encodeURIComponent(created)}`);
}

/**
 * Saves an edit to one batch.
 *
 * Stays on the screen and reports success there, unlike creating: an admin who
 * has just corrected a date is usually looking at the thing they corrected, and
 * throwing them back to the list would hide whether it took.
 */
export async function updateBatchAction(_previous: FormState, formData: FormData): Promise<FormState> {
	const batchId = String(formData.get("batchId") ?? "");
	if (!batchId) return { ok: false, message: "That batch couldn't be found." };

	try {
		const { actor, scope } = await requirePermission("student:manage");

		const result = await updateBatch(actor, scope, batchId, {
			name: String(formData.get("name") ?? ""),
			startsOn: String(formData.get("startsOn") ?? ""),
			endsOn: formData.get("endsOn") ? String(formData.get("endsOn")) : null,
			status: String(formData.get("status") ?? ""),
			// Not editable here: moving a batch between centres would strand its
			// students' RLS visibility. `updateBatch` reads the current branch.
			branchId: null,
			teacherIds: formData.getAll("teachers").map(String).filter(Boolean),
		});

		if (!result.ok) return { ok: false, message: result.message, field: result.field };

		revalidatePath("/admin/batches");
		revalidatePath(`/admin/batches/${batchId}`);
		return { ok: true, message: `${result.name} was saved.` };
	} catch (error) {
		if (error instanceof ForbiddenError) {
			return { ok: false, message: "You don't have permission to change this batch." };
		}
		throw error;
	}
}

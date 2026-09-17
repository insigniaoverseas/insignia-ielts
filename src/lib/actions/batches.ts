"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createBatch } from "@/lib/batches";
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

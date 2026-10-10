"use server";

import { revalidatePath } from "next/cache";

import { createAssignment } from "@/lib/assignments";
import { ForbiddenError, requirePermission } from "@/lib/rbac";
import type { FormState } from "@/lib/actions/types";

/**
 * Server Action behind screen 16, Assign a test (M6-03).
 *
 * The page guard protects the screen; this checks `assignment:manage` again,
 * because a Server Action is a public endpoint. `lib/assignments.ts` decides
 * which batches and students that permission's scope can reach.
 */

/** Assigns one test to the picked batches and students. */
export async function assignTestAction(_previous: FormState, formData: FormData): Promise<FormState> {
	try {
		const { actor, scope } = await requirePermission("assignment:manage");

		const result = await createAssignment(actor, scope, {
			testId: String(formData.get("testId") ?? ""),
			batchIds: formData.getAll("batches").map(String),
			studentIds: formData.getAll("students").map(String),
			opensAt: String(formData.get("opensAt") ?? ""),
			dueBy: String(formData.get("dueBy") ?? ""),
			attempts: String(formData.get("attempts") ?? "1"),
			allowReview: formData.get("allowReview") === "on",
		});

		if (!result.ok) return { ok: false, message: result.message, field: result.field };

		revalidatePath("/teacher/dashboard");
		revalidatePath("/tests");
		revalidatePath("/home");
		return { ok: true, message: result.message };
	} catch (error) {
		if (error instanceof ForbiddenError) {
			return { ok: false, message: "You don't have permission to assign tests." };
		}
		throw error;
	}
}

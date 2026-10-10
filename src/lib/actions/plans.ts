"use server";

import { revalidatePath } from "next/cache";

import { validateExtension } from "@/lib/plan-extension";
import { extendPlans } from "@/lib/plans";
import { ForbiddenError, requirePermission } from "@/lib/rbac";
import type { FormState } from "@/lib/actions/types";

/**
 * Extends the selected students' plans from screen 24 (M5-06). `student:manage`
 * again here — a Server Action is a public endpoint — and `extendPlans` keeps
 * it to plans the actor can see.
 */
export async function extendPlansAction(input: { studentIds: string[]; months: number; reason: string }): Promise<FormState> {
	try {
		const { actor } = await requirePermission("student:manage");
		const checked = validateExtension({
			studentIds: Array.isArray(input?.studentIds) ? input.studentIds.map(String) : [],
			months: Number(input?.months),
			reason: String(input?.reason ?? ""),
		});
		if (!checked.ok) return { ok: false, message: checked.message };

		const result = await extendPlans(actor, checked);
		if (result.ok) {
			revalidatePath("/admin/plans");
			revalidatePath("/admin/overview");
			revalidatePath("/admin/students");
		}
		return result;
	} catch (error) {
		if (error instanceof ForbiddenError) return { ok: false, message: "You don't have permission to extend plans." };
		throw error;
	}
}

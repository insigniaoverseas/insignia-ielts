"use server";

import { revalidatePath } from "next/cache";

import { giveMark } from "@/lib/attempts/give-mark";
import { ForbiddenError, requirePermission } from "@/lib/rbac";
import type { FormState } from "@/lib/actions/types";

/**
 * "Give the mark" on screen 18 (M6-05). `mark:override` again here — a Server
 * Action is a public endpoint — and `giveMark` keeps it to attempts the
 * teacher can see.
 */
export async function giveMarkAction(input: { attemptId: string; qNumber: number; note: string; assignmentId: string }): Promise<FormState> {
	try {
		const { actor } = await requirePermission("mark:override");
		const result = await giveMark(actor, String(input?.attemptId ?? ""), Number(input?.qNumber), String(input?.note ?? ""));
		if (result.ok) revalidatePath(`/teacher/results/${String(input?.assignmentId ?? "")}`);
		return result;
	} catch (error) {
		if (error instanceof ForbiddenError) return { ok: false, message: "You don't have permission to change marks." };
		throw error;
	}
}

"use server";

import { revalidatePath } from "next/cache";

import { updateAnswerKey, type KeyEdit } from "@/lib/answer-key-edit";
import { ForbiddenError, requirePermission } from "@/lib/rbac";
import type { FormState } from "@/lib/actions/types";

/**
 * Saves screen 27's edited answers (M5-09). `test:author` again — a Server
 * Action is a public endpoint — and `updateAnswerKey` keeps it to tests the
 * author can see, validates the result and re-marks finished attempts.
 */
export async function saveAnswerKeyAction(testId: string, edits: KeyEdit[]): Promise<FormState> {
	try {
		const { actor, scope } = await requirePermission("test:author");
		const safe = (Array.isArray(edits) ? edits : []).map((e) => ({
			n: Number(e?.n),
			answer: Array.isArray(e?.answer) ? e.answer.map(String) : [],
			acceptedVariants: Array.isArray(e?.acceptedVariants) ? e.acceptedVariants.map(String) : [],
		}));
		const result = await updateAnswerKey(actor, scope, String(testId), safe);
		if (result.ok) revalidatePath(`/admin/library/${testId}/answer-key`);
		return result;
	} catch (error) {
		if (error instanceof ForbiddenError) return { ok: false, message: "You don't have permission to change answer keys." };
		throw error;
	}
}

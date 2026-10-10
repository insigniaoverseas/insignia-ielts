"use server";

import { revalidatePath } from "next/cache";

import { ForbiddenError, requirePermission } from "@/lib/rbac";
import { changeStudentPhone, sendStudentPasswordReset } from "@/lib/student-account";
import type { FormState } from "@/lib/actions/types";

/**
 * Screen 23's account buttons (M5-05). `student:manage` again here — Server
 * Actions are public endpoints — and `lib/student-account.ts` keeps each to
 * students the actor can see.
 */

/** "Change phone number". */
export async function changeStudentPhoneAction(studentId: string, phone: string): Promise<FormState> {
	try {
		const { actor } = await requirePermission("student:manage");
		const result = await changeStudentPhone(actor, String(studentId), String(phone ?? ""));
		if (result.ok) revalidatePath(`/admin/students/${studentId}`);
		return result;
	} catch (error) {
		if (error instanceof ForbiddenError) return { ok: false, message: "You don't have permission to change students." };
		throw error;
	}
}

/** "Send a password reset link". */
export async function sendStudentResetAction(studentId: string): Promise<FormState> {
	try {
		const { actor } = await requirePermission("student:manage");
		return await sendStudentPasswordReset(actor, String(studentId));
	} catch (error) {
		if (error instanceof ForbiddenError) return { ok: false, message: "You don't have permission to do that." };
		throw error;
	}
}

"use server";

import { revalidatePath } from "next/cache";

import { UNLOCK_PERMISSIONS } from "@/lib/auth/lockout-rules";
import { ForbiddenError, requireAnyPermission, requirePermission } from "@/lib/rbac";
import { changeStudentPhone, sendStudentPasswordReset, unlockStudentSignIn } from "@/lib/student-account";
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

/**
 * "Unlock sign-in" — on the student's page for admins, and on the batch
 * roster for teachers. `revalidate` is the page to refresh so the "Locked out"
 * label goes; only the two pages that show the button are accepted.
 */
export async function unlockStudentSignInAction(studentId: string, revalidate: string): Promise<FormState> {
	try {
		const actor = await requireAnyPermission(UNLOCK_PERMISSIONS);
		const result = await unlockStudentSignIn(actor, String(studentId));
		const path = String(revalidate ?? "");
		if (result.ok && /^\/(admin\/students|teacher\/batches)\/[0-9a-f-]{36}$/i.test(path)) revalidatePath(path);
		return result;
	} catch (error) {
		if (error instanceof ForbiddenError) return { ok: false, message: "You don't have permission to do that." };
		throw error;
	}
}

"use server";

import { revalidatePath } from "next/cache";

import { resendInvitation, revokeInvitation } from "@/lib/auth/invitations";
import { ForbiddenError, requirePermission } from "@/lib/rbac";
import { changeStaffRole, setStaffActive } from "@/lib/staff";
import type { FormState } from "@/lib/actions/types";

/**
 * Screen 28's controls (M9-03). Each re-checks permission here — Server
 * Actions are public endpoints — and the functions they call check the
 * *target* too: you can only act on staff you could have invited, at your
 * centre, never the Owner and never yourself.
 */

const done = (result: FormState) => {
	if (result?.ok) revalidatePath("/admin/users");
	return result;
};
const refused = (error: unknown, message: string): FormState => {
	if (error instanceof ForbiddenError) return { ok: false, message };
	throw error;
};

/** Suspend (`active: false`) or reactivate a staff member. */
export async function setStaffActiveAction(userId: string, active: boolean): Promise<FormState> {
	try {
		const { actor } = await requirePermission("staff:manage");
		return done(await setStaffActive(actor, String(userId), Boolean(active)));
	} catch (error) {
		return refused(error, "You don't have permission to manage staff.");
	}
}

/** Move a staff member to another staff role — the Owner only. */
export async function changeStaffRoleAction(userId: string, roleKey: string): Promise<FormState> {
	try {
		const { actor } = await requirePermission("role:change");
		return done(await changeStaffRole(actor, String(userId), String(roleKey)));
	} catch (error) {
		return refused(error, "Only the owner can change roles.");
	}
}

/** Send a pending staff invitation again (a fresh link; the old one stops working). */
export async function resendStaffInvitationAction(invitationId: string): Promise<FormState> {
	try {
		const { actor, scope } = await requirePermission("staff:manage");
		const result = await resendInvitation(actor, scope, String(invitationId));
		return done(
			result.ok
				? { ok: true, message: result.delivered ? `Invitation sent again to ${result.email}.` : "A new link was made, but the email didn't send. Try again." }
				: { ok: false, message: result.message },
		);
	} catch (error) {
		return refused(error, "You don't have permission to manage staff.");
	}
}

/** Cancel a pending staff invitation; its link stops working. */
export async function revokeStaffInvitationAction(invitationId: string): Promise<FormState> {
	try {
		const { actor, scope } = await requirePermission("staff:manage");
		const ok = await revokeInvitation(actor, scope, String(invitationId));
		return done(ok ? { ok: true, message: "Invitation cancelled. That link no longer works." } : { ok: false, message: "That invitation couldn't be cancelled." });
	} catch (error) {
		return refused(error, "You don't have permission to manage staff.");
	}
}

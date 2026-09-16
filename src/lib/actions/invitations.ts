"use server";

import { revalidatePath } from "next/cache";

import { createInvitation, resendInvitation, revokeInvitation } from "@/lib/auth/invitations";
import { ForbiddenError, requirePermission } from "@/lib/rbac";
import type { Permission } from "@/lib/permissions";
import type { Json } from "@/lib/supabase/database.types";
import type { FormState } from "@/lib/actions/types";

/**
 * Server Actions behind the invite screens (M5-04, screen 22).
 *
 * The permission needed depends on **which role is being invited**, so each
 * action resolves that first and asks `requirePermission` for it. A teacher
 * calling this endpoint directly with `roleKey: "admin"` is refused twice: here,
 * and again inside `createInvitation` via `canInviteRole`.
 */

/** The permission required to invite into each role. Unknown roles are refused. */
const PERMISSION_FOR_ROLE: Record<string, Permission> = {
	student: "student:manage",
	teacher: "staff:manage",
	invigilator: "staff:manage",
	admin: "admin:manage",
};

/** Reads the plan fields the invite form collects into `invitations.plan_template`. */
function planTemplateFrom(formData: FormData): { [key: string]: Json | undefined } | null {
	const months = Number(formData.get("planMonths") ?? 0);
	if (!Number.isFinite(months) || months <= 0) return null;

	const startsOn = String(formData.get("planStart") ?? "").trim();
	return {
		months,
		plan_name: `${months}-month plan`,
		// Blank means "from the day they accept", which the database defaults to.
		...(startsOn ? { starts_on: startsOn } : {}),
	};
}

/** Invites one person. Used by screen 22's form. */
export async function inviteAction(_previous: FormState, formData: FormData): Promise<FormState> {
	const roleKey = String(formData.get("role") ?? "student");
	const permission = PERMISSION_FOR_ROLE[roleKey];
	if (!permission) return { ok: false, message: "That role doesn't exist.", field: "role" };

	try {
		const { actor, scope } = await requirePermission(permission);

		const result = await createInvitation(actor, scope, {
			email: String(formData.get("email") ?? ""),
			name: String(formData.get("name") ?? ""),
			roleKey,
			branchId: formData.get("branch") ? String(formData.get("branch")) : null,
			batchId: formData.get("batch") ? String(formData.get("batch")) : null,
			phone: formData.get("phone") ? String(formData.get("phone")) : null,
			countryCode: formData.get("countryCode") ? String(formData.get("countryCode")) : null,
			planTemplate: planTemplateFrom(formData),
		});

		if (!result.ok) {
			const field = result.reason === "bad_email" ? "email" : result.reason === "bad_name" ? "name" : undefined;
			return { ok: false, message: result.message, field };
		}

		revalidatePath("/admin/students");

		// An invitation that was created but not delivered is a success with a
		// caveat, not a failure — the row is valid and Resend can be retried.
		return {
			ok: true,
			message: result.delivered
				? `Invitation sent to ${result.email}.`
				: `Invitation created, but the email didn't send. Use Resend to try again.`,
		};
	} catch (error) {
		if (error instanceof ForbiddenError) {
			return { ok: false, message: "You don't have permission to invite that person." };
		}
		throw error;
	}
}

/**
 * Invites a list of people at once — the bulk paste and CSV path on screen 22.
 *
 * Each row is attempted independently and reported on its own: one bad address
 * in a pasted list of forty must not cost the other thirty-nine their
 * invitations, and the admin needs to know exactly which ones to fix.
 */
export async function bulkInviteAction(_previous: FormState, formData: FormData): Promise<FormState> {
	const roleKey = String(formData.get("role") ?? "student");
	const permission = PERMISSION_FOR_ROLE[roleKey];
	if (!permission) return { ok: false, message: "That role doesn't exist.", field: "role" };

	// One per line: "Name <email>" or "Name, email" or a bare email.
	const rows = String(formData.get("people") ?? "")
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);

	if (rows.length === 0) return { ok: false, message: "Paste at least one person.", field: "people" };

	try {
		const { actor, scope } = await requirePermission(permission);
		const batchId = formData.get("batch") ? String(formData.get("batch")) : null;
		const planTemplate = planTemplateFrom(formData);

		const failures: string[] = [];
		let sent = 0;

		for (const row of rows) {
			const match = row.match(/^(.*?)[<,;\s]+([^\s<>,;]+@[^\s<>,;]+)>?$/);
			const name = match?.[1]?.trim().replace(/[",]+$/, "") ?? "";
			const email = match?.[2] ?? row;

			const result = await createInvitation(actor, scope, {
				email,
				// A bare email is still invitable; the local part is a reasonable
				// stand-in for a name an admin can correct later.
				name: name || email.split("@")[0],
				roleKey,
				batchId,
				planTemplate,
			});

			if (result.ok) sent += 1;
			else failures.push(`${result.email || row} — ${result.message}`);
		}

		revalidatePath("/admin/students");

		if (failures.length === 0) {
			return { ok: true, message: `${sent} invitation${sent === 1 ? "" : "s"} sent.` };
		}
		return {
			ok: sent > 0,
			message: [`${sent} sent, ${failures.length} skipped:`, ...failures].join("\n"),
		};
	} catch (error) {
		if (error instanceof ForbiddenError) {
			return { ok: false, message: "You don't have permission to invite those people." };
		}
		throw error;
	}
}

/** Cancels a pending invitation. Its link then shows "cancelled", not a 404. */
export async function revokeInvitationAction(_previous: FormState, formData: FormData): Promise<FormState> {
	try {
		const { actor, scope } = await requirePermission("student:manage");
		const done = await revokeInvitation(actor, scope, String(formData.get("invitationId") ?? ""));
		revalidatePath("/admin/students");
		return done
			? { ok: true, message: "Invitation cancelled." }
			: { ok: false, message: "That invitation can't be cancelled." };
	} catch (error) {
		if (error instanceof ForbiddenError) return { ok: false, message: "You don't have permission to do that." };
		throw error;
	}
}

/**
 * Sends a fresh link. **The previous link stops working** — we store only a
 * hash and cannot recover the original, and replacing it is safer anyway if the
 * first email went astray.
 */
export async function resendInvitationAction(_previous: FormState, formData: FormData): Promise<FormState> {
	try {
		const { actor, scope } = await requirePermission("student:manage");
		const result = await resendInvitation(actor, scope, String(formData.get("invitationId") ?? ""));
		revalidatePath("/admin/students");

		if (!result.ok) return { ok: false, message: result.message };
		return {
			ok: true,
			message: result.delivered
				? `A new invitation is on its way to ${result.email}. The old link no longer works.`
				: "A new invitation was created, but the email didn't send.",
		};
	} catch (error) {
		if (error instanceof ForbiddenError) return { ok: false, message: "You don't have permission to do that." };
		throw error;
	}
}

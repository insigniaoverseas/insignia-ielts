import "server-only";

import { canInviteRole, type Actor } from "@/lib/permissions";
import { appBaseUrl } from "@/lib/env";
import { getMailer } from "@/lib/mail/mailer";
import { invitationEmail } from "@/lib/mail/templates";
import { recordAudit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { mintInvitationToken } from "@/lib/auth/tokens";

/**
 * Creating, revoking and resending invitations (M1-02).
 *
 * Every account in the product begins here (D9) — there is no signup route —
 * so this module is the only door into the system, and it is where the rule
 * that **an invitation can never grant more than its sender holds** is
 * enforced. RLS is the other gate; neither is trusted alone (`MVP-1.md` §13).
 *
 * Writes go through the secret-key client because `authenticated` holds no
 * INSERT on `invitations`: an invitation a user could write for themselves is
 * a signup route wearing a different hat.
 */

/**
 * How long an invitation stays usable.
 *
 * Seven days is a compromise: long enough that a student who is invited on a
 * Friday still has a live link after the weekend, short enough that a forwarded
 * or leaked email stops being a way in reasonably soon.
 */
export const INVITATION_TTL_DAYS = 7;

/** What an admin supplies to invite one person. */
export type InviteRequest = {
	email: string;
	name: string;
	/** `roles.key` — `student`, `teacher`, `invigilator`, `admin`. Never `super_admin`. */
	roleKey: string;
	/** Ignored unless the actor holds the permission in `all` scope. */
	branchId?: string | null;
	batchId?: string | null;
	phone?: string | null;
	countryCode?: string | null;
	/** Plan length and start, applied when the account is created. */
	planTemplate?: { [key: string]: Json | undefined } | null;
};

/** Why an invitation was refused, for the screen to phrase. */
export type InviteRefusal =
	| "forbidden"
	| "bad_email"
	| "bad_name"
	| "unknown_role"
	| "outside_scope"
	| "already_a_user"
	| "mail_failed"
	| "failed";

/** The result of trying to invite one person. */
export type InviteOutcome =
	| { ok: true; invitationId: string; email: string; delivered: boolean }
	| { ok: false; email: string; reason: InviteRefusal; message: string };

/** Normalises an email the way the database's CHECK constraint expects. */
function normaliseEmail(raw: string): string | null {
	const email = raw.trim().toLowerCase();
	if (email.length < 3 || email.length > 320) return null;
	// Deliberately permissive: the authority on whether an address works is
	// whether the invitation arrives, not a regex.
	if (!/^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(email)) return null;
	return email;
}

/**
 * Invites one person.
 *
 * Refuses, in this order: a role the actor may not grant, a branch outside
 * their scope, a malformed email or name, and an address that already has an
 * account. Any pending invitation for the same address is revoked and replaced,
 * which is also what makes "resend" work.
 *
 * @param actor The signed-in inviter, already checked by `requirePermission`.
 * @param scope The scope they hold that permission in — `branch` pins the
 *   invitation to their own branch regardless of what was submitted.
 */
export async function createInvitation(
	actor: Actor,
	scope: "own" | "batch" | "branch" | "all",
	request: InviteRequest,
): Promise<InviteOutcome> {
	const email = normaliseEmail(request.email);
	const name = request.name.trim();

	// ── The gate that matters: never grant above the inviter ─────────────────
	// `canInviteRole` maps the target role to the permission it needs and
	// refuses `super_admin` outright, so a teacher cannot mint an admin invite
	// (BUILD-STEPS step 32) and nobody can mint an Owner.
	if (!canInviteRole(actor, request.roleKey)) {
		return {
			ok: false,
			email: request.email,
			reason: "forbidden",
			message: "You can't invite someone to that role.",
		};
	}

	if (!email) {
		return { ok: false, email: request.email, reason: "bad_email", message: "That doesn't look like an email address." };
	}
	if (name.length === 0) {
		return { ok: false, email, reason: "bad_name", message: "A full name is needed." };
	}

	const db = createAdminClient();

	// ── Branch: `branch` scope cannot reach outside its own ──────────────────
	const branchId = scope === "all" ? (request.branchId ?? actor.branchId) : actor.branchId;
	if (scope !== "all" && request.branchId && request.branchId !== actor.branchId) {
		return {
			ok: false,
			email,
			reason: "outside_scope",
			message: "You can only invite people to your own centre.",
		};
	}

	const { data: role } = await db.from("roles").select("id, name").eq("key", request.roleKey).maybeSingle();
	if (!role) {
		return { ok: false, email, reason: "unknown_role", message: "That role doesn't exist." };
	}

	// ── A batch must belong to the branch being invited into ─────────────────
	if (request.batchId) {
		const { data: batch } = await db.from("batches").select("id, branch_id").eq("id", request.batchId).maybeSingle();
		if (!batch || batch.branch_id !== branchId) {
			return { ok: false, email, reason: "outside_scope", message: "That batch isn't at this centre." };
		}
	}

	// ── Already has an account? Re-inviting would orphan the first one ───────
	const { data: existing } = await db.from("users").select("id").eq("email", email).maybeSingle();
	if (existing) {
		return {
			ok: false,
			email,
			reason: "already_a_user",
			message: "Someone already has an account with that email.",
		};
	}

	// ── Replace any pending invitation ───────────────────────────────────────
	// `invitations_one_pending_per_email` allows only one, and re-inviting is a
	// normal thing an admin does when the first link was never opened.
	await db
		.from("invitations")
		.update({ status: "revoked" })
		.eq("email", email)
		.eq("status", "pending");

	const { token, tokenHash } = await mintInvitationToken();
	const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 86_400_000);

	const { data: created, error } = await db
		.from("invitations")
		.insert({
			email,
			name,
			phone: request.phone?.trim() || null,
			country_code: request.countryCode?.trim() || null,
			role_id: role.id,
			branch_id: branchId,
			batch_id: request.batchId ?? null,
			plan_template: request.planTemplate ?? null,
			token_hash: tokenHash,
			expires_at: expiresAt.toISOString(),
			invited_by: actor.id,
		})
		.select("id")
		.single();

	if (error || !created) {
		console.error("invitation insert failed:", error?.message);
		return { ok: false, email, reason: "failed", message: "Something went wrong creating that invitation." };
	}

	await recordAudit({
		actorId: actor.id,
		branchId,
		action: "invite.create",
		entity: "invitation",
		entityId: created.id,
		// The token is deliberately absent: this row is readable by admins.
		meta: { email, role: request.roleKey, batch_id: request.batchId ?? null },
	});

	const delivered = await deliverInvitation({
		email,
		name,
		token,
		roleLabel: role.name,
		branchId,
		invitationId: created.id,
		actorId: actor.id,
	});

	return { ok: true, invitationId: created.id, email, delivered };
}

/**
 * Sends the invitation email.
 *
 * A failure here does **not** fail the invitation: the row is already valid, and
 * an admin can resend. It is recorded in the audit trail so that "they never got
 * it" is an answerable question rather than a guess.
 */
async function deliverInvitation(args: {
	email: string;
	name: string;
	token: string;
	roleLabel: string;
	branchId: string;
	invitationId: string;
	actorId: string | null;
}): Promise<boolean> {
	const { data: branch } = await createAdminClient()
		.from("branches")
		.select("name")
		.eq("id", args.branchId)
		.maybeSingle();

	const body = invitationEmail({
		name: args.name,
		branchName: branch?.name ?? "Insignia IELTS",
		roleLabel: args.roleLabel,
		url: `${appBaseUrl()}/invite/${args.token}`,
		validFor: `${INVITATION_TTL_DAYS} days`,
	});

	try {
		await getMailer().send({ to: args.email, ...body });
		return true;
	} catch (error) {
		console.error(`invitation email to ${args.email} failed:`, error);
		await recordAudit({
			actorId: args.actorId,
			branchId: args.branchId,
			action: "invite.send_failed",
			entity: "invitation",
			entityId: args.invitationId,
			meta: { email: args.email },
		});
		return false;
	}
}

/** Revokes a pending invitation. A revoked link shows its own dead end, not a 404. */
export async function revokeInvitation(actor: Actor, scope: string, invitationId: string): Promise<boolean> {
	const db = createAdminClient();
	const { data: invitation } = await db
		.from("invitations")
		.select("id, email, branch_id, status, roles ( key )")
		.eq("id", invitationId)
		.maybeSingle();

	if (!invitation || invitation.status !== "pending") return false;
	if (scope !== "all" && invitation.branch_id !== actor.branchId) return false;
	if (invitation.roles && !canInviteRole(actor, invitation.roles.key)) return false;

	const { error } = await db.from("invitations").update({ status: "revoked" }).eq("id", invitationId).eq("status", "pending");
	if (error) return false;

	await recordAudit({
		actorId: actor.id,
		branchId: invitation.branch_id,
		action: "invite.revoke",
		entity: "invitation",
		entityId: invitationId,
		meta: { email: invitation.email },
	});
	return true;
}

/**
 * Resends an invitation.
 *
 * This **mints a new token and invalidates the old link**, because we store
 * only a hash and genuinely cannot recover the original (see `tokens.ts`).
 * That is the safer behaviour anyway: if the first email went to the wrong
 * address, resending the same link would not take it back.
 */
export async function resendInvitation(actor: Actor, scope: string, invitationId: string): Promise<InviteOutcome> {
	const db = createAdminClient();
	const { data: invitation } = await db
		.from("invitations")
		.select("id, email, name, phone, country_code, branch_id, batch_id, plan_template, status, roles ( key )")
		.eq("id", invitationId)
		.maybeSingle();

	if (!invitation || invitation.status !== "pending") {
		return { ok: false, email: "", reason: "failed", message: "That invitation can't be resent." };
	}
	if (scope !== "all" && invitation.branch_id !== actor.branchId) {
		return { ok: false, email: invitation.email, reason: "outside_scope", message: "That invitation isn't at your centre." };
	}

	return createInvitation(actor, scope as "branch" | "all", {
		email: invitation.email,
		name: invitation.name,
		roleKey: invitation.roles?.key ?? "student",
		branchId: invitation.branch_id,
		batchId: invitation.batch_id,
		phone: invitation.phone,
		countryCode: invitation.country_code,
		planTemplate: (invitation.plan_template as { [key: string]: Json | undefined } | null) ?? null,
	});
}

import "server-only";

import { hashInvitationToken, isPlausibleToken } from "@/lib/auth/tokens";
import { firstPasswordProblem } from "@/lib/auth/password";
import { recordAudit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import type { InviteAcceptance } from "@/lib/view-models/auth";

/**
 * Accepting an invitation (M1-05, M1-06) — the only way an account is ever
 * created, since there is no signup route (D9).
 *
 * Everything here runs for a **signed-out stranger holding a URL**, so it is
 * the most exposed surface in the product. Two consequences shape the code:
 *
 * - A token is looked up by its hash, never by anything the visitor can
 *   enumerate, and a malformed one is refused without a database round trip.
 * - Every dead end returns a *state with a sentence*, never a 404 and never
 *   the word "invalid". An expired link is the likeliest thing to go wrong in
 *   enrolment and the person reading it has done nothing wrong.
 */

/**
 * Reads the invitation behind a token, for the accept screen.
 *
 * Returns the same `InviteAcceptance` shape the screen was built against, so
 * the mock drops out without touching the component.
 */
export async function lookupInvitation(token: string): Promise<InviteAcceptance> {
	if (!isPlausibleToken(token)) {
		return {
			state: "unknown",
			message: "We don't recognise this link. Check you copied the whole thing from your email.",
		};
	}

	const { data: invite } = await createAdminClient()
		.from("invitations")
		.select("email, name, status, expires_at, roles ( name ), branches ( name ), batches ( name )")
		.eq("token_hash", await hashInvitationToken(token))
		.maybeSingle();

	if (!invite) {
		return {
			state: "unknown",
			message: "We don't recognise this link. Check you copied the whole thing from your email.",
		};
	}

	if (invite.status === "accepted") {
		return { state: "used", message: "This link has already been used. If that was you, just sign in." };
	}
	if (invite.status === "revoked") {
		return { state: "revoked", message: "This invitation was cancelled. Ask your teacher to send a new one." };
	}
	// Checked against the clock, not against `status`: the housekeeping job that
	// flips expired rows may not have run, and the deadline is what counts.
	if (invite.status === "expired" || new Date(invite.expires_at) <= new Date()) {
		return {
			state: "expired",
			message: "This link has expired. Ask your teacher for a new one — it only takes a minute.",
		};
	}

	return {
		state: "valid",
		token,
		email: invite.email,
		fullName: invite.name,
		roleLabel: invite.roles?.name ?? "Student",
		branchName: invite.branches?.name ?? "Insignia IELTS",
		batchName: invite.batches?.name ?? null,
	};
}

/** What acceptance can return to the screen. */
export type AcceptOutcome =
	| { ok: true; roleKey: string }
	| { ok: false; message: string; dead?: "expired" | "used" | "revoked" | "unknown" };

/**
 * Turns a valid invitation into a real account: an auth user with the password
 * they chose, plus the profile, batch membership and plan.
 *
 * **Ordering.** The Supabase Auth user has to exist before the Postgres
 * function can reference its id, and an Auth API call cannot join a database
 * transaction. So: create the auth user, then do every database row in one
 * `accept_invitation` call — and if that call fails, delete the auth user
 * again. Without that rollback a retry would hit "email already registered"
 * on an account the student cannot sign in to.
 */
export async function acceptInvitation(token: string, password: string): Promise<AcceptOutcome> {
	if (!isPlausibleToken(token)) {
		return { ok: false, dead: "unknown", message: "We don't recognise this link." };
	}

	const problem = firstPasswordProblem(password);
	if (problem) return { ok: false, message: problem };

	const db = createAdminClient();
	const tokenHash = await hashInvitationToken(token);

	// Re-read rather than trusting the page that rendered the form: the
	// invitation may have been revoked in the minute since it loaded.
	const { data: invite } = await db
		.from("invitations")
		.select("id, email, branch_id, status, expires_at")
		.eq("token_hash", tokenHash)
		.maybeSingle();

	if (!invite) return { ok: false, dead: "unknown", message: "We don't recognise this link." };
	if (invite.status === "accepted") {
		return { ok: false, dead: "used", message: "This link has already been used. If that was you, just sign in." };
	}
	if (invite.status === "revoked") {
		return { ok: false, dead: "revoked", message: "This invitation was cancelled. Ask your teacher to send a new one." };
	}
	if (invite.status === "expired" || new Date(invite.expires_at) <= new Date()) {
		return { ok: false, dead: "expired", message: "This link has expired. Ask your teacher for a new one." };
	}

	// ── 1. The auth user ─────────────────────────────────────────────────────
	// `email_confirm: true` because receiving the invitation already proved the
	// address (MVP-1 §9) — a second confirmation email would be a step that
	// teaches students their account is broken when it lands in spam.
	const { data: created, error: authError } = await db.auth.admin.createUser({
		email: invite.email,
		password,
		email_confirm: true,
	});

	if (authError || !created.user) {
		// Supabase's leaked-password protection surfaces here. Pass its reason
		// through when it is about the password, since the student can act on it.
		const message = /password/i.test(authError?.message ?? "")
			? "That password has appeared in a data breach. Please choose a different one."
			: "Something went wrong setting up your account. Please try again.";
		console.error(`accept: createUser failed for invitation ${invite.id}:`, authError?.message);
		return { ok: false, message };
	}

	// ── 2. Every database row, or none ───────────────────────────────────────
	const { data: roleKey, error: rpcError } = await db.rpc("accept_invitation", {
		p_token_hash: tokenHash,
		p_user_id: created.user.id,
	});

	if (rpcError) {
		// ── 3. Roll the auth user back ─────────────────────────────────────────
		const { error: cleanupError } = await db.auth.admin.deleteUser(created.user.id);
		if (cleanupError) {
			// Worth shouting about: this is the one state that needs a human.
			console.error(`accept: ORPHANED auth user ${created.user.id} after ${rpcError.message}`);
		}
		console.error(`accept: accept_invitation failed for ${invite.id}:`, rpcError.message);
		return { ok: false, message: "Something went wrong setting up your account. Please try again." };
	}

	await recordAudit({
		actorId: created.user.id,
		branchId: invite.branch_id,
		action: "invite.accept",
		entity: "invitation",
		entityId: invite.id,
		meta: { email: invite.email },
	});

	return { ok: true, roleKey: roleKey ?? "student" };
}

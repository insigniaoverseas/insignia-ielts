"use server";

import { redirect } from "next/navigation";

import { acceptInvitation } from "@/lib/auth/acceptance";
import { completePasswordReset, requestPasswordReset, RESET_REQUESTED_MESSAGE } from "@/lib/auth/password-reset";
import { landingPathFor, signIn } from "@/lib/auth/sign-in";
import { endSession } from "@/lib/auth/sessions";
import { recordAudit } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import type { AcceptFormState, FormState, LoginFormState, ResetFormState, ResetRequestState } from "@/lib/actions/types";

/**
 * Server Actions for signing in, signing out, accepting an invitation and the
 * one-time first-run setup.
 *
 * Every export here is a public endpoint — `"use server"` means the browser can
 * call it directly — so each one re-establishes who the caller is rather than
 * trusting anything the form sent.
 */

/** Signs in and redirects. Wrong credentials return a message; they never throw. */
export async function signInAction(_previous: LoginFormState, formData: FormData): Promise<LoginFormState> {
	const email = String(formData.get("email") ?? "");
	const password = String(formData.get("password") ?? "");
	const next = formData.get("next");

	if (!email || !password) {
		return { message: "Please fill in both boxes.", triesLeft: null, lockedUntil: null };
	}

	const result = await signIn(email, password, next ? String(next) : null);

	if (!result.ok) {
		return {
			message: result.message,
			triesLeft: result.triesLeft,
			lockedUntil: result.lockedUntil?.toISOString() ?? null,
		};
	}

	// `redirect` throws to unwind — it must sit outside any try/catch.
	redirect(result.redirectTo);
}

/** Ends this browser's session and returns to the login screen. */
export async function signOutAction(): Promise<void> {
	const supabase = await createClient();
	const { data } = await supabase.auth.getClaims();
	const userId = data?.claims?.sub;

	await endSession();
	await supabase.auth.signOut();

	if (userId) {
		await recordAudit({ actorId: userId, branchId: null, action: "auth.sign_out", entity: "user", entityId: userId });
	}

	redirect("/login");
}

/**
 * Accepts an invitation: sets the password, creates the account and signs them
 * straight in — landing on their own home screen rather than a login form they
 * would have to fill in with the password they just chose.
 */
export async function acceptInvitationAction(_previous: AcceptFormState, formData: FormData): Promise<AcceptFormState> {
	const token = String(formData.get("token") ?? "");
	const password = String(formData.get("password") ?? "");

	const result = await acceptInvitation(token, password);
	if (!result.ok) return { message: result.message, dead: result.dead };

	// Sign in with the credentials just created. If this somehow fails, the
	// account still exists, so send them to the login screen rather than
	// leaving them on a form whose token is now spent.
	const email = String(formData.get("email") ?? "");
	if (email) {
		const signedIn = await signIn(email, password, null);
		if (signedIn.ok) redirect(signedIn.redirectTo);
	}

	redirect(landingPathFor(result.roleKey));
}

/**
 * First-run setup: the Owner names their centre and themselves.
 *
 * Guarded in the database (`complete_first_run_setup`), which refuses any
 * caller but the pinned bootstrap account and refuses outright once any user
 * exists. This action does not re-implement that check — one authority.
 */
export async function completeFirstRunSetupAction(_previous: FormState, formData: FormData): Promise<FormState> {
	const supabase = await createClient();

	const { error } = await supabase.rpc("complete_first_run_setup", {
		p_branch_name: String(formData.get("branchName") ?? ""),
		p_branch_address: String(formData.get("branchAddress") ?? ""),
		p_owner_name: String(formData.get("ownerName") ?? ""),
		p_phone: String(formData.get("phone") ?? ""),
		p_country_code: String(formData.get("countryCode") ?? "+91"),
	});

	if (error) {
		return { ok: false, message: error.message.replace(/^.*?:\s*/, "") };
	}

	redirect("/admin/overview");
}

/**
 * Asks for a reset link (M1-15).
 *
 * Always reports the same thing. `requestPasswordReset` decides in silence
 * whether there is an account to send to — this action cannot tell, and neither
 * can the person submitting the form.
 */
export async function requestPasswordResetAction(
	_previous: ResetRequestState,
	formData: FormData,
): Promise<ResetRequestState> {
	const email = String(formData.get("email") ?? "");
	if (!email.includes("@")) {
		return { message: "Please enter your email address.", sent: false };
	}

	await requestPasswordReset(email);
	return { message: RESET_REQUESTED_MESSAGE, sent: true };
}

/** Sets the new password, then sends them to sign in with it. */
export async function completePasswordResetAction(
	_previous: ResetFormState,
	formData: FormData,
): Promise<ResetFormState> {
	const result = await completePasswordReset(
		String(formData.get("token") ?? ""),
		String(formData.get("password") ?? ""),
	);
	if (!result.ok) return { message: result.message };

	// Deliberately not signed in automatically, unlike accepting an invitation.
	// Completing a reset revokes every session that account holds — including,
	// if this was an intruder being locked out, theirs. Handing back a fresh
	// session here would undo that for whoever just used the link.
	redirect("/login?reset=1");
}

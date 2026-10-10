import "server-only";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { checkSignInAllowed, clearSignInFailures, recordFailedSignIn } from "@/lib/auth/lockout";
import { firstPasswordProblem } from "@/lib/auth/password";
import { SESSION_COOKIE } from "@/lib/auth/session-cookie";
import { clientIp } from "@/lib/auth/sign-in";
import { recordAudit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * Changing your password while signed in (screen 13's "Change my password").
 *
 * **The current password is asked for again.** A signed-in browser is not
 * proof of who is at it — a lab machine left open is exactly where someone
 * else would try this. And because it is a password check, it spends the same
 * lockout allowance as the login form: five wrong guesses here lock sign-in
 * too, so this screen cannot be used to guess a password the login form would
 * have stopped.
 *
 * **Every other session ends; this one stays.** Same reasoning as a reset
 * (`password-reset.ts`): if someone else was signed in as you, changing the
 * password has to put them out. Unlike a reset, the person here has just
 * proved the old password, so signing *them* out too would only be friction.
 */

/** What changing the password can return. */
export type ChangePasswordOutcome = { ok: true } | { ok: false; message: string; field?: "current" | "password" };

/**
 * Verifies `current` without touching the browser's session.
 *
 * A throwaway client with no cookie store: signing in through the request's
 * own client would replace the session cookies mid-request. The throwaway
 * session is signed out again at once so it does not linger in Auth.
 */
async function passwordMatches(email: string, password: string): Promise<boolean> {
	const probe = createClient<Database>(supabaseUrl(), supabasePublishableKey(), {
		auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
	});
	const { data, error } = await probe.auth.signInWithPassword({ email, password });
	if (error || !data.session) return false;
	await probe.auth.signOut({ scope: "local" });
	return true;
}

/**
 * Checks the current password, sets the new one and ends every other session.
 *
 * @param userId The signed-in user, from the verified JWT — never from the form.
 * @param email Their sign-in address, also from the JWT.
 */
export async function changePassword(
	userId: string,
	email: string,
	current: string,
	next: string,
): Promise<ChangePasswordOutcome> {
	const normalised = email.trim().toLowerCase();

	const problem = firstPasswordProblem(next);
	if (problem) return { ok: false, message: problem, field: "password" };
	if (next === current) {
		return { ok: false, message: "Your new password must be different from the old one.", field: "password" };
	}

	const ip = await clientIp();
	const gate = await checkSignInAllowed(normalised, ip);
	if (!gate.allowed) {
		return { ok: false, message: "Too many wrong passwords. Please wait 15 minutes and try again.", field: "current" };
	}

	if (!(await passwordMatches(normalised, current))) {
		const after = await recordFailedSignIn(normalised, ip);
		return {
			ok: false,
			field: "current",
			message: after.allowed
				? "That isn't your current password."
				: "Too many wrong passwords. Please wait 15 minutes and try again.",
		};
	}
	await clearSignInFailures(normalised);

	const db = createAdminClient();
	const { error: authError } = await db.auth.admin.updateUserById(userId, { password: next });
	if (authError) {
		const breached = /password/i.test(authError.message);
		console.error(`change-password: updateUserById failed for ${userId}:`, authError.message);
		return {
			ok: false,
			field: breached ? "password" : undefined,
			message: breached
				? "That password has appeared in a data breach. Please choose a different one."
				: "Something went wrong changing your password. Please try again.",
		};
	}

	// Every session except the one making this change.
	const currentSessionId = (await cookies()).get(SESSION_COOKIE)?.value ?? null;
	let revoke = db
		.from("user_sessions")
		.update({ revoked_at: new Date().toISOString() })
		.eq("user_id", userId)
		.is("revoked_at", null);
	if (currentSessionId) revoke = revoke.neq("id", currentSessionId);
	const { error: revokeError } = await revoke;
	if (revokeError) {
		// The password has changed; asking them to retry would only confuse.
		console.error(`change-password: revoking other sessions failed for ${userId}:`, revokeError.message);
	}

	await recordAudit({
		actorId: userId,
		branchId: null,
		action: "auth.password_change",
		entity: "user",
		entityId: userId,
		meta: { other_sessions_revoked: !revokeError },
	});

	return { ok: true };
}

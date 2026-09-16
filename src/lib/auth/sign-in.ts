import "server-only";

import { headers } from "next/headers";

import { checkSignInAllowed, clearSignInFailures, recordFailedSignIn, type SignInVerdict } from "@/lib/auth/lockout";
import { startSession } from "@/lib/auth/sessions";
import { recordAudit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Signing in (M1-08).
 *
 * **One message for every failure.** A wrong password, an address with no
 * account, a suspended account and a deactivated one all return the same
 * sentence. Saying "no account with that email" hands an attacker a list of
 * which addresses are real (`MVP-1.md` §8) — and in a product where the email
 * *is* the identifier, that list is most of the way to a targeted attack on a
 * teenager's account.
 *
 * The one exception is a **lock**, which says how long it lasts. That is not a
 * leak worth worrying about — you can only see it by already having failed five
 * times against that address — and hiding it would send a student to the front
 * desk over something that resolves itself in fifteen minutes.
 */

/** The sentence every failure gets, whatever actually went wrong. */
const GENERIC_FAILURE = "That email and password don't match.";

/** What the login screen renders next. */
export type SignInResult =
	| { ok: true; redirectTo: string }
	| { ok: false; message: string; triesLeft: number | null; lockedUntil: Date | null };

/** Where each role belongs after signing in. */
export function landingPathFor(roleKey: string): string {
	switch (roleKey) {
		case "super_admin":
		case "admin":
			return "/admin/overview";
		case "teacher":
			return "/teacher/dashboard";
		case "invigilator":
			return "/teacher/dashboard";
		default:
			return "/home";
	}
}

/**
 * The client's IP, for the per-IP half of the lockout.
 *
 * `cf-connecting-ip` is set by Cloudflare and cannot be spoofed by the client;
 * `x-forwarded-for` is a local-development fallback and is only ever trusted
 * for its first entry.
 */
async function clientIp(): Promise<string | null> {
	const h = await headers();
	const cf = h.get("cf-connecting-ip");
	if (cf) return cf;
	const forwarded = h.get("x-forwarded-for");
	return forwarded ? (forwarded.split(",")[0]?.trim() ?? null) : null;
}

/** Turns a lockout verdict into the shape the screen renders. */
function refusal(verdict: Extract<SignInVerdict, { allowed: false }>): SignInResult {
	return {
		ok: false,
		message:
			verdict.scope === "ip"
				? "Too many sign-in attempts from this network. Please wait a few minutes."
				: GENERIC_FAILURE,
		triesLeft: null,
		lockedUntil: verdict.lockedUntil,
	};
}

/**
 * Verifies an email and password and, on success, opens a session.
 *
 * @param nextPath Where the visitor was heading before they were asked to sign
 *   in. Only used when it is a relative path — an absolute URL here would be an
 *   open redirect, and a login form is exactly where one gets phished.
 */
export async function signIn(email: string, password: string, nextPath?: string | null): Promise<SignInResult> {
	const normalised = email.trim().toLowerCase();
	const ip = await clientIp();

	// Checked before the password is verified, so a locked account never
	// reaches Supabase Auth and the lock cannot be extended by more guessing.
	const gate = await checkSignInAllowed(normalised, ip);
	if (!gate.allowed) return refusal(gate);

	const supabase = await createClient();
	const { data, error } = await supabase.auth.signInWithPassword({ email: normalised, password });

	if (error || !data.user) {
		const after = await recordFailedSignIn(normalised, ip);
		if (!after.allowed) return refusal(after);
		return { ok: false, message: GENERIC_FAILURE, triesLeft: after.triesLeft, lockedUntil: null };
	}

	// ── The account must still be usable ─────────────────────────────────────
	// Suspended and inactive users hold a valid password and nothing else.
	const { data: profile } = await createAdminClient()
		.from("users")
		.select("id, branch_id, status, roles ( key )")
		.eq("id", data.user.id)
		.maybeSingle();

	if (!profile || profile.status !== "active") {
		await supabase.auth.signOut();
		// Not counted as a failed attempt: the password was right, and locking
		// the account would punish someone for an administrative state.
		return { ok: false, message: GENERIC_FAILURE, triesLeft: null, lockedUntil: null };
	}

	await clearSignInFailures(normalised);

	const roleKey = profile.roles?.key ?? "student";
	const userAgent = (await headers()).get("user-agent");
	await startSession(data.user.id, roleKey, { ip, userAgent });

	await recordAudit({
		actorId: data.user.id,
		branchId: profile.branch_id,
		action: "auth.sign_in",
		entity: "user",
		entityId: data.user.id,
		meta: { role: roleKey },
	});

	const safeNext = nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : null;
	return { ok: true, redirectTo: safeNext ?? landingPathFor(roleKey) };
}

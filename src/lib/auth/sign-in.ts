import "server-only";

import { headers } from "next/headers";

import { safeRelativePath } from "@/lib/auth/access";
import { checkSignInAllowed, clearSignInFailures, recordFailedSignIn, recordUnknownAccount, type SignInVerdict } from "@/lib/auth/lockout";
import { startSession } from "@/lib/auth/sessions";
import { SIGN_IN_MESSAGES, canSignIn } from "@/lib/auth/sign-in-messages";
import { recordAudit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Signing in (M1-08).
 *
 * **Every failure says what is wrong** (M10-11, the user's choice on
 * 2026-10-11): no account with that email, the account is switched off, or the
 * password isn't right — with tries left. This replaced one message for all
 * three; why the trade was accepted is in `sign-in-messages.ts`. A lock says
 * how long it lasts, as before.
 */

/** What the login screen renders next. */
export type SignInResult =
	| { ok: true; redirectTo: string }
	| {
			ok: false;
			message: string;
			/** Which box the message is about, so it can sit under it. */
			field?: "email" | "password" | "code";
			triesLeft: number | null;
			lockedUntil: Date | null;
	  };

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
export async function clientIp(): Promise<string | null> {
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
			verdict.scope === "ip" ? SIGN_IN_MESSAGES.tooManyFromNetwork : SIGN_IN_MESSAGES.wrongPassword,
		triesLeft: null,
		lockedUntil: verdict.lockedUntil,
	};
}

/**
 * Whether `email` has an account that may sign in.
 *
 * One carve-out: the **bootstrap Owner before first-run setup** has an auth
 * account and no profile, and only exists while `public.users` is empty. Then
 * nobody has a profile, so "no account" is not said and the password decides.
 */
export async function accountFor(email: string): Promise<"active" | "switched_off" | "none"> {
	const db = createAdminClient();
	const { data } = await db.from("users").select("status").eq("email", email).maybeSingle();
	if (data) return canSignIn(data.status) ? "active" : "switched_off";
	const { count } = await db.from("users").select("id", { count: "exact", head: true });
	return count === 0 ? "active" : "none";
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

	// ── Is there an account, and is it on? Said plainly (M10-11) ────────────
	const account = await accountFor(normalised);
	if (account === "none") {
		if (!(await recordUnknownAccount(ip))) {
			return { ok: false, message: SIGN_IN_MESSAGES.tooManyFromNetwork, triesLeft: null, lockedUntil: null };
		}
		return { ok: false, message: SIGN_IN_MESSAGES.noAccount, field: "email", triesLeft: null, lockedUntil: null };
	}
	if (account === "switched_off") {
		return { ok: false, message: SIGN_IN_MESSAGES.switchedOff, field: "email", triesLeft: null, lockedUntil: null };
	}

	const supabase = await createClient();
	const { data, error } = await supabase.auth.signInWithPassword({ email: normalised, password });

	if (error || !data.user) {
		const after = await recordFailedSignIn(normalised, ip);
		if (!after.allowed) return refusal(after);
		return { ok: false, message: SIGN_IN_MESSAGES.wrongPassword, field: "password", triesLeft: after.triesLeft, lockedUntil: null };
	}

	// ── The account must still be usable ─────────────────────────────────────
	// Suspended and inactive users hold a valid password and nothing else.
	const { data: profile } = await createAdminClient()
		.from("users")
		.select("id, branch_id, status, roles ( key )")
		.eq("id", data.user.id)
		.maybeSingle();

	// ── The bootstrap Owner, before first-run setup ──────────────────────────
	// They have an auth account and no profile, because only `/setup` creates
	// one. Turning them away here deadlocks the product: `/setup` needs a
	// session, a session needs this function, and this function wanted a
	// profile that only `/setup` writes. Let them through to finish setting up.
	//
	// Not a hole: `first_run_pending()` is true for one pinned uuid and only
	// while `public.users` is empty, and they have already proved the password.
	if (!profile) {
		const { data: pending } = await supabase.rpc("first_run_pending");
		if (pending === true) {
			await clearSignInFailures(normalised);
			// No session row yet — `user_sessions.user_id` references
			// `public.users`, which they are about to create. `startSession`
			// runs once setup completes.
			return { ok: true, redirectTo: "/setup" };
		}
	}

	if (!profile || !canSignIn(profile.status)) {
		await supabase.auth.signOut();
		// Not counted as a failed attempt: the password was right, and locking
		// the account would punish someone for an administrative state.
		return { ok: false, message: SIGN_IN_MESSAGES.switchedOff, field: "email", triesLeft: null, lockedUntil: null };
	}

	return finishSignIn(supabase, { userId: data.user.id, email: normalised, ip, method: "password" }, profile, nextPath);
}

/**
 * The last steps of every way in — password or emailed code — once Supabase
 * Auth holds a session for an **active** user: lift any lockout, open the
 * revocable application session, audit, and say where to go.
 *
 * Shared so the two doors can never drift apart on what "signed in" means.
 */
export async function finishSignIn(
	supabase: Awaited<ReturnType<typeof createClient>>,
	who: { userId: string; email: string; ip: string | null; method: "password" | "code" },
	profile: { branch_id: string | null; roles: { key: string } | null },
	nextPath?: string | null,
): Promise<SignInResult> {
	await clearSignInFailures(who.email);

	const roleKey = profile.roles?.key ?? "student";
	const userAgent = (await headers()).get("user-agent");
	const sessionId = await startSession(who.userId, roleKey, { ip: who.ip, userAgent });
	if (!sessionId) {
		// A JWT without its revocable application session is only half a login.
		// Remove it instead of sending the user into an inconsistent state.
		await supabase.auth.signOut();
		return {
			ok: false,
			message: "We couldn't start your session. Please try again.",
			triesLeft: null,
			lockedUntil: null,
		};
	}

	await recordAudit({
		actorId: who.userId,
		branchId: profile.branch_id,
		action: "auth.sign_in",
		entity: "user",
		entityId: who.userId,
		meta: { role: roleKey, method: who.method },
	});

	const safeNext = safeRelativePath(nextPath);
	return { ok: true, redirectTo: safeNext ?? landingPathFor(roleKey) };
}

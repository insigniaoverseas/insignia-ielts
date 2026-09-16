import "server-only";

import { headers } from "next/headers";

import { hashInvitationToken, isPlausibleToken, mintInvitationToken } from "@/lib/auth/tokens";
import { firstPasswordProblem } from "@/lib/auth/password";
import { recordAudit } from "@/lib/audit";
import { appBaseUrl } from "@/lib/env";
import { getMailer } from "@/lib/mail/mailer";
import { passwordResetEmail } from "@/lib/mail/templates";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Self-serve password reset (M1-15).
 *
 * `MVP-1.md` §9 originally had none — a locked-out student is standing in a
 * building with their teacher in it, and a fresh invitation is faster than an
 * email round trip. That holds for students and **fails for the Owner**, who
 * has nobody above them to re-invite them. The user chose (2026-09-17) to open
 * it to every role rather than special-case one; §9 is corrected.
 *
 * The rule that shapes every function here: **never reveal whether an address
 * has an account.** Requesting a reset returns the same sentence whether the
 * email is a real student, a former student, or nonsense — because the login
 * screen already refuses to say, and a reset form that did would hand back the
 * list that screen protects (`MVP-1.md` §8).
 */

/**
 * How long a reset link lives.
 *
 * One hour, against an invitation's seven days, and the difference is the
 * point: an invitation is pushed at someone who was not expecting it and has to
 * survive a weekend, while a reset is asked for by someone sitting at the
 * screen right now. Every extra hour is exposure bought for nothing.
 */
export const RESET_TTL_MINUTES = 60;

/** How many resets one address may request per window, before we quietly stop sending. */
const MAX_REQUESTS_PER_WINDOW = 3;
const REQUEST_WINDOW_SECONDS = 15 * 60;

/** The sentence every reset request gets, whatever actually happened. */
export const RESET_REQUESTED_MESSAGE =
	"If there's an account with that email, a link is on its way. It works once, and for the next hour.";

/** The client's IP, for rate limiting and for the record. */
async function clientIp(): Promise<string | null> {
	const h = await headers();
	const cf = h.get("cf-connecting-ip");
	if (cf) return cf;
	const forwarded = h.get("x-forwarded-for");
	return forwarded ? (forwarded.split(",")[0]?.trim() ?? null) : null;
}

/**
 * Sends a reset link, if that address has an active account.
 *
 * Always resolves the same way. The work it does — or quietly declines to do —
 * is invisible to the caller by design.
 */
export async function requestPasswordReset(email: string): Promise<void> {
	const normalised = email.trim().toLowerCase();
	if (!normalised || !normalised.includes("@")) return;

	const db = createAdminClient();
	const ip = await clientIp();

	// ── Rate limit, by address and by IP ─────────────────────────────────────
	// Reusing the sign-in counters' storage, under different keys. Without this,
	// the form is a way to fill someone's inbox, and a way to farm timing.
	const { data: byEmail } = await db.rpc("bump_rate_limit", {
		p_key: `reset:email:${normalised}`,
		p_window_seconds: REQUEST_WINDOW_SECONDS,
		p_limit: MAX_REQUESTS_PER_WINDOW,
	});
	if ((byEmail as { locked: boolean }[] | null)?.[0]?.locked) return;

	if (ip) {
		const { data: byIp } = await db.rpc("bump_rate_limit", {
			p_key: `reset:ip:${ip}`,
			p_window_seconds: REQUEST_WINDOW_SECONDS,
			p_limit: 20,
		});
		if ((byIp as { locked: boolean }[] | null)?.[0]?.locked) return;
	}

	const { data: user } = await db
		.from("users")
		.select("id, name, email, status, branch_id, branches ( name )")
		.eq("email", normalised)
		.maybeSingle();

	// No account, or a suspended one. Both stop here, silently: a suspended
	// user resetting their password would be let back into an account an admin
	// deliberately closed.
	//
	// ⚠️ This also means the **bootstrap Owner before `/setup`** cannot reset:
	// they exist in `auth.users` but have no profile row yet, so the lookup
	// above finds nothing. Deliberate — widening this to `auth.users` would let
	// the reset flow serve accounts with no place in the app at all. The
	// recovery for that short window is the Supabase dashboard, and it closes
	// the moment setup is finished.
	if (!user || user.status !== "active") return;

	const { token, tokenHash } = await mintInvitationToken();
	const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60_000);

	const { error } = await db.from("password_resets").insert({
		user_id: user.id,
		token_hash: tokenHash,
		expires_at: expiresAt.toISOString(),
		requested_ip: ip,
	});

	if (error) {
		console.error("password reset insert failed:", error.message);
		return;
	}

	await recordAudit({
		actorId: user.id,
		branchId: user.branch_id,
		action: "auth.reset_requested",
		entity: "user",
		entityId: user.id,
		meta: { ip },
	});

	const body = passwordResetEmail({
		name: user.name,
		branchName: user.branches?.name ?? "Insignia IELTS",
		url: `${appBaseUrl()}/reset/${token}`,
		validFor: `${RESET_TTL_MINUTES} minutes`,
	});

	try {
		await getMailer().send({ to: user.email, ...body });
	} catch (mailError) {
		// Logged, never surfaced: the caller gets the same sentence regardless,
		// and telling them delivery failed would confirm the account exists.
		console.error(`password reset email to ${normalised} failed:`, mailError);
	}
}

/** What `/reset/[token]` renders. */
export type ResetLookup =
	| { state: "valid"; token: string; name: string; email: string }
	| { state: "expired" | "used" | "unknown"; message: string };

/** Reads the token behind the reset screen, keeping each dead end its own sentence. */
export async function lookupPasswordReset(token: string): Promise<ResetLookup> {
	const unknown: ResetLookup = {
		state: "unknown",
		message: "We don't recognise this link. Check you copied the whole thing from your email.",
	};
	if (!isPlausibleToken(token)) return unknown;

	const { data } = await createAdminClient().rpc("find_password_reset", {
		p_token_hash: await hashInvitationToken(token),
	});
	const row = (data as { user_id: string; email: string; name: string; expired: boolean; used: boolean }[] | null)?.[0];
	if (!row) return unknown;

	if (row.used) {
		return {
			state: "used",
			message: "This link has already been used. If that was you, sign in with your new password.",
		};
	}
	if (row.expired) {
		return {
			state: "expired",
			message: "This link has expired. Links last an hour — ask for a new one and it'll arrive in a moment.",
		};
	}

	return { state: "valid", token, name: row.name, email: row.email };
}

/** What completing a reset can return. */
export type ResetOutcome = { ok: true; email: string } | { ok: false; message: string };

/**
 * Sets the new password.
 *
 * Order matters. The password is checked against our own rules, then changed
 * through Supabase Auth, and only then is the token consumed — because
 * consuming first would burn the link whenever Auth rejects the password for
 * appearing in a breach corpus, forcing a fresh email over a recoverable
 * mistake. Replay is still refused: a token whose `used_at` is set never gets
 * past the lookup.
 *
 * Completing a reset **revokes every session that user holds** (in
 * `complete_password_reset`). If someone else was signed in as them, changing
 * the password has to put them out, or the reset has fixed nothing.
 */
export async function completePasswordReset(token: string, password: string): Promise<ResetOutcome> {
	const found = await lookupPasswordReset(token);
	if (found.state !== "valid") return { ok: false, message: found.message };

	const problem = firstPasswordProblem(password);
	if (problem) return { ok: false, message: problem };

	const db = createAdminClient();
	const tokenHash = await hashInvitationToken(token);

	const { data: row } = await db.rpc("find_password_reset", { p_token_hash: tokenHash });
	const userId = (row as { user_id: string }[] | null)?.[0]?.user_id;
	if (!userId) return { ok: false, message: "We don't recognise this link." };

	const { error: authError } = await db.auth.admin.updateUserById(userId, { password });
	if (authError) {
		const breached = /password/i.test(authError.message);
		console.error(`reset: updateUserById failed for ${userId}:`, authError.message);
		return {
			ok: false,
			message: breached
				? "That password has appeared in a data breach. Please choose a different one."
				: "Something went wrong changing your password. Please try again.",
		};
	}

	const { error: rpcError } = await db.rpc("complete_password_reset", { p_token_hash: tokenHash });
	if (rpcError) {
		// The password *has* changed, so this is not a failure the person should
		// be asked to retry — it would only confuse them. Loud in the log, since
		// it means sessions may not have been revoked.
		console.error(`reset: complete_password_reset failed after the password changed for ${userId}:`, rpcError.message);
	}

	await recordAudit({
		actorId: userId,
		branchId: null,
		action: "auth.password_reset",
		entity: "user",
		entityId: userId,
		meta: { sessions_revoked: !rpcError },
	});

	return { ok: true, email: found.email };
}

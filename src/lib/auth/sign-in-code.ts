import "server-only";

import {
	CODE_TTL_MINUTES,
	CODE_WINDOW_SECONDS,
	MAX_CODE_ATTEMPTS,
	MAX_CODE_GUESSES_PER_IP,
	MAX_CODE_REQUESTS,
	MAX_CODE_REQUESTS_PER_IP,
	displaySignInCode,
	hashSignInCode,
	mintSignInCode,
	normaliseSignInCode,
} from "@/lib/auth/sign-in-code-rules";
import { clientIp, finishSignIn, type SignInResult } from "@/lib/auth/sign-in";
import { recordAudit } from "@/lib/audit";
import { getMailer } from "@/lib/mail/mailer";
import { signInCodeEmail } from "@/lib/mail/templates";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Signing in with an emailed six-digit code instead of a password (M10-10).
 *
 * Made for the lab PC: a student who has forgotten their password, or locked
 * it, reads the code on their own phone and types it on the PC — they never
 * sign into their email on a shared machine. Staff can send one from a
 * student's page; it is the same code the student could ask for themselves.
 *
 * The same rule as the reset form: **never reveal whether an address has an
 * account.** Asking for a code gets one sentence whatever happened, and a
 * wrong code gets one sentence whether or not a code was ever sent.
 *
 * A code gets past the password lockout — that is what it is for — and a
 * successful one lifts it. It cannot be guessed instead: five guesses per
 * code, three codes per address per fifteen minutes, and a per-IP cap.
 */

/** The sentence every code request gets, whatever actually happened. */
export const CODE_REQUESTED_MESSAGE = `If there's an account with that email, a code is on its way. It works once, for ${CODE_TTL_MINUTES} minutes.`;

/** The sentence every refused code gets. */
const CODE_REFUSED = "That code isn't right, or it has run out. Check the newest email, or ask for a new code.";

/** What happened to a request — for staff, who may be told. Students are only ever shown {@link CODE_REQUESTED_MESSAGE}. */
export type CodeRequestOutcome = "sent" | "too_many" | "no_account" | "failed";

async function bump(key: string, limit: number): Promise<boolean> {
	const { data } = await createAdminClient().rpc("bump_rate_limit", {
		p_key: key,
		p_window_seconds: CODE_WINDOW_SECONDS,
		p_limit: limit,
	});
	// `locked` is true once this bump *reaches* the limit; the request that
	// reaches it is still allowed, so over means strictly beyond.
	const row = (data as { attempts: number }[] | null)?.[0];
	return row ? row.attempts > limit : false;
}

/**
 * Emails a sign-in code, if that address has an active account.
 *
 * @param sentBy The staff member sending it, or `null` when the person asked
 *   for it themselves. Recorded with the code and in the audit log.
 */
export async function requestSignInCode(email: string, sentBy: string | null = null): Promise<CodeRequestOutcome> {
	const normalised = email.trim().toLowerCase();
	if (!normalised.includes("@")) return "no_account";

	const ip = sentBy ? null : await clientIp();
	if (await bump(`code:email:${normalised}`, MAX_CODE_REQUESTS)) return "too_many";
	if (ip && (await bump(`code:ip:${ip}`, MAX_CODE_REQUESTS_PER_IP))) return "too_many";

	const db = createAdminClient();
	const { data: user } = await db
		.from("users")
		.select("id, name, email, status, branch_id, branches ( name )")
		.eq("email", normalised)
		.maybeSingle();

	// No account, or a suspended one: nothing is sent. A code must never be a
	// way back into an account an admin closed.
	if (!user || user.status !== "active") return "no_account";

	const code = mintSignInCode();
	const { error } = await db.rpc("issue_sign_in_code", {
		p_user: user.id,
		p_code_hash: await hashSignInCode(user.id, code),
		p_ttl_seconds: CODE_TTL_MINUTES * 60,
		p_sent_by: sentBy,
		p_requested_ip: ip,
	});
	if (error) {
		console.error("issue_sign_in_code failed:", error.message);
		return "failed";
	}

	await recordAudit({
		actorId: sentBy ?? user.id,
		branchId: user.branch_id,
		action: "auth.code_sent",
		entity: "user",
		entityId: user.id,
		meta: { by_staff: Boolean(sentBy), ip },
	});

	const body = signInCodeEmail({
		name: user.name,
		branchName: user.branches?.name ?? "Insignia IELTS",
		code: displaySignInCode(code),
		validFor: `${CODE_TTL_MINUTES} minutes`,
	});
	try {
		await getMailer().send({ to: user.email, ...body });
	} catch (mailError) {
		console.error(`sign-in code email to ${normalised} failed:`, mailError);
		return "failed";
	}
	return "sent";
}

/**
 * Checks a code and, if it is right, signs in on **this** browser.
 *
 * The session is minted the supported way for server-side passwordless
 * sign-in: an admin-generated magic-link token, verified at once through the
 * cookie-bound client. The token never leaves the server and is never emailed;
 * the only secret the person ever sees is the six digits.
 */
export async function signInWithCode(email: string, input: string, nextPath?: string | null): Promise<SignInResult> {
	const refused: SignInResult = { ok: false, message: CODE_REFUSED, triesLeft: null, lockedUntil: null };
	const normalised = email.trim().toLowerCase();
	const code = normaliseSignInCode(input);
	if (!code) return { ...refused, message: "The code is 6 numbers. Please check it and try again." };

	const ip = await clientIp();
	if (ip && (await bump(`code-guess:ip:${ip}`, MAX_CODE_GUESSES_PER_IP))) {
		return { ...refused, message: "Too many tries from this network. Please wait a few minutes." };
	}

	const admin = createAdminClient();
	const { data: user } = await admin
		.from("users")
		.select("id, email, status, branch_id, roles ( key )")
		.eq("email", normalised)
		.maybeSingle();
	if (!user || user.status !== "active") return refused;

	const { data: verdict, error } = await admin.rpc("redeem_sign_in_code", {
		p_user: user.id,
		p_code_hash: await hashSignInCode(user.id, code),
		p_max_attempts: MAX_CODE_ATTEMPTS,
	});
	if (error) {
		console.error("redeem_sign_in_code failed:", error.message);
		return { ...refused, message: "Something went wrong. Please try again." };
	}
	if (verdict !== "ok") return refused;

	const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email: user.email });
	const tokenHash = link?.properties?.hashed_token;
	if (linkError || !tokenHash) {
		console.error("sign-in code: generateLink failed:", linkError?.message);
		return { ...refused, message: "We couldn't sign you in. Please ask for a new code." };
	}

	const supabase = await createClient();
	const { data: verified, error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
	if (verifyError || verified.user?.id !== user.id) {
		console.error("sign-in code: verifyOtp failed:", verifyError?.message);
		await supabase.auth.signOut();
		return { ...refused, message: "We couldn't sign you in. Please ask for a new code." };
	}

	return finishSignIn(supabase, { userId: user.id, email: normalised, ip, method: "code" }, user, nextPath);
}

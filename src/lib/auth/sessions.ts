import "server-only";

import { cookies, headers } from "next/headers";
import { cache } from "react";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import { recordAudit } from "@/lib/audit";
import { SESSION_COOKIE, secureSessionCookie } from "@/lib/auth/session-cookie";
import { createAdminClient } from "@/lib/supabase/admin";

export { SESSION_COOKIE } from "@/lib/auth/session-cookie";

/**
 * Session records and revocation (M1-12, M1-14).
 *
 * Supabase's JWT says *who* you are. It cannot say whether that session has
 * since been revoked — a JWT is valid until it expires, by design, and we
 * deliberately set a long lifetime so no refresh lands mid-test (BUILD-STEPS
 * step 40). So revocation needs its own record, and that is `user_sessions`.
 *
 * The link between the two is this cookie: it holds a `user_sessions.id`, and
 * every guarded request checks that row is still live. Revoking a device, or
 * signing in elsewhere as a student, sets `revoked_at` and the next request
 * from the old browser is turned away even though its JWT is still valid.
 *
 * **Students get one session; staff get several.** The user chose this
 * (2026-09-17). A second sign-in by a student ends the first — that is the
 * account-sharing control. Teachers and admins do real work on a phone and a
 * laptop at once, and logging them out of one to use the other would be a
 * daily irritation that buys nothing: they are not the sharing risk.
 */

/**
 * How long the session cookie survives. Longer than the JWT on purpose: it is
 * the thing that keeps a student signed in on a shared lab machine between
 * lessons, which is what the dropped PIN used to buy (PROJECT-MEMORY §4).
 */
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/** Roles that may only be signed in one place at a time. */
const SINGLE_SESSION_ROLES = new Set(["student"]);

/** Where a sign-in came from, for the device list on Profile. */
export type SessionOrigin = {
	ip: string | null;
	userAgent: string | null;
};

/**
 * Opens a session: revokes the previous one for a student, records the new one
 * and sets the cookie.
 *
 * @returns The new `user_sessions.id`.
 */
export async function startSession(userId: string, roleKey: string, origin: SessionOrigin): Promise<string | null> {
	const db = createAdminClient();

	if (SINGLE_SESSION_ROLES.has(roleKey)) {
		// A new sign-in ends every earlier one. Done before the insert so a
		// crash between the two leaves the student signed out, not doubly in.
		const { error } = await db
			.from("user_sessions")
			.update({ revoked_at: new Date().toISOString() })
			.eq("user_id", userId)
			.is("revoked_at", null);
		if (error) {
			console.error("earlier session revocation failed:", error.message);
			return null;
		}
	}

	const { data, error } = await db
		.from("user_sessions")
		.insert({ user_id: userId, ip: origin.ip, user_agent: origin.userAgent })
		.select("id")
		.single();

	if (error || !data) {
		console.error("session insert failed:", error?.message);
		return null;
	}

	try {
		const store = await cookies();
		const requestHeaders = await headers();
		store.set(SESSION_COOKIE, data.id, {
			httpOnly: true,
			secure: secureSessionCookie({
				forwardedProto: requestHeaders.get("x-forwarded-proto"),
				host: requestHeaders.get("host"),
				nodeEnv: process.env.NODE_ENV,
			}),
			sameSite: "lax",
			path: "/",
			maxAge: SESSION_COOKIE_MAX_AGE,
		});
	} catch (error) {
		console.error("session cookie write failed:", error instanceof Error ? error.message : "unknown error");
		await db.from("user_sessions").update({ revoked_at: new Date().toISOString() }).eq("id", data.id);
		return null;
	}

	return data.id;
}

/**
 * Whether the browser's session record is still live.
 *
 * `missing` means the Supabase JWT has no application-session cookie. It is
 * not a valid signed-in state: otherwise deleting this cookie would bypass
 * device revocation and the student's single-session rule.
 */
export const sessionState = cache(async function sessionState(
	userId: string,
): Promise<"live" | "revoked" | "missing"> {
	const sessionId = (await cookies()).get(SESSION_COOKIE)?.value;
	if (!sessionId) return "missing";

	const { data } = await createAdminClient()
		.from("user_sessions")
		.select("id, revoked_at")
		.eq("id", sessionId)
		.eq("user_id", userId)
		.maybeSingle();

	// A cookie naming a session that is not this user's is treated as revoked.
	if (!data || data.revoked_at !== null) return "revoked";
	return "live";
});

/** Notes that the session was used, for "last seen" in the device list. */
export const touchSession = cache(async function touchSession(): Promise<void> {
	const sessionId = (await cookies()).get(SESSION_COOKIE)?.value;
	if (!sessionId) return;
	const staleBefore = new Date(Date.now() - 5 * 60 * 1000).toISOString();

	const write = createAdminClient()
		.from("user_sessions")
		.update({ last_seen_at: new Date().toISOString() })
		.eq("id", sessionId)
		.is("revoked_at", null)
		.lt("last_seen_at", staleBefore);

	// Off the critical path. "Last seen" feeds the device list, and nothing on
	// the page being rendered depends on it — awaiting a ~230 ms round trip
	// before the first byte, on every navigation, is a poor trade for that.
	// `waitUntil` keeps the Worker alive until it lands; where there is none
	// (a plain `next dev`), fall back to awaiting.
	const waitUntil = cloudflareWaitUntil();
	if (waitUntil) waitUntil(Promise.resolve(write));
	else await write;
});

/** The Worker's `waitUntil`, or `null` outside a Cloudflare request. */
function cloudflareWaitUntil(): ((promise: Promise<unknown>) => void) | null {
	try {
		const ctx = getCloudflareContext().ctx;
		return typeof ctx?.waitUntil === "function" ? ctx.waitUntil.bind(ctx) : null;
	} catch {
		return null;
	}
}

/** Closes the browser's own session and clears the cookie. */
export async function endSession(): Promise<void> {
	const store = await cookies();
	const sessionId = store.get(SESSION_COOKIE)?.value;

	if (sessionId) {
		await createAdminClient()
			.from("user_sessions")
			.update({ revoked_at: new Date().toISOString() })
			.eq("id", sessionId)
			.is("revoked_at", null);
	}

	store.delete(SESSION_COOKIE);
}

/**
 * Revokes one session on someone's behalf — the Revoke button on Profile
 * (M1-14) and an admin ending a session from the student detail screen.
 *
 * @param actorId Who is revoking, for the audit trail.
 * @param ownerId The session's owner. Checked, so one user cannot revoke another's.
 */
export async function revokeSession(actorId: string, ownerId: string, sessionId: string): Promise<boolean> {
	const db = createAdminClient();
	const { data, error } = await db
		.from("user_sessions")
		.update({ revoked_at: new Date().toISOString() })
		.eq("id", sessionId)
		.eq("user_id", ownerId)
		.is("revoked_at", null)
		.select("id")
		.maybeSingle();

	if (error || !data) return false;

	await recordAudit({
		actorId,
		branchId: null,
		action: "session.revoke",
		entity: "user_session",
		entityId: sessionId,
		meta: { owner_id: ownerId, self: actorId === ownerId },
	});
	return true;
}

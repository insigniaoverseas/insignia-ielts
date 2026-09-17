import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { routeDecision, routeNeedsIdentity, type SessionStanding } from "@/lib/auth/access";
import { SESSION_COOKIE } from "@/lib/auth/session-cookie";
import { generateNonce, securityHeaders } from "@/lib/security/headers";
import type { Database } from "@/lib/supabase/database.types";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * Runs before every page and API route (Next 16 "proxy", formerly middleware).
 *
 * Gives each request a fresh nonce and the matching Content-Security-Policy.
 * The CSP goes on the **request** too: Next.js reads the nonce from it and
 * stamps it on its own scripts. That only works for pages rendered per
 * request, which is why the root layout awaits `connection()`.
 *
 * ⚠️ On OpenNext + Workers, proxy support is labelled "experimental" (tested
 * 2026-09-15 — PROJECT-MEMORY §5). Keep this file small.
 */
export async function proxy(request: NextRequest) {
	const nonce = generateNonce();
	const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
	const headers = securityHeaders(nonce, {
		isDev: process.env.NODE_ENV === "development",
		r2Origin: accountId && /^[0-9a-f]{32}$/i.test(accountId) ? `https://${accountId}.r2.cloudflarestorage.com` : undefined,
	});

	const requestHeaders = new Headers(request.headers);
	requestHeaders.set("x-nonce", nonce);
	requestHeaders.set("Content-Security-Policy", headers["Content-Security-Policy"]);

	const makeNextResponse = () => NextResponse.next({ request: { headers: requestHeaders } });
	let response = makeNextResponse();

	const pathname = request.nextUrl.pathname;
	if (routeNeedsIdentity(pathname)) {
		const supabase = createServerClient<Database>(supabaseUrl(), supabasePublishableKey(), {
			cookies: {
				getAll: () => request.cookies.getAll(),
				setAll(cookiesToSet) {
					for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
					response = makeNextResponse();
					for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
				},
			},
		});

		const { data: auth } = await supabase.auth.getClaims();
		const userId = auth?.claims?.sub ?? null;
		let role: string | null = null;
		let session: SessionStanding = "unverified";

		if (userId) {
			const sessionId = request.cookies.get(SESSION_COOKIE)?.value;

			// One round trip for both facts. Every one of these costs ~230 ms to
			// ap-south-1 and sits in front of the first byte, so the role lookup
			// and the session check are a single query with `user_sessions`
			// embedded and filtered to the cookie's row.
			//
			// User-scoped on purpose: Proxy is an early gate, while layouts and
			// actions independently enforce authorization with `lib/rbac.ts`. RLS
			// ("Users read their own sessions") also means a cookie naming
			// somebody else's session simply comes back empty.
			const { data: profile, error } = await supabase
				.from("users")
				.select("status, roles ( key ), user_sessions ( id, revoked_at )")
				.eq("id", userId)
				// A placeholder when there is no cookie keeps one typed query; the
				// standing below treats a missing cookie as ended regardless.
				.eq("user_sessions.id", sessionId ?? NO_SESSION)
				.maybeSingle();

			role = profile?.status === "active" ? profile.roles?.key ?? null : null;
			session = sessionStandingOf(sessionId, profile?.user_sessions ?? [], error);
		}

		const decision = routeDecision({ pathname, userId, role, session });

		if (decision.kind === "endSession") {
			await supabase.auth.signOut();
			const redirectResponse = copyCookies(response, NextResponse.redirect(new URL(decision.to, request.url)));
			redirectResponse.cookies.delete(SESSION_COOKIE);
			response = redirectResponse;
		} else if (decision.kind === "redirect") {
			response = copyCookies(response, NextResponse.redirect(new URL(decision.to, request.url)));
		}
	}

	for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
	return response;
}

/** A UUID that can never be a session id, for the no-cookie case. */
const NO_SESSION = "00000000-0000-0000-0000-000000000000";

/**
 * Standing of the application session named by the cookie.
 *
 * A read error returns `unverified` so a database blip cannot sign everyone
 * out; a confirmed missing or revoked row returns `ended`.
 */
function sessionStandingOf(
	sessionId: string | undefined,
	rows: { id: string; revoked_at: string | null }[],
	error: { message: string } | null,
): SessionStanding {
	if (!sessionId) return "ended";
	if (error) return "unverified";

	const row = rows.find((candidate) => candidate.id === sessionId);
	return !row || row.revoked_at !== null ? "ended" : "live";
}

/** Carries refreshed Supabase cookies onto a redirect response. */
function copyCookies(from: NextResponse, to: NextResponse): NextResponse {
	for (const cookie of from.cookies.getAll()) to.cookies.set(cookie);
	return to;
}

export const config = {
	matcher: [
		{
			// Everything except build output and the favicon, which Cloudflare serves as static files
			// (they get their headers from public/_headers). Prefetches skip the proxy, per Next's guide.
			source: "/((?!_next/static|_next/image|favicon).*)",
			missing: [
				{ type: "header", key: "next-router-prefetch" },
				{ type: "header", key: "purpose", value: "prefetch" },
			],
		},
	],
};

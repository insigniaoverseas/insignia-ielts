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
			// User-scoped on purpose: Proxy is an early gate, while layouts and
			// actions independently enforce authorization with `lib/rbac.ts`.
			const { data: profile } = await supabase
				.from("users")
				.select("status, roles ( key )")
				.eq("id", userId)
				.maybeSingle();
			role = profile?.status === "active" ? profile.roles?.key ?? null : null;

			session = await sessionStanding(supabase, userId, request.cookies.get(SESSION_COOKIE)?.value);
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

/**
 * Standing of the application session named by the cookie.
 *
 * A read error returns `unverified` so a database blip cannot sign everyone
 * out; a confirmed missing or revoked row returns `ended`.
 */
async function sessionStanding(
	supabase: ReturnType<typeof createServerClient<Database>>,
	userId: string,
	sessionId: string | undefined,
): Promise<SessionStanding> {
	if (!sessionId) return "ended";

	const { data, error } = await supabase
		.from("user_sessions")
		.select("id, revoked_at")
		.eq("id", sessionId)
		.eq("user_id", userId)
		.maybeSingle();

	if (error) return "unverified";
	return !data || data.revoked_at !== null ? "ended" : "live";
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

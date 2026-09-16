import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { homeForRole, roleCanAccess, routeArea, signInPath } from "@/lib/auth/access";
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

	const area = routeArea(request.nextUrl.pathname);
	if (area) {
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
		const userId = auth?.claims?.sub;

		if (!userId) {
			response = copyCookies(response, NextResponse.redirect(new URL(signInPath(request.nextUrl.pathname), request.url)));
		} else {
			// User-scoped on purpose: Proxy is an early gate, while layouts and
			// actions independently enforce authorization with `lib/rbac.ts`.
			const { data: profile } = await supabase
				.from("users")
				.select("status, roles ( key )")
				.eq("id", userId)
				.maybeSingle();
			const role = profile?.status === "active" ? profile.roles?.key : null;

			if (!role) {
				response = copyCookies(response, NextResponse.redirect(new URL("/login", request.url)));
			} else if (!roleCanAccess(role, area)) {
				response = copyCookies(response, NextResponse.redirect(new URL(homeForRole(role), request.url)));
			}
		}
	}

	for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
	return response;
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

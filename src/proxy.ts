import { type NextRequest, NextResponse } from "next/server";

import { generateNonce, securityHeaders } from "@/lib/security/headers";

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
export function proxy(request: NextRequest) {
	const nonce = generateNonce();
	const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
	const headers = securityHeaders(nonce, {
		isDev: process.env.NODE_ENV === "development",
		r2Origin: accountId && /^[0-9a-f]{32}$/i.test(accountId) ? `https://${accountId}.r2.cloudflarestorage.com` : undefined,
	});

	const requestHeaders = new Headers(request.headers);
	requestHeaders.set("x-nonce", nonce);
	requestHeaders.set("Content-Security-Policy", headers["Content-Security-Policy"]);

	const response = NextResponse.next({ request: { headers: requestHeaders } });
	for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
	return response;
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

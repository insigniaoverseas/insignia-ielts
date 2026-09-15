/**
 * Security headers for every HTML/API response (MVP-1 §8 "Transport",
 * BUILD-STEPS step 9). Pure functions — `src/proxy.ts` calls them per request;
 * unit-tested in `tests/unit/security-headers.test.mjs`.
 *
 * Scripts: nonce + `'strict-dynamic'`, **no `'unsafe-inline'`** — an injected
 * `<script>` (the XSS threat from teacher-authored passages) cannot run.
 * Styles: `'unsafe-inline'` is allowed on purpose — a nonce can't cover
 * `style=""` attributes (progress bars) or the toast library's injected
 * `<style>`, and injected CSS can't execute code. Decided 2026-09-15,
 * PROJECT-MEMORY §4.
 */

/**
 * A fresh, unpredictable nonce for one request: 16 random bytes, base64.
 * Uses Web Crypto, available on Workers and in Node.
 */
export function generateNonce(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	return btoa(String.fromCharCode(...bytes));
}

/**
 * The Content-Security-Policy for one response.
 *
 * @param nonce From {@link generateNonce}; Next.js reads it back from the
 *   request's CSP header and stamps it on its own scripts.
 * @param options.isDev Development needs `'unsafe-eval'` (React's dev
 *   tooling) and must not force HTTPS on localhost.
 */
export function contentSecurityPolicy(nonce: string, { isDev = false }: { isDev?: boolean } = {}): string {
	const directives = [
		"default-src 'self'",
		`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' blob: data:",
		"font-src 'self'",
		// The browser never talks to Supabase (lib/supabase/README.md).
		"connect-src 'self'",
		// Test audio will come from R2 signed URLs; add that origin with M2-06.
		"media-src 'self' blob:",
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"frame-ancestors 'none'",
		...(isDev ? [] : ["upgrade-insecure-requests"]),
	];
	return directives.join("; ");
}

/** Headers that don't depend on the request. Also set on static files via `public/_headers`. */
export const STATIC_SECURITY_HEADERS: Readonly<Record<string, string>> = {
	"Strict-Transport-Security": "max-age=63072000; includeSubDomains",
	"X-Content-Type-Options": "nosniff",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
	// Legacy twin of frame-ancestors 'none' for old browsers.
	"X-Frame-Options": "DENY",
	"Cross-Origin-Opener-Policy": "same-origin",
};

/** Every security header for one response: the per-request CSP plus {@link STATIC_SECURITY_HEADERS}. */
export function securityHeaders(nonce: string, options: { isDev?: boolean } = {}): Record<string, string> {
	return { "Content-Security-Policy": contentSecurityPolicy(nonce, options), ...STATIC_SECURITY_HEADERS };
}

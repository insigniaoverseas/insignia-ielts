/** Name of the cookie that links a browser to its `user_sessions` row. */
export const SESSION_COOKIE = "insignia_session";

/**
 * Whether the application session cookie should carry the `Secure` flag.
 *
 * Cloudflare supplies `x-forwarded-proto=https` in production. Local HTTP
 * development must not receive a Secure cookie: browsers discard it before
 * the next request, which leaves the Supabase JWT detached from the
 * revocable application session.
 */
export function secureSessionCookie(options: {
	forwardedProto: string | null;
	host: string | null;
	nodeEnv: string | undefined;
}): boolean {
	const protocol = options.forwardedProto?.split(",")[0]?.trim().toLowerCase();
	if (protocol) return protocol === "https";

	const rawHost = options.host?.toLowerCase() ?? "";
	const hostname = rawHost.startsWith("[") ? rawHost.slice(1, rawHost.indexOf("]")) : rawHost.split(":")[0];
	if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") return false;

	return options.nodeEnv === "production";
}

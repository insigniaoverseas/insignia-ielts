import "server-only";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
type SiteverifyResponse = { success?: boolean; action?: string };

/** Public key passed by server pages to the widget. */
export function turnstileSiteKey(): string {
	const key = process.env.TURNSTILE_SITE_KEY;
	if (!key) throw new Error("TURNSTILE_SITE_KEY is not set.");
	return key;
}

/** Redeems Cloudflare's short-lived, single-use response token. */
export async function verifyTurnstile(token: string, action: string, remoteIp: string | null): Promise<boolean> {
	const secret = process.env.TURNSTILE_SECRET_KEY;
	if (!secret || !token || token.length > 2048) return false;
	try {
		const body = new URLSearchParams({ secret, response: token });
		if (remoteIp) body.set("remoteip", remoteIp);
		const response = await fetch(SITEVERIFY_URL, {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body,
			signal: AbortSignal.timeout(10_000),
		});
		if (!response.ok) return false;
		const result = (await response.json()) as SiteverifyResponse;
		return result.success === true && result.action === action;
	} catch {
		return false;
	}
}

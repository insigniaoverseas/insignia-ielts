import "server-only";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
type SiteverifyResponse = { success?: boolean; action?: string; metadata?: { result_with_testing_key?: boolean } };

/**
 * Whether a Siteverify reply lets the request through.
 *
 * It must succeed **and** name the action the form was rendered for, so a
 * token minted on one form cannot be spent on another. The one exception is a
 * reply Cloudflare marks `result_with_testing_key`: its published test keys
 * (used for `localhost`, where the real site key is refused) never report an
 * action. A real secret never gets that flag, so production is unaffected.
 */
export function isAcceptedSiteverify(result: SiteverifyResponse, action: string): boolean {
	if (result.success !== true) return false;
	if (result.metadata?.result_with_testing_key === true && result.action === undefined) return true;
	return result.action === action;
}

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
		return isAcceptedSiteverify((await response.json()) as SiteverifyResponse, action);
	} catch {
		return false;
	}
}

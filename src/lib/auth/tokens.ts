import "server-only";

/**
 * Invitation tokens (M1-02).
 *
 * The raw token exists in exactly two places: the email we send, and the URL
 * the recipient clicks. **The database only ever holds its SHA-256 hash**
 * (`invitations.token_hash`), so a leaked database backup cannot be replayed
 * into accounts — which is the whole point of storing a hash rather than the
 * token (`MVP-1.md` §8, BUILD-STEPS step 32).
 *
 * A consequence worth stating plainly: we cannot show an admin an existing
 * invite link, because we genuinely do not have it. "Resend" therefore mints a
 * *new* token and invalidates the old one — see `resendInvitation`.
 *
 * Web Crypto only. This runs on Workers, where `node:crypto` is not the right
 * dependency to reach for.
 */

/** Bytes of entropy in a token. 32 bytes = 256 bits, ~43 URL-safe characters. */
const TOKEN_BYTES = 32;

/**
 * The shortest string we will even look up. Real tokens are ~43 characters;
 * anything shorter is a truncated paste or a probe, and gets the "we don't
 * recognise this link" dead end without touching the database.
 */
export const MIN_TOKEN_LENGTH = 24;

/** URL-safe base64 (RFC 4648 §5) with padding stripped — safe in a path segment. */
function base64url(bytes: Uint8Array): string {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

/**
 * A fresh, single-use invitation token. Return it to the caller *once* — it is
 * unrecoverable afterwards.
 *
 * @returns The raw token to put in the emailed link, and the hash to store.
 */
export async function mintInvitationToken(): Promise<{ token: string; tokenHash: string }> {
	const bytes = new Uint8Array(TOKEN_BYTES);
	crypto.getRandomValues(bytes);
	const token = base64url(bytes);
	return { token, tokenHash: await hashInvitationToken(token) };
}

/**
 * The stored form of `token`. Lowercase hex SHA-256.
 *
 * No salt and no stretching, deliberately: this is a 256-bit random value, not
 * a password, so there is no dictionary to attack and a slow hash would only
 * cost us latency on every click. Salting would also break the lookup, which
 * finds the row *by* this hash.
 */
export async function hashInvitationToken(token: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
	return Array.from(new Uint8Array(digest))
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

/**
 * Whether `token` is even shaped like one of ours. A cheap gate so that a
 * malformed or truncated link is answered without a database round trip.
 */
export function isPlausibleToken(token: string): boolean {
	return token.length >= MIN_TOKEN_LENGTH && /^[A-Za-z0-9_-]+$/.test(token);
}

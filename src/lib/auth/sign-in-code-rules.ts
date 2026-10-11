/**
 * The rules behind emailed sign-in codes (M10-10) — pure, so they can be
 * unit-tested and imported anywhere. The flow itself is `sign-in-code.ts`.
 */

/** How long a code works. Long enough to open an inbox on a phone, short enough to be worthless later. */
export const CODE_TTL_MINUTES = 10;

/** Wrong guesses before a code stops working. Six digits, five guesses: 1 in 200,000. */
export const MAX_CODE_ATTEMPTS = 5;

/** Codes one address may be sent per window — the cap that keeps guessing slow. */
export const MAX_CODE_REQUESTS = 3;

/** Code requests from one IP per window, across addresses. A whole lab can still ask. */
export const MAX_CODE_REQUESTS_PER_IP = 60;

/** Wrong codes from one IP per window, across addresses. */
export const MAX_CODE_GUESSES_PER_IP = 60;

/** The window for every counter above, in seconds. */
export const CODE_WINDOW_SECONDS = 15 * 60;

/** Number of digits. */
export const CODE_LENGTH = 6;

/**
 * A fresh six-digit code, from the platform CSPRNG.
 *
 * Rejection sampling, not `% 1_000_000` on a raw 32-bit number, so every code
 * is equally likely.
 */
export function mintSignInCode(): string {
	const limit = 4_294_000_000; // largest multiple of 10^6 below 2^32
	const buffer = new Uint32Array(1);
	for (;;) {
		crypto.getRandomValues(buffer);
		if (buffer[0] < limit) return String(buffer[0] % 1_000_000).padStart(CODE_LENGTH, "0");
	}
}

/**
 * What the person typed, as six digits, or `null` if it can't be a code.
 * Spaces and dashes are forgiven — "482 913" is how a phone shows it.
 */
export function normaliseSignInCode(input: string): string | null {
	const digits = input.replace(/[\s-]/g, "");
	return /^\d{6}$/.test(digits) ? digits : null;
}

/**
 * The hash stored for a code. Bound to the user, so one person's code hash is
 * not a lookup table for anyone else's.
 */
export async function hashSignInCode(userId: string, code: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${userId}:${code}`));
	return Array.from(new Uint8Array(digest))
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

/** "482 913" — easier to read off one screen and type into another. */
export function displaySignInCode(code: string): string {
	return `${code.slice(0, 3)} ${code.slice(3)}`;
}

/**
 * Password rules (M1-06).
 *
 * Pure and dependency-free **on purpose**: the set-password form imports this
 * to tick the rules as you type, and the Server Action imports the same
 * functions to enforce them. One definition, so the screen can never promise
 * something the server then rejects.
 *
 * This is not the whole check. Supabase's leaked-password protection (M1-01,
 * already on) tests the password against known breach corpora when the account
 * is created, and that catches what a length rule never will — `password1` is
 * eight characters with a letter and a number.
 */

/** The shortest password accepted. */
export const MIN_PASSWORD_LENGTH = 8;

/** One rule, phrased as the student reads it on screen. */
export type PasswordRule = {
	label: string;
	test: (password: string) => boolean;
};

/**
 * The rules, in the order they are shown.
 *
 * Deliberately three, and deliberately not "an uppercase letter and a symbol":
 * complexity rules that fight the person typing produce `Password1!` on every
 * account. Length plus a breach check is the better trade.
 */
export const PASSWORD_RULES: readonly PasswordRule[] = [
	{ label: `At least ${MIN_PASSWORD_LENGTH} characters`, test: (p) => p.length >= MIN_PASSWORD_LENGTH },
	{ label: "A letter", test: (p) => /[a-zA-Z]/.test(p) },
	{ label: "A number or symbol", test: (p) => /[^a-zA-Z]/.test(p) },
];

/** Whether `password` satisfies every rule. */
export function isAcceptablePassword(password: string): boolean {
	return PASSWORD_RULES.every((rule) => rule.test(password));
}

/**
 * The first unmet rule as a sentence, or `null` if the password is fine.
 * Used server-side, where only one message is shown.
 */
export function firstPasswordProblem(password: string): string | null {
	const failed = PASSWORD_RULES.find((rule) => !rule.test(password));
	return failed ? `Your password needs: ${failed.label.toLowerCase()}.` : null;
}

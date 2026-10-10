/**
 * The privacy notice a person agrees to when they accept their invitation
 * (DPDP Act 2023, s.5–6). One definition, rendered on `/privacy` and
 * summarised on the accept screen, so the two can never say different things.
 *
 * **Pure.** The contact address comes in as an argument; the server reads it
 * from `PRIVACY_CONTACT_EMAIL` (see {@link privacyContactEmail}).
 *
 * Every fact here must stay true of the code. If you add a field to `users`,
 * a new processor, or change where data lives, change this text **and bump
 * {@link PRIVACY_NOTICE_VERSION}** — each acceptance is recorded against the
 * version that was shown.
 */

/** Recorded with every acceptance. Bump it whenever the text below changes. */
export const PRIVACY_NOTICE_VERSION = "2026-10-10";

/** How long data is kept after a student's plan ends (the user's choice, 2026-10-10). */
export const RETENTION_MONTHS = 12;

/** One heading and its plain-language points. */
export type NoticeSection = { heading: string; points: string[] };

/**
 * The full notice, in the order it is read.
 *
 * @param contactEmail Where to write about your data, or `null` if not set —
 *   then the front desk is named instead, which is always true.
 */
export function privacyNotice(contactEmail: string | null): NoticeSection[] {
	const contact = contactEmail ? `write to ${contactEmail}` : "ask at the front desk of your centre";
	return [
		{
			heading: "What we keep",
			points: [
				"Your name, email address and phone number, and your batch and teacher.",
				"Your answers, scores and bands for every test you take.",
				"Which browser you sign in from and when, and your IP address, to keep your account safe.",
			],
		},
		{
			heading: "Why we keep it",
			points: [
				"To run your tests, mark them and show you your results.",
				"So your teachers can see how you are doing and help you improve.",
				"To stop anyone else from using your account.",
			],
		},
		{
			heading: "Who can see it",
			points: [
				"You, your teachers, and the institute's staff. Other students cannot see anything about you.",
				"It is stored with Supabase, in Mumbai, and Cloudflare, who run this website for us. Your invitation email is sent through Resend.",
				"We never sell it or use it for advertising.",
			],
		},
		{
			heading: "How long we keep it",
			points: [
				`Until ${RETENTION_MONTHS} months after your course access ends. Then we delete it.`,
			],
		},
		{
			heading: "Your choices",
			points: [
				`You can ask to see your data, correct it, or have it deleted — ${contact}.`,
				"You can withdraw your agreement at any time the same way. You will then no longer be able to use this website.",
				"If we don't sort out a complaint, you can complain to the Data Protection Board of India.",
			],
		},
	];
}

/** The three lines shown on the accept screen, above the checkbox. */
export function privacySummary(): string[] {
	return [
		"We keep your name, contact details and test results so we can run your tests and help you improve.",
		"Only you, your teachers and the institute's staff can see them.",
		`We delete them ${RETENTION_MONTHS} months after your course access ends.`,
	];
}

/**
 * The address named in the notice, from `PRIVACY_CONTACT_EMAIL`, or `null`
 * when unset (the notice then names the front desk). Server-side only by use:
 * pages read it and pass the text down.
 */
export function privacyContactEmail(): string | null {
	const value = process.env.PRIVACY_CONTACT_EMAIL?.trim();
	return value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
}

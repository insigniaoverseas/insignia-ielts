import "server-only";

/**
 * Application settings that are not Supabase's (those live in
 * `lib/supabase/env.ts`). Locally these come from `.dev.vars`; deployed, from
 * Wrangler secrets and `wrangler.jsonc` vars.
 *
 * Secrets are read through functions, never captured at module scope: on
 * Workers the environment is only populated per request.
 */

/** True when running `next dev` / `wrangler dev`, not a deployed Worker. */
export function isDevelopment(): boolean {
	return (process.env.NEXTJS_ENV ?? process.env.NODE_ENV) === "development";
}

/**
 * The origin invitation links are built from, with no trailing slash.
 *
 * This must be an absolute URL: an invite is read in someone's email client,
 * where a relative path means nothing. It is one setting precisely so that
 * moving from workers.dev to the institute's own domain is a one-line change.
 */
export function appBaseUrl(): string {
	const raw = process.env.APP_BASE_URL;
	if (!raw) {
		throw new Error("APP_BASE_URL is not set. Add it to .dev.vars locally, or to `vars` in wrangler.jsonc.");
	}
	return raw.replace(/\/+$/, "");
}

/** The Resend API key, or `null` when one has not been provisioned yet. */
export function resendApiKey(): string | null {
	return process.env.RESEND_API_KEY ?? null;
}

/**
 * The From address on invitation email, e.g. `Insignia IELTS <invites@…>`.
 * Must be on a domain verified in Resend or the send is rejected.
 */
export function mailFrom(): string {
	const raw = process.env.MAIL_FROM;
	if (!raw) {
		throw new Error("MAIL_FROM is not set. Add it to .dev.vars locally, or to `vars` in wrangler.jsonc.");
	}
	return raw;
}

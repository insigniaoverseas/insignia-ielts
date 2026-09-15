import "server-only";

/**
 * Reads a required Supabase setting from the Worker's environment.
 *
 * Locally the values come from `.dev.vars` (see `.dev.vars.example`); deployed,
 * from Wrangler secrets. OpenNext exposes both on `process.env` at request time.
 *
 * @throws Error naming the missing variable — never its value.
 */
function required(name: "SUPABASE_URL" | "SUPABASE_PUBLISHABLE_KEY" | "SUPABASE_SECRET_KEY"): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`${name} is not set. Add it to .dev.vars locally, or run \`npx wrangler secret put ${name}\`.`);
	}
	return value;
}

/** The project URL, e.g. `https://<ref>.supabase.co`. */
export const supabaseUrl = (): string => required("SUPABASE_URL");

/** The publishable key (`sb_publishable_…`). Safe for RLS-scoped requests. */
export const supabasePublishableKey = (): string => required("SUPABASE_PUBLISHABLE_KEY");

/**
 * The secret key (`sb_secret_…`). **Bypasses RLS.** Only `admin.ts` may call
 * this, and only behind a `lib/rbac.ts` check.
 */
export const supabaseSecretKey = (): string => required("SUPABASE_SECRET_KEY");

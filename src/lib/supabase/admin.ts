import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";
import { supabaseSecretKey, supabaseUrl } from "./env";

/**
 * Supabase client with the **secret key — it bypasses RLS entirely**.
 *
 * Only for the privileged writes the API deliberately doesn't allow
 * (PROJECT-MEMORY §4): creating users on invite acceptance, role/status
 * changes, issuing devices and sessions, scoring, releasing results, writing
 * `audit_log`. Every caller must first pass a `lib/rbac.ts` check and must
 * write an audit row.
 *
 * Database triggers still apply to it — it can't forge the attempt clock,
 * rewind an answer or edit an append-only table.
 *
 * `import "server-only"` makes any import from client code fail the build.
 */
export function createAdminClient() {
	return createClient<Database>(supabaseUrl(), supabaseSecretKey(), {
		auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
	});
}

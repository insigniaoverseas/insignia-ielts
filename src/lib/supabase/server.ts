import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "./database.types";
import { supabasePublishableKey, supabaseUrl } from "./env";

/**
 * Supabase client acting **as the signed-in user**, for Server Components,
 * Server Actions and Route Handlers. Every query runs under that user's RLS
 * policies — the first of the two gates (MVP-1 §13; `lib/rbac.ts` is the other).
 *
 * The session lives in httpOnly cookies. Server Components can't write
 * cookies, so a refresh attempted there is ignored; Server Actions and Route
 * Handlers persist it. Session policy (JWT lifetime, single active session)
 * is M1-12.
 *
 * Create one per request — never share it across requests.
 *
 * @example
 * const supabase = await createClient();
 * const { data } = await supabase.from("tests").select("id, title, kind");
 */
export async function createClient() {
	const cookieStore = await cookies();

	return createServerClient<Database>(supabaseUrl(), supabasePublishableKey(), {
		cookies: {
			getAll() {
				return cookieStore.getAll();
			},
			setAll(cookiesToSet) {
				try {
					for (const { name, value, options } of cookiesToSet) {
						cookieStore.set(name, value, options);
					}
				} catch {
					// Called from a Server Component, which can't set cookies.
					// Safe to ignore: the next Server Action or Route Handler writes them.
				}
			},
		},
	});
}

import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Batch lookups for the screens that need to offer a choice of batch.
 *
 * Read through the **user-scoped** client, not the admin one: these are
 * ordinary reads, so RLS should be the thing that decides what comes back. The
 * secret key is for writes the API deliberately forbids, and reaching for it
 * here would quietly bypass the first of the two gates (`MVP-1.md` §13).
 */

/** One batch, as a form option. */
export type BatchOption = {
	id: string;
	name: string;
};

/**
 * The batches the signed-in user may put someone into.
 *
 * Takes no actor **on purpose**: scope comes from RLS on the user-scoped client
 * — an admin sees their branch, the Owner sees every branch. Passing an actor
 * here would invite a second, hand-written branch filter that could drift out
 * of step with the policy, and two gates disagreeing is a bug.
 */
export async function listBatchOptions(): Promise<BatchOption[]> {
	const supabase = await createClient();
	const { data, error } = await supabase.from("batches").select("id, name").order("name");

	if (error) {
		console.error("batch list failed:", error.message);
		return [];
	}
	return data ?? [];
}

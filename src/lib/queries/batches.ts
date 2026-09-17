import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Batch and branch lookups for the screens that offer a choice of either.
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

/** One branch, as a form option. */
export type BranchOption = {
	id: string;
	name: string;
};

/**
 * The branches the signed-in user may place someone into.
 *
 * Scope comes from RLS exactly as it does for batches: the identity migration
 * gives an admin their own branch and the Owner every branch, so a second
 * hand-written filter here could only disagree with the policy.
 */
export async function listBranchOptions(): Promise<BranchOption[]> {
	const supabase = await createClient();
	const { data, error } = await supabase.from("branches").select("id, name").order("name");

	if (error) {
		console.error("branch list failed:", error.message);
		return [];
	}
	return data ?? [];
}

/** One member of staff who can be put in front of a batch. */
export type TeacherOption = {
	id: string;
	name: string;
};

/**
 * Staff who can teach, for the batch form's teacher picker.
 *
 * Invigilators are included: they are the ones who sit with a live test, and
 * screen 25 counts a batch with nobody attached as broken. `createBatch`
 * re-checks the role and centre server-side — this list shapes the screen, it
 * does not guard the write.
 */
export async function listTeacherOptions(): Promise<TeacherOption[]> {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("users")
		.select("id, name, status, roles ( key )")
		.eq("status", "active")
		.order("name");

	if (error) {
		console.error("teacher list failed:", error.message);
		return [];
	}

	return (data ?? [])
		.filter((person) => person.roles?.key === "teacher" || person.roles?.key === "invigilator")
		.map((person) => ({ id: person.id, name: person.name }));
}

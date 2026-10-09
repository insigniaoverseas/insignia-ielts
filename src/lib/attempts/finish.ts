import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { OwnedAttempt } from "./load";

/**
 * Closes an in-progress attempt as `submitted` or `expired`.
 *
 * Students hold no UPDATE on `attempts`, so this uses the secret-key client;
 * callers must already have proved ownership (or staff scope). The
 * `attempts_before_update` trigger enforces the state machine and stamps
 * `submitted_at`; the `.eq("status", "in_progress")` guard makes a second
 * submit — a double tap, or the timer and the button together — a no-op.
 *
 * @returns Whether this call closed it (false if it was already closed).
 */
export async function finishAttempt(attempt: OwnedAttempt, status: "submitted" | "expired"): Promise<boolean> {
	if (attempt.status !== "in_progress") return false;
	const { data, error } = await createAdminClient()
		.from("attempts")
		.update({ status })
		.eq("id", attempt.id)
		.eq("status", "in_progress")
		.select("id");
	if (error) throw error;
	return (data?.length ?? 0) > 0;
}

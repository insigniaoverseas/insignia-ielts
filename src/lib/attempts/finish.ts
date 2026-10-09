import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { OwnedAttempt } from "./load";
import { ensureMarked } from "./mark";

/**
 * Closes an in-progress attempt as `submitted` or `expired`, then marks it.
 *
 * Students hold no UPDATE on `attempts`, so this uses the secret-key client;
 * callers must already have proved ownership (or staff scope). The
 * `attempts_before_update` trigger enforces the state machine and stamps
 * `submitted_at`; the `.eq("status", "in_progress")` guard makes a second
 * submit — a double tap, or the timer and the button together — a no-op.
 *
 * Marking failing never reopens or un-submits the attempt: it is logged, and
 * the result page tries again (`ensureMarked` is idempotent). The student's
 * answers are already safe either way.
 *
 * @returns Whether this call closed it (false if it was already closed).
 */
export async function finishAttempt(attempt: OwnedAttempt, status: "submitted" | "expired"): Promise<boolean> {
	let closed = false;
	if (attempt.status === "in_progress") {
		const { data, error } = await createAdminClient()
			.from("attempts")
			.update({ status })
			.eq("id", attempt.id)
			.eq("status", "in_progress")
			.select("id");
		if (error) throw error;
		closed = (data?.length ?? 0) > 0;
	}
	try {
		await ensureMarked(attempt.id);
	} catch (markError) {
		console.error(`marking attempt ${attempt.id} failed; the result page will retry:`, markError);
	}
	return closed;
}

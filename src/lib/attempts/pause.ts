import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { practiceCheckIn } from "./clock";
import type { OwnedAttempt } from "./load";

/**
 * Records a practice attempt's check-in and gives back time spent away
 * (`practiceCheckIn`). Mock and class attempts are returned untouched — their
 * clock never pauses.
 *
 * Must run **before** anything decides an attempt is overdue, or a practice
 * student returning after the original deadline would be closed instead of
 * resumed. Writes with the secret-key client (students hold no UPDATE on
 * `attempts`); the trigger still refuses to move a deadline earlier.
 */
export async function checkInPractice(attempt: OwnedAttempt): Promise<OwnedAttempt> {
	if (attempt.kind !== "practice" || attempt.status !== "in_progress") return attempt;
	const { expiresAt, checkpoint } = practiceCheckIn(attempt);
	const changes = { time_remaining_seconds: checkpoint, ...(expiresAt ? { expires_at: expiresAt } : {}) };
	const { error } = await createAdminClient()
		.from("attempts")
		.update(changes)
		.eq("id", attempt.id)
		.eq("status", "in_progress");
	if (error) throw error;
	return { ...attempt, ...changes };
}

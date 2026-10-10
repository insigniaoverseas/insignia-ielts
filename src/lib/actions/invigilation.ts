"use server";

import { recordAudit } from "@/lib/audit";
import { isOverdue, secondsLeft } from "@/lib/attempts/clock";
import { finishAttempt } from "@/lib/attempts/finish";
import type { OwnedAttempt } from "@/lib/attempts/load";
import { sessionState } from "@/lib/auth/sessions";
import { ForbiddenError, requirePermission } from "@/lib/rbac";
import type { Actor } from "@/lib/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { InvigilatorActionResult } from "@/lib/actions/types";

/**
 * The live monitor's two buttons (M7-03): **+5 minutes** and **Finish for them**.
 *
 * Every export is a public endpoint, so each one re-proves who is asking:
 * `session:invigilate`, a live session, and then the attempt read through the
 * invigilator's **own RLS client** — `staff_sees_attempt` is the scope check,
 * so a teacher cannot reach an attempt outside the batches they teach any more
 * than they could see it on screen.
 *
 * The writes go through the secret-key client (staff hold no UPDATE on
 * `attempts`), and the database still has the last word on the clock:
 * `attempts_before_update` lets `expires_at` only grow, and only while the
 * attempt is in progress. Both actions write an `attempt_events` row and an
 * audit entry naming the invigilator.
 */

/** Extra time per press. Fixed here, never taken from the request. */
const EXTRA_SECONDS = 5 * 60;

const ATTEMPT_FIELDS =
	"id, test_id, assignment_id, student_id, kind, content_version, status, started_at, expires_at, submitted_at, time_remaining_seconds";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** The invigilator, and the attempt if it is theirs to act on. */
async function attemptInScope(
	attemptId: string,
): Promise<{ actor: Actor; attempt: OwnedAttempt } | { message: string }> {
	let actor: Actor;
	try {
		({ actor } = await requirePermission("session:invigilate"));
	} catch (error) {
		if (error instanceof ForbiddenError) return { message: "You can't do this from your account." };
		throw error;
	}
	if ((await sessionState(actor.id)) !== "live") return { message: "You've been signed out. Please sign in again." };
	if (typeof attemptId !== "string" || !UUID.test(attemptId)) return { message: "We couldn't find that student's test." };

	const { data, error } = await (await createClient())
		.from("attempts")
		.select(ATTEMPT_FIELDS)
		.eq("id", attemptId)
		.maybeSingle();
	if (error) throw error;
	if (!data) return { message: "We couldn't find that student's test." };
	return { actor, attempt: data as OwnedAttempt };
}

/**
 * Gives one student five more minutes.
 *
 * Refused for practice (its clock pauses on its own), for a finished attempt,
 * and once the time has already run out — at that point the attempt is closed
 * as expired, which is what the student's own screen would do next.
 */
export async function extendAttemptAction(attemptId: string): Promise<InvigilatorActionResult> {
	try {
		const found = await attemptInScope(attemptId);
		if ("message" in found) return { ok: false, message: found.message };
		const { actor, attempt } = found;

		if (attempt.kind === "practice") return { ok: false, message: "Practice tests pause by themselves — no extra time needed." };
		if (attempt.status !== "in_progress") return { ok: false, message: "They've already finished this test." };
		if (isOverdue(attempt)) {
			await finishAttempt(attempt, "expired");
			return { ok: false, message: "Their time had already run out, so the test has been handed in." };
		}

		const admin = createAdminClient();
		const extended = new Date(new Date(attempt.expires_at).getTime() + EXTRA_SECONDS * 1000).toISOString();
		// Guarded on the value read, so two invigilators pressing at once give
		// five minutes each rather than one silently overwriting the other.
		const { data, error } = await admin
			.from("attempts")
			.update({ expires_at: extended })
			.eq("id", attempt.id)
			.eq("status", "in_progress")
			.eq("expires_at", attempt.expires_at)
			.select("expires_at")
			.maybeSingle();
		if (error) throw error;
		if (!data) return { ok: false, message: "Their test changed just now. Please try again." };

		await admin.from("attempt_events").insert({
			attempt_id: attempt.id,
			type: "extra_time",
			meta: { seconds: EXTRA_SECONDS, by: actor.id },
		});
		await recordAudit({
			actorId: actor.id,
			branchId: actor.branchId,
			action: "attempt.extra_time",
			entity: "attempt",
			entityId: attempt.id,
			meta: { seconds: EXTRA_SECONDS, student_id: attempt.student_id },
		});
		return { ok: true, secondsRemaining: secondsLeft({ ...attempt, expires_at: data.expires_at }) };
	} catch (error) {
		console.error("extend attempt failed:", error);
		return { ok: false, message: "Something went wrong. Please try again." };
	}
}

/**
 * Hands a student's test in for them — the answers as they stand — and marks
 * it. The student's screen finds out on its next save or heartbeat and goes to
 * the result page.
 */
export async function forceSubmitAttemptAction(attemptId: string): Promise<InvigilatorActionResult> {
	try {
		const found = await attemptInScope(attemptId);
		if ("message" in found) return { ok: false, message: found.message };
		const { actor, attempt } = found;
		if (attempt.status !== "in_progress") return { ok: false, message: "They've already finished this test." };

		const closedAs = isOverdue(attempt) ? "expired" : "submitted";
		const closed = await finishAttempt(attempt, closedAs);
		if (!closed) return { ok: false, message: "They've already finished this test." };

		await createAdminClient()
			.from("attempt_events")
			.insert({ attempt_id: attempt.id, type: "force_submit", meta: { by: actor.id } });
		await recordAudit({
			actorId: actor.id,
			branchId: actor.branchId,
			action: "attempt.force_submit",
			entity: "attempt",
			entityId: attempt.id,
			meta: { student_id: attempt.student_id, closed_as: closedAs },
		});
		return { ok: true, secondsRemaining: null };
	} catch (error) {
		console.error("force submit failed:", error);
		return { ok: false, message: "Something went wrong. Please try again." };
	}
}

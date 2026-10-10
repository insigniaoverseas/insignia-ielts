import "server-only";

import { recordAudit } from "@/lib/audit";
import type { Actor } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { rescoreAttempt } from "./rescore";

/**
 * "Give the mark" on screen 18 (M6-05): a teacher accepts an answer the key
 * marked wrong — a spelling the key didn't list, a reasonable synonym.
 *
 * Scope: the attempt is read through the actor's **own RLS client**
 * (`staff_sees_attempt`), so a teacher can only re-mark students they teach.
 * The note is required: whoever looks at this attempt next needs to know why
 * a mark was changed by hand. The override is stored on the `answer_marks` row
 * (who, why, when) and survives any later re-mark from a corrected key.
 */
export async function giveMark(
	actor: Actor,
	attemptId: string,
	qNumber: number,
	note: string,
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
	const why = note.trim();
	if (!why) return { ok: false, message: "Say why you're giving this mark." };
	if (why.length > 300) return { ok: false, message: "Keep the note under 300 characters." };
	if (!Number.isInteger(qNumber) || qNumber < 1 || qNumber > 200) return { ok: false, message: "That question couldn't be found." };

	const { data: attempt, error } = await (await createClient())
		.from("attempts")
		.select("id, student_id, status")
		.eq("id", attemptId)
		.maybeSingle();
	if (error) throw error;
	if (!attempt) return { ok: false, message: "That student's test couldn't be found." };
	if (attempt.status !== "submitted" && attempt.status !== "expired") {
		return { ok: false, message: "They haven't finished this test yet." };
	}

	const admin = createAdminClient();
	const { data: changed, error: updateError } = await admin
		.from("answer_marks")
		.update({
			is_correct: true,
			marks_awarded: 1,
			overridden_by: actor.id,
			override_note: why,
			overridden_at: new Date().toISOString(),
		})
		.eq("attempt_id", attempt.id)
		.eq("q_number", qNumber)
		.eq("is_correct", false)
		.select("q_number")
		.maybeSingle();
	if (updateError) throw updateError;
	if (!changed) return { ok: false, message: "That answer is already marked right." };

	const score = await rescoreAttempt(attempt.id);
	await recordAudit({
		actorId: actor.id,
		branchId: actor.branchId,
		action: "mark.override",
		entity: "attempt",
		entityId: attempt.id,
		meta: { q_number: qNumber, note: why, student_id: attempt.student_id, before: score.before, after: score.after },
	});
	return {
		ok: true,
		message: `Mark given for question ${qNumber}. Score is now ${score.after.raw}${score.after.band !== null ? `, band ${score.after.band.toFixed(1)}` : ""}.`,
	};
}

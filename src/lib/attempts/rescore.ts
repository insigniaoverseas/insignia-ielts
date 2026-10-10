import "server-only";

import { readAnswerKeyObject } from "@/lib/r2";
import { answerKeyObjectKey } from "@/lib/r2-keys";
import { answerKeySchema, markAttempt, type AnswerKey } from "@/lib/scoring";
import { createAdminClient } from "@/lib/supabase/admin";
import { givenAnswersFromRows } from "./answers";
import { bandForScore } from "./mark";
import { applyOverrides } from "./overrides";

/**
 * Marks a **finished** attempt again and rewrites its score (M6-05, M5-09).
 *
 * `ensureMarked` marks once and never again; this is for when something has
 * changed since — a teacher gave a mark by hand, or the answer key was
 * corrected. Every question is re-marked from the key, except those a teacher
 * has overridden (`applyOverrides`), then the raw score, section scores and
 * band are rewritten.
 *
 * Server-only, secret-key client: callers must already have proved the actor
 * may act on this attempt.
 *
 * @param key The key to mark against. Omit to read the attempt's own `key.json`.
 * @returns The score before and after, for the audit trail.
 */
export async function rescoreAttempt(
	attemptId: string,
	key?: AnswerKey,
): Promise<{ before: { raw: number | null; band: number | null }; after: { raw: number; band: number | null } }> {
	const admin = createAdminClient();
	const { data: attempt, error } = await admin
		.from("attempts")
		.select("id, test_id, assignment_id, content_version, status")
		.eq("id", attemptId)
		.single();
	if (error) throw error;
	if (attempt.status !== "submitted" && attempt.status !== "expired") throw new Error("Only a finished attempt can be re-marked");

	let theKey = key;
	if (!theKey) {
		const object = await readAnswerKeyObject(answerKeyObjectKey(attempt.test_id, attempt.content_version));
		if (!object) throw new Error(`answer key missing for test ${attempt.test_id} v${attempt.content_version}`);
		theKey = answerKeySchema.parse(await object.json());
	}

	const [answersResult, marksResult, scoreResult, testResult, assignmentResult] = await Promise.all([
		admin.from("answers").select("q_number, given_answer").eq("attempt_id", attemptId),
		admin.from("answer_marks").select("q_number, is_correct, marks_awarded, overridden_by").eq("attempt_id", attemptId),
		admin.from("attempt_scores").select("raw_score, band").eq("attempt_id", attemptId).maybeSingle(),
		admin.from("tests").select("skill, variant").eq("id", attempt.test_id).single(),
		attempt.assignment_id
			? admin.from("assignments").select("band_scale_id").eq("id", attempt.assignment_id).single()
			: Promise.resolve({ data: null, error: null }),
	]);
	for (const result of [answersResult, marksResult, scoreResult, testResult, assignmentResult]) if (result.error) throw result.error;

	const controls = theKey.sections.flatMap((section) => section.question_groups.flatMap((group) => group.questions));
	const marked = markAttempt(theKey, givenAnswersFromRows(controls, answersResult.data ?? []));
	const overrides = (marksResult.data ?? [])
		.filter((row) => row.overridden_by !== null)
		.map((row) => ({ qNumber: row.q_number, isCorrect: row.is_correct, marksAwarded: Number(row.marks_awarded) }));
	const final = applyOverrides(
		marked.marks,
		overrides,
		marked.sectionScores.map((s) => ({ sectionNo: s.sectionNo, maxScore: s.maxScore })),
	);
	const band = await bandForScore(
		admin,
		assignmentResult.data?.band_scale_id ?? null,
		testResult.data!,
		final.rawScore,
		marked.maxScore,
	);

	// Overridden rows are left exactly as the teacher set them.
	const keptSet = new Set(final.kept);
	const rewrite = final.marks.filter((mark) => !keptSet.has(mark.qNumber));
	if (rewrite.length > 0) {
		const { error: marksError } = await admin.from("answer_marks").upsert(
			rewrite.map((mark) => ({
				attempt_id: attemptId,
				q_number: mark.qNumber,
				section_no: mark.sectionNo,
				question_type: mark.questionType,
				is_correct: mark.isCorrect,
				marks_awarded: mark.marksAwarded,
			})),
			{ onConflict: "attempt_id,q_number" },
		);
		if (marksError) throw marksError;
	}

	const { error: scoreError } = await admin.from("attempt_scores").upsert(
		{
			attempt_id: attemptId,
			raw_score: final.rawScore,
			band: band.band,
			below_band: band.belowBand,
			section_scores: final.sectionScores.map((s) => ({ section_no: s.sectionNo, correct: s.rawScore, total: s.maxScore })),
		},
		{ onConflict: "attempt_id" },
	);
	if (scoreError) throw scoreError;

	return {
		before: { raw: scoreResult.data ? Number(scoreResult.data.raw_score) : null, band: scoreResult.data?.band ?? null },
		after: { raw: final.rawScore, band: band.band },
	};
}

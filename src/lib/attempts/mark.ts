import "server-only";

import { readAnswerKeyObject } from "@/lib/r2";
import { answerKeyObjectKey } from "@/lib/r2-keys";
import { answerKeySchema, bandFor, markAttempt } from "@/lib/scoring";
import { createAdminClient } from "@/lib/supabase/admin";
import { givenAnswersFromRows } from "./answers";
import { bandLookupScore } from "./band";

/**
 * Marks a finished attempt (M2-17): `key.json` from R2, the student's stored
 * answers, `lib/scoring.ts`, and the band chart — then writes `answer_marks`
 * and `attempt_scores`.
 *
 * Server-only, and the only place an attempt meets its answer key. Uses the
 * secret-key client: students hold no write on either table, and the scorer
 * must read every answer row whatever the release gate says.
 *
 * Idempotent: an existing `attempt_scores` row means it is already marked, so
 * a retry — the submit button and the timer together, or a resumed page
 * after a failed first try — never marks twice. Marks are written before the
 * score, so a score row is the "done" marker.
 *
 * @returns `"marked"` if this call marked it, `"already"` if it was marked
 *   before, `"not_finished"` if the attempt is still open.
 */
export async function ensureMarked(attemptId: string): Promise<"marked" | "already" | "not_finished"> {
	const admin = createAdminClient();
	const { data: attempt, error } = await admin
		.from("attempts")
		.select("id, test_id, assignment_id, content_version, status")
		.eq("id", attemptId)
		.single();
	if (error) throw error;
	if (attempt.status !== "submitted" && attempt.status !== "expired") return "not_finished";

	const { data: existing, error: existingError } = await admin
		.from("attempt_scores")
		.select("attempt_id")
		.eq("attempt_id", attemptId)
		.maybeSingle();
	if (existingError) throw existingError;
	if (existing) return "already";

	const object = await readAnswerKeyObject(answerKeyObjectKey(attempt.test_id, attempt.content_version));
	if (!object) throw new Error(`answer key missing for test ${attempt.test_id} v${attempt.content_version}`);
	const key = answerKeySchema.parse(await object.json());

	const [answersResult, testResult, assignmentResult] = await Promise.all([
		admin.from("answers").select("q_number, given_answer").eq("attempt_id", attemptId),
		admin.from("tests").select("skill, variant").eq("id", attempt.test_id).single(),
		attempt.assignment_id
			? admin.from("assignments").select("band_scale_id").eq("id", attempt.assignment_id).single()
			: Promise.resolve({ data: null, error: null }),
	]);
	if (answersResult.error) throw answersResult.error;
	if (testResult.error) throw testResult.error;
	if (assignmentResult.error) throw assignmentResult.error;

	const controls = key.sections.flatMap((section) => section.question_groups.flatMap((group) => group.questions));
	const marked = markAttempt(key, givenAnswersFromRows(controls, answersResult.data ?? []));

	const band = await bandForScore(
		admin,
		assignmentResult.data?.band_scale_id ?? null,
		testResult.data,
		marked.rawScore,
		marked.maxScore,
	);

	const { error: marksError } = await admin.from("answer_marks").upsert(
		marked.marks.map((mark) => ({
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

	const { error: scoreError } = await admin.from("attempt_scores").upsert(
		{
			attempt_id: attemptId,
			raw_score: marked.rawScore,
			band: band.band,
			below_band: band.belowBand,
			section_scores: marked.sectionScores.map((section) => ({
				section_no: section.sectionNo,
				correct: section.rawScore,
				total: section.maxScore,
			})),
		},
		{ onConflict: "attempt_id" },
	);
	if (scoreError) throw scoreError;
	return "marked";
}

/**
 * The band for a raw score: the assignment's chart if it has one, else the
 * default chart for the test's skill and variant. Shared by first marking and
 * re-scoring, so the two can never read different charts.
 */
export async function bandForScore(
	admin: ReturnType<typeof createAdminClient>,
	assignmentScaleId: string | null,
	test: { skill: string; variant: string },
	rawScore: number,
	maxScore: number,
) {
	let scaleId = assignmentScaleId;
	if (!scaleId) {
		const { data: scale, error: scaleError } = await admin
			.from("band_scales")
			.select("id")
			.eq("skill", test.skill)
			.eq("variant", test.variant)
			.eq("is_default", true)
			.single();
		if (scaleError) throw scaleError;
		scaleId = scale.id;
	}
	const { data: bandRows, error: bandError } = await admin
		.from("band_scale_rows")
		.select("raw_min, raw_max, band")
		.eq("scale_id", scaleId);
	if (bandError) throw bandError;
	return bandFor(bandLookupScore(rawScore, maxScore), bandRows ?? []);
}

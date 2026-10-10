import "server-only";

import { readAnswerKeyObject } from "@/lib/r2";
import { answerKeyObjectKey } from "@/lib/r2-keys";
import { selectAll } from "@/lib/queries/shared";
import { answerKeySchema, bandFor, markAttempt, type AnswerKey } from "@/lib/scoring";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TablesInsert } from "@/lib/supabase/database.types";
import { givenAnswersFromRows } from "./answers";
import { bandLookupScore } from "./band";
import { applyOverrides } from "./overrides";

/**
 * Marks **finished** attempts again and rewrites their scores (M6-05, M5-09).
 *
 * `ensureMarked` marks once and never again; this is for when something has
 * changed since — a teacher gave a mark by hand, or the answer key was
 * corrected. Every question is re-marked from the key, except those a teacher
 * has overridden (`applyOverrides`), then raw score, section scores and band
 * are rewritten.
 *
 * **Bulk on purpose.** A key correction can re-mark a whole centre's attempts
 * in one request, and Workers Free allows 50 subrequests per request: so the
 * reads are paged (`selectAll` — the API truncates at 1,000 rows), band charts
 * are read once, and all marks and all scores go back in one upsert each.
 * A dozen subrequests whether it is one attempt or two hundred.
 *
 * Server-only, secret-key client: callers must already have proved the actor
 * may act on these attempts. All must be attempts at the **same test**.
 *
 * @param key The key to mark against. Omit to read `key.json` at each attempt's version.
 * @returns Each attempt's score before and after, for the audit trail.
 */
export async function rescoreAttempts(
	attemptIds: readonly string[],
	key?: AnswerKey,
): Promise<Map<string, { before: { raw: number | null; band: number | null }; after: { raw: number; band: number | null } }>> {
	const out = new Map<string, { before: { raw: number | null; band: number | null }; after: { raw: number; band: number | null } }>();
	const ids = [...new Set(attemptIds)];
	if (ids.length === 0) return out;
	const admin = createAdminClient();

	const attempts = await selectAll("rescore attempts", (from, to) =>
		admin.from("attempts").select("id, test_id, assignment_id, content_version, status").in("id", ids).order("id").range(from, to),
	);
	const finished = attempts.filter((a) => a.status === "submitted" || a.status === "expired");
	if (finished.length === 0) return out;
	const testIds = new Set(finished.map((a) => a.test_id));
	if (testIds.size !== 1) throw new Error("rescoreAttempts takes attempts at one test");
	const [testId] = testIds;

	// Keys: the one given, or each version's own.
	const keys = new Map<number, AnswerKey>();
	for (const version of new Set(finished.map((a) => a.content_version))) {
		if (key) {
			keys.set(version, key);
			continue;
		}
		const object = await readAnswerKeyObject(answerKeyObjectKey(testId, version));
		if (!object) throw new Error(`answer key missing for test ${testId} v${version}`);
		keys.set(version, answerKeySchema.parse(await object.json()));
	}

	const finishedIds = finished.map((a) => a.id);
	const assignmentIds = [...new Set(finished.flatMap((a) => (a.assignment_id ? [a.assignment_id] : [])))];
	const [answers, marks, scores, testResult, assignmentsResult] = await Promise.all([
		selectAll("rescore answers", (from, to) =>
			admin.from("answers").select("attempt_id, q_number, given_answer").in("attempt_id", finishedIds).order("attempt_id").order("q_number").range(from, to),
		),
		selectAll("rescore marks", (from, to) =>
			admin.from("answer_marks").select("attempt_id, q_number, is_correct, marks_awarded, overridden_by").in("attempt_id", finishedIds).order("attempt_id").order("q_number").range(from, to),
		),
		selectAll("rescore scores", (from, to) =>
			admin.from("attempt_scores").select("attempt_id, raw_score, band").in("attempt_id", finishedIds).order("attempt_id").range(from, to),
		),
		admin.from("tests").select("skill, variant").eq("id", testId).single(),
		assignmentIds.length
			? admin.from("assignments").select("id, band_scale_id").in("id", assignmentIds)
			: Promise.resolve({ data: [] as { id: string; band_scale_id: string | null }[], error: null }),
	]);
	if (testResult.error) throw testResult.error;
	if (assignmentsResult.error) throw assignmentsResult.error;

	// Band charts: each assignment's own, else the default for the skill and variant — read once.
	const scaleOfAssignment = new Map((assignmentsResult.data ?? []).map((a) => [a.id, a.band_scale_id]));
	const { data: defaultScale, error: defaultError } = await admin
		.from("band_scales")
		.select("id")
		.eq("skill", testResult.data.skill)
		.eq("variant", testResult.data.variant)
		.eq("is_default", true)
		.single();
	if (defaultError) throw defaultError;
	const scaleIds = [...new Set([defaultScale.id, ...[...scaleOfAssignment.values()].filter((s): s is string => !!s)])];
	const { data: bandRows, error: bandError } = await admin.from("band_scale_rows").select("scale_id, raw_min, raw_max, band").in("scale_id", scaleIds);
	if (bandError) throw bandError;

	const markRows: TablesInsert<"answer_marks">[] = [];
	const scoreRows: TablesInsert<"attempt_scores">[] = [];
	for (const attempt of finished) {
		const theKey = keys.get(attempt.content_version)!;
		const controls = theKey.sections.flatMap((section) => section.question_groups.flatMap((group) => group.questions));
		const marked = markAttempt(theKey, givenAnswersFromRows(controls, answers.filter((a) => a.attempt_id === attempt.id)));
		const overrides = marks
			.filter((m) => m.attempt_id === attempt.id && m.overridden_by !== null)
			.map((m) => ({ qNumber: m.q_number, isCorrect: m.is_correct, marksAwarded: Number(m.marks_awarded) }));
		const final = applyOverrides(marked.marks, overrides, marked.sectionScores.map((s) => ({ sectionNo: s.sectionNo, maxScore: s.maxScore })));
		const scaleId = (attempt.assignment_id && scaleOfAssignment.get(attempt.assignment_id)) || defaultScale.id;
		const band = bandFor(bandLookupScore(final.rawScore, marked.maxScore), (bandRows ?? []).filter((r) => r.scale_id === scaleId));

		// Overridden rows are left exactly as the teacher set them.
		const kept = new Set(final.kept);
		for (const mark of final.marks) {
			if (kept.has(mark.qNumber)) continue;
			markRows.push({
				attempt_id: attempt.id,
				q_number: mark.qNumber,
				section_no: mark.sectionNo,
				question_type: mark.questionType,
				is_correct: mark.isCorrect,
				marks_awarded: mark.marksAwarded,
			});
		}
		scoreRows.push({
			attempt_id: attempt.id,
			raw_score: final.rawScore,
			band: band.band,
			below_band: band.belowBand,
			section_scores: final.sectionScores.map((s) => ({ section_no: s.sectionNo, correct: s.rawScore, total: s.maxScore })),
		});
		const before = scores.find((s) => s.attempt_id === attempt.id);
		out.set(attempt.id, {
			before: { raw: before ? Number(before.raw_score) : null, band: before?.band ?? null },
			after: { raw: final.rawScore, band: band.band },
		});
	}

	if (markRows.length > 0) {
		const { error } = await admin.from("answer_marks").upsert(markRows, { onConflict: "attempt_id,q_number" });
		if (error) throw error;
	}
	const { error: scoreError } = await admin.from("attempt_scores").upsert(scoreRows, { onConflict: "attempt_id" });
	if (scoreError) throw scoreError;
	return out;
}

/** {@link rescoreAttempts} for one attempt. */
export async function rescoreAttempt(attemptId: string, key?: AnswerKey) {
	const result = (await rescoreAttempts([attemptId], key)).get(attemptId);
	if (!result) throw new Error("Only a finished attempt can be re-marked");
	return result;
}

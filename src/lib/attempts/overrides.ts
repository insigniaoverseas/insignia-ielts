/**
 * Keeping a teacher's hand-given marks through a re-mark (M6-05, M5-09).
 *
 * **Pure.** When an attempt is marked again — a corrected answer key, or a
 * fresh override — every question is re-marked from the key, *except* those a
 * teacher has overridden: theirs is a judgement about this student's answer,
 * and a key change must not silently undo it. The totals are then re-added
 * from the final marks.
 */

/** The fields of a mark this module reads and writes. */
export type MarkFacts = { qNumber: number; sectionNo: number; isCorrect: boolean; marksAwarded: number };

/** A stored override: the number, and the mark the teacher gave it. */
export type StoredOverride = { qNumber: number; isCorrect: boolean; marksAwarded: number };

/**
 * @param fresh The marks `markAttempt` just produced from the key.
 * @param sectionMax Each section's maximum, from the same `markAttempt` run.
 * @returns The final marks (overrides applied), which numbers were kept from
 *   an override, and the re-added raw and section scores.
 */
export function applyOverrides<M extends MarkFacts>(
	fresh: readonly M[],
	overrides: readonly StoredOverride[],
	sectionMax: readonly { sectionNo: number; maxScore: number }[],
): { marks: M[]; kept: number[]; rawScore: number; sectionScores: { sectionNo: number; rawScore: number; maxScore: number }[] } {
	const byNumber = new Map(overrides.map((o) => [o.qNumber, o]));
	const kept: number[] = [];
	const marks = fresh.map((mark) => {
		const override = byNumber.get(mark.qNumber);
		if (!override) return mark;
		kept.push(mark.qNumber);
		return { ...mark, isCorrect: override.isCorrect, marksAwarded: override.marksAwarded };
	});
	const sectionScores = sectionMax.map(({ sectionNo, maxScore }) => ({
		sectionNo,
		maxScore,
		rawScore: marks.filter((m) => m.sectionNo === sectionNo).reduce((sum, m) => sum + m.marksAwarded, 0),
	}));
	return { marks, kept, rawScore: marks.reduce((sum, m) => sum + m.marksAwarded, 0), sectionScores };
}

/** A key's controls, as much of them as a re-mark row needs. */
type KeyLike = {
	sections: readonly { question_groups: readonly { questions: readonly { n: number; covers?: readonly number[]; answer: readonly string[] }[] }[] }[];
};

/**
 * The rows screen 18 offers to re-mark: every number marked wrong, plus every
 * number already overridden (so the note can be read). Staff-only — it
 * carries the key's answer.
 */
export function overridableAnswers(
	key: KeyLike,
	answers: readonly { q_number: number; given_answer: string | null }[],
	marks: readonly { q_number: number; is_correct: boolean; marks_awarded: number | string; overridden_by: string | null; override_note: string | null }[],
): { questionNumber: number; givenAnswer: string | null; correctAnswer: string; awarded: number; max: number; overridden: boolean; overrideNote: string | null }[] {
	const given = new Map(answers.map((a) => [a.q_number, a.given_answer]));
	const answerOf = new Map<number, string>();
	for (const section of key.sections)
		for (const group of section.question_groups)
			for (const q of group.questions) for (const n of q.covers ?? [q.n]) answerOf.set(n, q.answer.join(q.covers ? ", " : " / "));
	return marks
		.filter((m) => !m.is_correct || m.overridden_by !== null)
		.map((m) => ({
			questionNumber: m.q_number,
			givenAnswer: given.get(m.q_number)?.trim() || null,
			correctAnswer: answerOf.get(m.q_number) ?? "",
			awarded: Number(m.marks_awarded),
			max: 1,
			overridden: m.overridden_by !== null,
			overrideNote: m.override_note,
		}))
		.sort((a, b) => a.questionNumber - b.questionNumber);
}

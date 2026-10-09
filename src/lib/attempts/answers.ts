import type { AttemptSection } from "../view-models/attempt.ts";

/**
 * The one mapping between what the player holds and what `public.answers`
 * stores — used by autosave (player → rows), resume (rows → player) and
 * scoring (rows → the scorer's `GivenAnswers`). Pure, so every direction is
 * unit-tested against the same rules.
 *
 * Storage is one row per **numbered question**, because that is what the
 * database checks (`q_number` within `total_questions`) and what a teacher
 * reads. A "Choose THREE" control answers 11, 12 and 13, so its three ticks
 * are stored as rows 11, 12 and 13 in the order the student ticked them; an
 * unticked slot is a row with no answer.
 */

/** A stored answer row, as the student's own RLS client reads it back. */
export type AnswerRow = {
	q_number: number;
	section_no: number;
	given_answer: string | null;
	flagged: boolean;
	revision: number;
};

/** What the player holds for one control. */
export type PlayerValue = string | string[];

/** One row to write: everything except the revision, which the caller assigns. */
export type AnswerWrite = { q_number: number; section_no: number; given_answer: string | null };

/** Longest answer the database accepts (`answers.given_answer`). */
export const MAX_ANSWER_LENGTH = 500;

type Control = { id: string; number: number; covers: number[]; sectionNo: number };

/** Every answerable control in the attempt, in order. */
export function controlsOf(sections: readonly AttemptSection[]): Control[] {
	return sections.flatMap((section) =>
		section.groups.flatMap((group) =>
			group.questions.map((q) => ({
				id: q.id,
				number: q.number,
				covers: q.covers ?? [q.number],
				sectionNo: section.number,
			})),
		),
	);
}

/**
 * Rows to write for one control's new value. A multi-answer control always
 * writes every covered number, so un-ticking a box clears its row rather than
 * leaving a stale answer behind.
 */
export function rowsForValue(control: Control, value: PlayerValue): AnswerWrite[] {
	const clip = (text: string) => {
		const trimmed = text.slice(0, MAX_ANSWER_LENGTH);
		return trimmed.trim() === "" ? null : trimmed;
	};
	if (control.covers.length > 1) {
		const picked = (Array.isArray(value) ? value : [value]).map(clip).filter((v): v is string => v !== null);
		return control.covers.map((q, index) => ({
			q_number: q,
			section_no: control.sectionNo,
			given_answer: picked[index] ?? null,
		}));
	}
	const text = Array.isArray(value) ? value.join(" ") : value;
	return [{ q_number: control.number, section_no: control.sectionNo, given_answer: clip(text) }];
}

/**
 * Rebuilds the player's state from stored rows, for a resumed attempt.
 * `revisions` is the highest stored revision per control, so the next save
 * can be numbered above it.
 */
export function playerStateFromRows(
	sections: readonly AttemptSection[],
	rows: readonly AnswerRow[],
): { answers: Record<string, PlayerValue>; flagged: number[]; revisions: Record<string, number> } {
	const byNumber = new Map(rows.map((row) => [row.q_number, row]));
	const answers: Record<string, PlayerValue> = {};
	const revisions: Record<string, number> = {};
	for (const control of controlsOf(sections)) {
		const own = control.covers.flatMap((n) => byNumber.get(n) ?? []);
		if (own.length === 0) continue;
		revisions[control.id] = Math.max(...own.map((row) => row.revision));
		const given = own.flatMap((row) => (row.given_answer === null ? [] : [row.given_answer]));
		if (control.covers.length > 1) {
			if (given.length > 0) answers[control.id] = given;
		} else if (given[0] !== undefined) {
			answers[control.id] = given[0];
		}
	}
	const flagged = rows.filter((row) => row.flagged).map((row) => row.q_number).sort((a, b) => a - b);
	return { answers, flagged, revisions };
}

/**
 * The scorer's input: one entry per answer-key control, keyed by its first
 * number. Multi-answer controls get the list of non-empty covered answers.
 * Controls with nothing stored are left out — the scorer marks them wrong.
 */
export function givenAnswersFromRows(
	keyControls: readonly { n: number; covers?: readonly number[] }[],
	rows: readonly Pick<AnswerRow, "q_number" | "given_answer">[],
): Record<number, string | string[]> {
	const byNumber = new Map(rows.map((row) => [row.q_number, row.given_answer]));
	const given: Record<number, string | string[]> = {};
	for (const control of keyControls) {
		if (control.covers && control.covers.length > 1) {
			const picked = control.covers.flatMap((n) => {
				const value = byNumber.get(n);
				return value == null ? [] : [value];
			});
			if (picked.length > 0) given[control.n] = picked;
		} else {
			const value = byNumber.get(control.n);
			if (value != null) given[control.n] = value;
		}
	}
	return given;
}

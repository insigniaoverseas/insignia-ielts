import "server-only";

import { QUESTION_TYPES } from "../question-types.ts";
import type { answerKeySchema } from "../scoring.ts";
import type { testContentSchema } from "../test-content.ts";
import type { ReviewQuestion } from "../view-models/student.ts";
import type { z } from "zod";

/**
 * Screen 10's questions (M4-01): the attempt's own content, its answer key,
 * what the student saved and how each number was marked, joined into one row
 * per control.
 *
 * **Pure** and server-only. The caller has already established the gate —
 * this student's own attempt, results released, the assignment allows review
 * (`MVP-1.md` §7) — and read `key.json` through the R2 binding. Nothing here
 * re-marks: `isCorrect` comes from `answer_marks`, the record the score was
 * built from, so the review can never disagree with the result screen.
 *
 * Prompts are passed through `sanitize`, so the second half of "sanitise on
 * write and on render" (non-negotiable 8) happens before anything leaves the
 * server.
 */

type Content = z.infer<typeof testContentSchema>;
type Key = z.infer<typeof answerKeySchema>;

/** The review rows plus the counts the header shows, per question number. */
export type ReviewBuild = {
	questions: ReviewQuestion[];
	summary: { correct: number; wrong: number; total: number };
};

/**
 * @param answers The attempt's saved `answers` rows.
 * @param marks The attempt's `answer_marks` rows.
 * @param sanitize The passage sanitiser, injected so this module stays pure.
 */
export function buildReview(
	content: Content,
	key: Key,
	answers: readonly { q_number: number; given_answer: string | null }[],
	marks: readonly { q_number: number; is_correct: boolean }[],
	sanitize: (html: string) => string,
): ReviewBuild {
	const given = new Map(answers.map((row) => [row.q_number, row.given_answer]));
	const correct = new Map(marks.map((row) => [row.q_number, row.is_correct]));

	const prompts = new Map<number, string>();
	for (const section of content.sections) {
		for (const group of section.question_groups) {
			for (const question of group.questions) prompts.set(question.n, question.prompt);
		}
	}

	const questions: ReviewQuestion[] = [];
	let right = 0;
	let total = 0;
	for (const section of key.sections) {
		for (const group of section.question_groups) {
			const multi = QUESTION_TYPES[group.type].widget === "checkbox_n";
			for (const question of group.questions) {
				const numbers = question.covers ?? [question.n];
				const numbersRight = numbers.filter((n) => correct.get(n) === true).length;
				total += numbers.length;
				right += numbersRight;

				const chosen = numbers.flatMap((n) => {
					const value = given.get(n)?.trim();
					return value ? [value] : [];
				});

				questions.push({
					number: question.n,
					label: numbers.length > 1 ? `${numbers[0]}–${numbers.at(-1)}` : String(question.n),
					sectionNo: section.n,
					promptHtml: sanitize(prompts.get(question.n) ?? ""),
					questionType: group.type,
					questionTypeLabel: QUESTION_TYPES[group.type].officialName,
					correct: numbersRight === numbers.length,
					givenAnswer: chosen.length > 0 ? chosen.join(", ") : null,
					// A multi-answer control needs every listed choice; anything else
					// accepts any one of its answers, so they read as alternatives.
					correctAnswer: question.answer.join(multi ? ", " : " / "),
					explanationHtml: null,
					audioOffsetSeconds: null,
				});
			}
		}
	}

	return { questions, summary: { correct: right, wrong: total - right, total } };
}

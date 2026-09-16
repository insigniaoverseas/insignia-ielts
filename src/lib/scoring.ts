import "server-only";

import { z } from "zod";

import { QUESTION_TYPE_KEYS, getQuestionTypeDefinition } from "./question-types.ts";
import type { QuestionType } from "./question-types.ts";

const answerTextSchema = z.string().trim().min(1).max(500);
const keyedQuestionSchema = z
	.object({
		n: z.number().int().positive().max(200),
		covers: z.array(z.number().int().positive().max(200)).min(2).max(10).optional(),
		marks: z.number().int().positive().max(10),
		answer: z.array(answerTextSchema).min(1).max(20),
		accepted_variants: z.array(answerTextSchema).max(20).optional(),
	})
	.strict();

const keyedGroupSchema = z
	.object({
		type: z.enum(QUESTION_TYPE_KEYS),
		word_limit: z.number().int().positive().max(20).optional(),
		questions: z.array(keyedQuestionSchema).min(1).max(100),
	})
	.strict();

/** Runtime boundary for the private key object read from R2. */
export const answerKeySchema = z
	.object({
		schema_version: z.literal(1),
		test_id: z.string().uuid(),
		content_version: z.number().int().positive(),
		sections: z
			.array(
				z
					.object({
						n: z.number().int().positive().max(10),
						question_groups: z.array(keyedGroupSchema).min(1).max(50),
					})
					.strict(),
			)
			.min(1)
			.max(20),
	})
	.strict()
	.superRefine((key, ctx) => {
		const used = new Set<number>();
		let expected = 1;
		key.sections.forEach((section, sectionIndex) => {
			if (section.n !== sectionIndex + 1) {
				ctx.addIssue({ code: "custom", path: ["sections", sectionIndex, "n"], message: `Expected section ${sectionIndex + 1}` });
			}
			section.question_groups.forEach((group, groupIndex) => {
				const groupPath = ["sections", sectionIndex, "question_groups", groupIndex] as const;
				const widget = getQuestionTypeDefinition(group.type).widget;
				if (widget === "text_gap" && group.word_limit === undefined) {
					ctx.addIssue({ code: "custom", path: [...groupPath, "word_limit"], message: `${group.type} requires a word limit` });
				}
				if (widget !== "text_gap" && widget !== "image_label" && group.word_limit !== undefined) {
					ctx.addIssue({ code: "custom", path: [...groupPath, "word_limit"], message: `${group.type} does not use a word limit` });
				}
				group.questions.forEach((question, questionIndex) => {
					const path: PropertyKey[] = [...groupPath, "questions", questionIndex];
					const numbers = question.covers ?? [question.n];
					const canonical = question.answer.map(normalizeAnswer);
					if (new Set(canonical).size !== canonical.length) {
						ctx.addIssue({ code: "custom", path: [...path, "answer"], message: "Canonical answers must be unique" });
					}
					if (widget === "checkbox_n") {
						if (!question.covers || question.marks !== numbers.length || question.answer.length !== numbers.length) {
							ctx.addIssue({
								code: "custom",
								path,
								message: "A multi-answer key needs equal covers, marks and canonical answers",
							});
						}
					} else if (question.covers || question.marks !== 1) {
						ctx.addIssue({ code: "custom", path, message: "A single-answer key covers and awards exactly one question" });
					}
					const textEntry = widget === "text_gap" || (widget === "image_label" && group.word_limit !== undefined);
					if (!textEntry && question.accepted_variants?.length) {
						ctx.addIssue({
							code: "custom",
							path: [...path, "accepted_variants"],
							message: "Choice questions do not use spelling variants",
						});
					}
					if (!textEntry && widget !== "checkbox_n" && question.answer.length !== 1) {
						ctx.addIssue({ code: "custom", path: [...path, "answer"], message: "A single-choice key has exactly one answer" });
					}
					for (const number of numbers) {
						if (used.has(number)) ctx.addIssue({ code: "custom", path: [...path, "n"], message: `Duplicate question ${number}` });
						if (number !== expected) {
							ctx.addIssue({ code: "custom", path: [...path, "n"], message: `Expected question ${expected}, found ${number}` });
						}
						used.add(number);
						expected = Math.max(expected, number + 1);
					}
				});
			});
		});
	});

export type AnswerKey = z.output<typeof answerKeySchema>;
export type GivenAnswer = string | readonly string[] | null | undefined;
export type GivenAnswers = Readonly<Record<number, GivenAnswer>>;

export type AnswerMark = {
	qNumber: number;
	sectionNo: number;
	questionType: QuestionType;
	isCorrect: boolean;
	marksAwarded: number;
};

export type BandScaleRow = {
	raw_min: number;
	raw_max: number;
	band: number | null;
};

export type BandResult = { band: number; belowBand: null } | { band: null; belowBand: number };

export type ScoredAttempt = BandResult & {
	rawScore: number;
	maxScore: number;
	marks: readonly AnswerMark[];
	sectionScores: readonly { sectionNo: number; rawScore: number; maxScore: number }[];
};

/** Exact comparison normalisation: Unicode, surrounding/internal whitespace and case only. */
export function normalizeAnswer(value: string): string {
	return value.normalize("NFKC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("en");
}

/** IELTS word count: letters/numbers joined by hyphens or apostrophes are one word. */
export function countWords(value: string): number {
	return value.match(/[\p{L}\p{N}]+(?:[.,'’‐‑‒–—-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

type KeyedQuestion = z.output<typeof keyedQuestionSchema>;

function wrongMarks(question: KeyedQuestion, sectionNo: number, questionType: QuestionType): AnswerMark[] {
	return (question.covers ?? [question.n]).map((qNumber) => ({
		qNumber,
		sectionNo,
		questionType,
		isCorrect: false,
		marksAwarded: 0,
	}));
}

/** Scores one authored control; multi-answer controls return one row per covered question. */
export function scoreQuestion(
	question: KeyedQuestion,
	questionType: QuestionType,
	sectionNo: number,
	wordLimit: number | undefined,
	given: GivenAnswer,
): AnswerMark[] {
	const widget = getQuestionTypeDefinition(questionType).widget;
	if (widget === "checkbox_n") {
		if (!Array.isArray(given) || given.length !== question.answer.length || given.some((value) => typeof value !== "string")) {
			return wrongMarks(question, sectionNo, questionType);
		}
		const selected = given.map(normalizeAnswer);
		if (new Set(selected).size !== selected.length) return wrongMarks(question, sectionNo, questionType);
		const selectedSet = new Set(selected);
		return (question.covers ?? [question.n]).map((qNumber, index) => {
			const correct = selectedSet.has(normalizeAnswer(question.answer[index]));
			return { qNumber, sectionNo, questionType, isCorrect: correct, marksAwarded: correct ? 1 : 0 };
		});
	}

	if (typeof given !== "string") return wrongMarks(question, sectionNo, questionType);
	if (wordLimit !== undefined && countWords(given) > wordLimit) return wrongMarks(question, sectionNo, questionType);
	const normalized = normalizeAnswer(given);
	const accepted = [...question.answer, ...(question.accepted_variants ?? [])].map(normalizeAnswer);
	const correct = normalized.length > 0 && accepted.includes(normalized);
	return [{ qNumber: question.n, sectionNo, questionType, isCorrect: correct, marksAwarded: correct ? 1 : 0 }];
}

/** Looks up a raw score in caller-supplied database rows; no chart is hardcoded. */
export function bandFor(rawScore: number, rows: readonly BandScaleRow[]): BandResult {
	if (!Number.isFinite(rawScore) || rawScore < 0) throw new RangeError("rawScore must be a non-negative number");
	const matches = rows.filter((row) => Number.isFinite(row.raw_min) && Number.isFinite(row.raw_max) && rawScore >= row.raw_min && rawScore <= row.raw_max);
	if (matches.length !== 1) throw new Error(`Band scale must contain exactly one row for raw score ${rawScore}`);
	const match = matches[0];
	if (match.band !== null) return { band: match.band, belowBand: null };
	const bands = rows.flatMap((row) => (row.band === null ? [] : [row.band]));
	if (!bands.length) throw new Error("Band scale has no numeric band to use as the below-band threshold");
	return { band: null, belowBand: Math.min(...bands) };
}

/** Scores a complete immutable answer key and returns DB-ready per-question facts. */
export function scoreAttempt(keyInput: unknown, answers: GivenAnswers, bandRows: readonly BandScaleRow[]): ScoredAttempt {
	const key = answerKeySchema.parse(keyInput);
	const controls = new Set<number>();
	for (const section of key.sections) {
		for (const group of section.question_groups) for (const question of group.questions) controls.add(question.n);
	}
	for (const rawNumber of Object.keys(answers)) {
		const number = Number(rawNumber);
		if (!Number.isInteger(number) || !controls.has(number)) throw new Error(`Answer supplied for unknown control ${rawNumber}`);
	}

	const marks: AnswerMark[] = [];
	const sectionScores = key.sections.map((section) => {
		const start = marks.length;
		for (const group of section.question_groups) {
			for (const question of group.questions) {
				marks.push(...scoreQuestion(question, group.type, section.n, group.word_limit, answers[question.n]));
			}
		}
		const sectionMarks = marks.slice(start);
		return {
			sectionNo: section.n,
			rawScore: sectionMarks.reduce((total, mark) => total + mark.marksAwarded, 0),
			maxScore: sectionMarks.length,
		};
	});
	const rawScore = sectionScores.reduce((total, section) => total + section.rawScore, 0);
	const maxScore = sectionScores.reduce((total, section) => total + section.maxScore, 0);
	return { rawScore, maxScore, marks, sectionScores, ...bandFor(rawScore, bandRows) };
}

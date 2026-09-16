import "server-only";

import { z } from "zod";

import { testUploadSchema } from "./test-upload.schema.ts";
import type { TestUpload } from "./test-upload.schema.ts";

const legacySectionSchema = z
	.object({
		n: z.number().int().positive(),
		title: z.string().trim().min(1),
		from: z.number().int().positive(),
		to: z.number().int().positive(),
	})
	.strict();

const legacyTextQuestionSchema = z
	.object({
		n: z.number().int().positive(),
		section: z.number().int().positive(),
		type: z.literal("text"),
		container: z.enum(["form", "note", "table"]),
		prompt: z.string().trim().min(1),
		answer: z.string().trim().min(1),
		hint: z.string().trim().min(1),
		accepted_variants: z.array(z.string().trim().min(1)).min(1).max(20).optional(),
	})
	.strict();

const legacyChoiceQuestionSchema = z
	.object({
		n: z.number().int().positive(),
		section: z.number().int().positive(),
		type: z.enum(["radio", "tfng", "match", "multi"]),
		prompt: z.string().trim().min(1),
		options: z.array(z.string().trim().min(1)).min(2),
		answer: z.string().trim().min(1),
	})
	.strict();

const legacyTestSchema = z
	.object({
		name: z.string().trim().min(1),
		skill: z.string().trim().min(1),
		mode: z.string().trim().min(1),
		minutes: z.number().int().positive(),
		sections: z.array(legacySectionSchema),
	})
	.strict();

const legacyQuestionsSchema = z.array(z.discriminatedUnion("type", [legacyTextQuestionSchema, legacyChoiceQuestionSchema]));

type LegacyQuestion = z.output<typeof legacyQuestionsSchema>[number];
type LegacyTextQuestion = z.output<typeof legacyTextQuestionSchema>;
type LegacyChoiceQuestion = z.output<typeof legacyChoiceQuestionSchema>;

export type LegacyListeningMedia = {
	audioFile: string;
	audioDurationSeconds: number;
	sectionEndsSeconds: readonly number[];
};

/**
 * The only phrasings a source paper may use to state its word limit. Scoring
 * enforces the limit before comparing, so an unrecognised instruction must stop
 * the conversion rather than fall back to a guessed number.
 */
const WORD_LIMITS: ReadonlyMap<string, number> = new Map([
	["one word only", 1],
	["no more than one word", 1],
	["no more than one word and/or a number", 1],
	["no more than two words", 2],
	["no more than two words and/or a number", 2],
	["no more than three words", 3],
	["no more than three words and/or a number", 3],
]);

const CONTAINER_TYPES = {
	form: { type: "form_completion", noun: "form" },
	note: { type: "note_completion", noun: "notes" },
	table: { type: "table_completion", noun: "table" },
} as const;

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** IELTS papers spell the count out in capitals ("Choose TWO letters, A-E"). */
const COUNT_WORDS = ["ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN"] as const;

function countWord(count: number): string {
	return COUNT_WORDS[count] ?? String(count);
}

function sourceError(message: string): never {
	throw new Error(`Legacy Listening source is invalid: ${message}`);
}

function withoutEmbeddedNumber(prompt: string, number: number): string {
	return prompt.replace(new RegExp(`<strong>\\s*${number}\\s*</strong>\\s*`, "iu"), "");
}

/** Reads the marking word limit out of a source paper's own instruction line. */
function wordLimitFrom(hint: string): number {
	const normalized = hint
		.toLocaleLowerCase("en")
		.replace(/\s+/gu, " ")
		.trim()
		.replace(/^write\s+/u, "")
		.replace(/\s*(for each answer|in each gap)\s*\.?$/u, "")
		.replace(/\.$/u, "")
		.trim();
	const limit = WORD_LIMITS.get(normalized);
	if (limit === undefined) sourceError(`unrecognised word limit instruction: "${hint}"`);
	return limit;
}

function sameOptions(left: readonly string[], right: readonly string[]): boolean {
	return left.length === right.length && left.every((option, index) => option === right[index]);
}

/**
 * Splits a section's questions into the longest runs that a single canonical
 * question group can hold. A run breaks whenever the control changes shape: a
 * different word limit or container, a different matching bank, or a different
 * multi-answer prompt all start a new group.
 */
function runsFor(questions: readonly LegacyQuestion[]): LegacyQuestion[][] {
	const runs: LegacyQuestion[][] = [];
	for (const question of questions) {
		const current = runs.at(-1);
		const previous = current?.at(-1);
		if (previous && continuesRun(previous, question)) current!.push(question);
		else runs.push([question]);
	}
	return runs;
}

function continuesRun(previous: LegacyQuestion, question: LegacyQuestion): boolean {
	if (previous.type !== question.type) return false;
	if (previous.type === "text" && question.type === "text") {
		return previous.container === question.container && previous.hint === question.hint;
	}
	if (previous.type === "match" && question.type === "match") {
		return sameOptions(previous.options, question.options);
	}
	if (previous.type === "multi" && question.type === "multi") {
		return previous.prompt === question.prompt && sameOptions(previous.options, question.options);
	}
	return previous.type === "radio" || previous.type === "tfng";
}

function textGroup(run: readonly LegacyTextQuestion[]) {
	const { container } = run[0];
	const { type, noun } = CONTAINER_TYPES[container];
	const wordLimit = wordLimitFrom(run[0].hint);
	return {
		type,
		widget: "text_gap" as const,
		container,
		instructions: `Complete the ${noun} below. ${run[0].hint}`,
		word_limit: wordLimit,
		questions: run.map((question) => ({
			n: question.n,
			prompt: withoutEmbeddedNumber(question.prompt, question.n),
			marks: 1,
			answer: [question.answer],
			...(question.accepted_variants ? { accepted_variants: [...question.accepted_variants] } : {}),
		})),
	};
}

function choiceGroup(run: readonly LegacyChoiceQuestion[]) {
	const isTrueFalse = run[0].type === "tfng";
	return {
		type: (isTrueFalse ? "identifying_information" : "mcq_single") as "identifying_information" | "mcq_single",
		widget: (isTrueFalse ? "segmented_3" : "radio") as "segmented_3" | "radio",
		instructions: isTrueFalse
			? "Choose TRUE, FALSE or NOT GIVEN."
			: `Choose the correct letter, ${LETTERS.slice(0, run[0].options.length).split("").join(", ")}.`,
		questions: run.map((question) => ({
			n: question.n,
			prompt: withoutEmbeddedNumber(question.prompt, question.n),
			options: question.options,
			marks: 1,
			answer: [question.answer],
		})),
	};
}

function matchingGroup(run: readonly LegacyChoiceQuestion[]) {
	const optionBank = run[0].options;
	return {
		type: "matching" as const,
		widget: "dropdown_bank" as const,
		instructions: `Choose ${countWord(run.length)} answer${run.length === 1 ? "" : "s"} from the list below and match them to the questions.`,
		option_bank: optionBank,
		questions: run.map((question) => ({
			n: question.n,
			prompt: withoutEmbeddedNumber(question.prompt, question.n),
			marks: 1,
			answer: [question.answer],
		})),
	};
}

/**
 * Folds a run of per-number source rows back into the one control a candidate
 * actually sees. The control covers every number in the run and is worth one
 * mark per number, which is what scoring expects for partial credit.
 */
function multiAnswerGroup(run: readonly LegacyChoiceQuestion[]) {
	if (run.length < 2) sourceError(`question ${run[0].n} is a multi-answer control covering only one number`);
	const lastLetter = LETTERS[run[0].options.length - 1];
	const answers = run.map((question) => question.answer);
	if (new Set(answers.map((answer) => answer.toLocaleLowerCase("en"))).size !== answers.length) {
		sourceError(`multi-answer control at question ${run[0].n} repeats an answer`);
	}
	return {
		type: "mcq_multi" as const,
		widget: "checkbox_n" as const,
		instructions: `Choose ${countWord(run.length)} letters, A-${lastLetter}.`,
		choose: run.length,
		questions: [
			{
				n: run[0].n,
				covers: run.map((question) => question.n),
				prompt: run[0].prompt,
				options: run[0].options,
				marks: run.length,
				answer: answers,
			},
		],
	};
}

function groupsFor(run: LegacyQuestion[]) {
	const [first] = run;
	if (first.type === "text") return textGroup(run as LegacyTextQuestion[]);
	if (first.type === "match") return matchingGroup(run as LegacyChoiceQuestion[]);
	if (first.type === "multi") return multiAnswerGroup(run as LegacyChoiceQuestion[]);
	return choiceGroup(run as LegacyChoiceQuestion[]);
}

/**
 * Converts the checked-in prototype's 40-question Listening data into the
 * canonical upload contract. Real audio duration and contiguous section ends
 * are mandatory because the legacy source contains neither and they must not
 * be guessed.
 */
export function buildLegacyListeningUpload(
	legacyTestInput: unknown,
	legacyQuestionsInput: unknown,
	media: LegacyListeningMedia,
): TestUpload {
	const legacyTest = legacyTestSchema.parse(legacyTestInput);
	const legacyQuestions = legacyQuestionsSchema.parse(legacyQuestionsInput);
	if (legacyTest.skill.toLocaleLowerCase("en") !== "listening") sourceError(`skill is ${legacyTest.skill}, not Listening`);
	if (legacyTest.mode.toLocaleLowerCase("en") !== "mock") sourceError(`mode is ${legacyTest.mode}, not mock`);
	if (legacyTest.sections.length !== 4) sourceError(`expected 4 sections, found ${legacyTest.sections.length}`);
	if (legacyQuestions.length !== 40) sourceError(`expected 40 questions, found ${legacyQuestions.length}`);
	if (!Number.isSafeInteger(media.audioDurationSeconds) || media.audioDurationSeconds <= 0) {
		sourceError("audio duration must be a positive whole number of seconds");
	}
	if (media.sectionEndsSeconds.length !== legacyTest.sections.length) {
		sourceError(`expected ${legacyTest.sections.length} section ends, found ${media.sectionEndsSeconds.length}`);
	}

	let priorEnd = 0;
	for (const [index, end] of media.sectionEndsSeconds.entries()) {
		if (!Number.isSafeInteger(end) || end <= priorEnd) sourceError(`section ${index + 1} end must be after ${priorEnd}`);
		priorEnd = end;
	}
	if (priorEnd !== media.audioDurationSeconds) sourceError("the final section end must equal the audio duration");

	const questions = new Map<number, LegacyQuestion>();
	legacyQuestions.forEach((question, index) => {
		const expectedNumber = index + 1;
		if (question.n !== expectedNumber) sourceError(`expected question ${expectedNumber}, found ${question.n}`);
		if (questions.has(question.n)) sourceError(`question ${question.n} is duplicated`);
		questions.set(question.n, question);
	});

	legacyTest.sections.forEach((section, index) => {
		const expectedNumber = index + 1;
		const expectedFrom = index * 10 + 1;
		const expectedTo = expectedFrom + 9;
		if (section.n !== expectedNumber || section.from !== expectedFrom || section.to !== expectedTo) {
			sourceError(`section ${expectedNumber} must cover questions ${expectedFrom}-${expectedTo}`);
		}
		for (let number = section.from; number <= section.to; number++) {
			if (questions.get(number)?.section !== section.n) sourceError(`question ${number} is assigned to the wrong section`);
		}
	});

	let startsAt = 0;
	const sections = legacyTest.sections.map((section, index) => {
		const endsAt = media.sectionEndsSeconds[index];
		const sectionQuestions: LegacyQuestion[] = [];
		for (let number = section.from; number <= section.to; number++) sectionQuestions.push(questions.get(number)!);
		const converted = {
			n: section.n,
			title: section.title,
			starts_at_seconds: startsAt,
			ends_at_seconds: endsAt,
			passages: [],
			question_groups: runsFor(sectionQuestions).map(groupsFor),
		};
		startsAt = endsAt;
		return converted;
	});

	return testUploadSchema.parse({
		schema_version: 1,
		title: legacyTest.name,
		skill: "listening",
		variant: "n_a",
		difficulty: "medium",
		duration_seconds: Math.max(legacyTest.minutes * 60, media.audioDurationSeconds),
		transfer_seconds: 120,
		kind: "mock",
		tags: ["legacy-prototype", "listening"],
		audio: { file: media.audioFile, duration_seconds: media.audioDurationSeconds },
		assets: [],
		sections,
	});
}

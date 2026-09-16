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
		prompt: z.string().trim().min(1),
		answer: z.string().trim().min(1),
		hint: z.string().trim().min(1),
	})
	.strict();

const legacyChoiceQuestionSchema = z
	.object({
		n: z.number().int().positive(),
		section: z.number().int().positive(),
		type: z.enum(["radio", "tfng", "match"]),
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

function sourceError(message: string): never {
	throw new Error(`Legacy Listening source is invalid: ${message}`);
}

function withoutEmbeddedNumber(prompt: string, number: number): string {
	return prompt.replace(new RegExp(`<strong>\\s*${number}\\s*</strong>\\s*`, "iu"), "");
}

function textAlternatives(answer: string): readonly string[] | undefined {
	const withoutFinalPeriod = answer.endsWith(".") ? answer.slice(0, -1).trim() : answer;
	return withoutFinalPeriod && withoutFinalPeriod !== answer ? [withoutFinalPeriod] : undefined;
}

function requireQuestion(
	questions: ReadonlyMap<number, LegacyQuestion>,
	number: number,
	types: readonly LegacyQuestion["type"][],
): LegacyQuestion {
	const question = questions.get(number);
	if (!question) sourceError(`question ${number} is missing`);
	if (!types.includes(question.type)) sourceError(`question ${number} has type ${question.type}; expected ${types.join(" or ")}`);
	return question;
}

function textGroup(
	questions: ReadonlyMap<number, LegacyQuestion>,
	type: "form_completion" | "note_completion",
	container: "form" | "note",
	numbers: readonly number[],
) {
	return {
		type,
		widget: "text_gap" as const,
		container,
		instructions: "Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
		word_limit: 2,
		questions: numbers.map((number) => {
			const question = requireQuestion(questions, number, ["text"]) as LegacyTextQuestion;
			const accepted = textAlternatives(question.answer);
			return {
				n: question.n,
				prompt: withoutEmbeddedNumber(question.prompt, question.n),
				marks: 1,
				answer: [question.answer],
				...(accepted ? { accepted_variants: [...accepted] } : {}),
			};
		}),
	};
}

function choiceGroup(questions: ReadonlyMap<number, LegacyQuestion>, numbers: readonly number[]) {
	return {
		type: "mcq_single" as const,
		widget: "radio" as const,
		instructions: "Choose the correct answer.",
		questions: numbers.map((number) => {
			const question = requireQuestion(questions, number, ["radio", "tfng"]) as LegacyChoiceQuestion;
			return {
				n: question.n,
				prompt: withoutEmbeddedNumber(question.prompt, question.n),
				options: question.options,
				marks: 1,
				answer: [question.answer],
			};
		}),
	};
}

function matchingGroup(questions: ReadonlyMap<number, LegacyQuestion>, numbers: readonly number[]) {
	const source = numbers.map((number) => requireQuestion(questions, number, ["match"]) as LegacyChoiceQuestion);
	const optionBank = source[0]?.options;
	if (!optionBank) sourceError("matching group has no option bank");
	for (const question of source.slice(1)) {
		if (JSON.stringify(question.options) !== JSON.stringify(optionBank)) {
			sourceError(`question ${question.n} does not share its matching option bank`);
		}
	}
	return {
		type: "matching" as const,
		widget: "dropdown_bank" as const,
		instructions: "Match each item to the correct option.",
		option_bank: optionBank,
		questions: source.map((question) => ({
			n: question.n,
			prompt: withoutEmbeddedNumber(question.prompt, question.n),
			marks: 1,
			answer: [question.answer],
		})),
	};
}

function groupsForSection(section: number, questions: ReadonlyMap<number, LegacyQuestion>) {
	if (section === 1) {
		return [
			textGroup(questions, "form_completion", "form", [1, 2, 3, 4, 5, 6, 7]),
			choiceGroup(questions, [8, 9]),
			textGroup(questions, "form_completion", "form", [10]),
		];
	}
	if (section === 2) {
		return [
			textGroup(questions, "note_completion", "note", [11, 12, 13]),
			choiceGroup(questions, [14, 15, 16]),
			matchingGroup(questions, [17, 18, 19]),
			textGroup(questions, "note_completion", "note", [20]),
		];
	}
	if (section === 3) {
		return [
			choiceGroup(questions, [21, 22, 23, 24]),
			textGroup(questions, "note_completion", "note", [25, 26, 27]),
			matchingGroup(questions, [28, 29, 30]),
		];
	}
	if (section === 4) {
		return [
			choiceGroup(questions, [31, 32, 33, 34, 35]),
			textGroup(questions, "note_completion", "note", [36, 37, 38]),
			choiceGroup(questions, [39, 40]),
		];
	}
	return sourceError(`unexpected section ${section}`);
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
		const converted = {
			n: section.n,
			title: section.title,
			starts_at_seconds: startsAt,
			ends_at_seconds: endsAt,
			passages: [],
			question_groups: groupsForSection(section.n, questions),
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
		duration_seconds: legacyTest.minutes * 60,
		transfer_seconds: 120,
		kind: "mock",
		tags: ["legacy-prototype", "listening-mock-2"],
		audio: { file: media.audioFile, duration_seconds: media.audioDurationSeconds },
		assets: [],
		sections,
	});
}

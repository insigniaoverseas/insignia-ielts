import { z } from "zod";

import { CONTAINER_KEYS, QUESTION_TYPE_KEYS, WIDGET_KEYS } from "./question-types.ts";
import type { AttemptSection, QuestionGroup } from "./view-models/attempt.ts";

/**
 * Reads a test's private `content.json` into the player's view-model.
 *
 * `content.json` is what `prepareTestImport` wrote: the upload with every
 * answer, accepted variant, mark and word limit already stripped out. This
 * module never sees `key.json` and has no field to put an answer in — the
 * schema below is strict, so a content file that somehow carried `answer`
 * fails to parse instead of being passed on to a browser.
 *
 * Pure: no R2, no Supabase. The caller reads the object and supplies the URL
 * each image should be served from.
 */

const optionList = z.array(z.string()).min(1);

const contentQuestionSchema = z
	.object({
		n: z.number().int().positive(),
		covers: z.array(z.number().int().positive()).optional(),
		prompt: z.string(),
		options: optionList.optional(),
	})
	.strict();

const contentGroupSchema = z
	.object({
		type: z.enum(QUESTION_TYPE_KEYS),
		widget: z.enum(WIDGET_KEYS),
		container: z.enum(CONTAINER_KEYS).optional(),
		instructions: z.string(),
		word_bank: optionList.optional(),
		option_bank: optionList.optional(),
		choose: z.number().int().min(2).optional(),
		asset_id: z.string().optional(),
		questions: z.array(contentQuestionSchema).min(1),
	})
	.strict();

const contentSectionSchema = z
	.object({
		n: z.number().int().positive(),
		title: z.string(),
		starts_at_seconds: z.number().optional(),
		ends_at_seconds: z.number().optional(),
		passages: z.array(z.object({ title: z.string(), html: z.string() }).strict()),
		question_groups: z.array(contentGroupSchema).min(1),
	})
	.strict();

/** The browser-safe half of an imported test, exactly as `content.json` stores it. */
export const testContentSchema = z
	.object({
		schema_version: z.literal(1),
		test_id: z.string(),
		content_version: z.number().int().positive(),
		title: z.string(),
		skill: z.enum(["listening", "reading"]),
		variant: z.enum(["academic", "general", "n_a"]),
		difficulty: z.enum(["easy", "medium", "hard"]),
		duration_seconds: z.number().int().positive(),
		transfer_seconds: z.number().int().nonnegative(),
		kind: z.enum(["mock", "class", "practice"]),
		practice_question_type: z.enum(QUESTION_TYPE_KEYS).optional(),
		tags: z.array(z.string()),
		audio: z.object({ duration_seconds: z.number().positive() }).strict().optional(),
		assets: z.array(z.object({ id: z.string(), alt: z.string(), ordinal: z.number().int().positive() }).strict()),
		sections: z.array(contentSectionSchema).min(1),
	})
	.strict();

/** A parsed `content.json`. */
export type TestContent = z.output<typeof testContentSchema>;

/** One labelling image, by its position in `assets[]` — the number its R2 key carries. */
export type ContentAsset = TestContent["assets"][number];

const TRUE_FALSE = ["True", "False", "Not Given"];
const YES_NO = ["Yes", "No", "Not Given"];

const asBank = (values: readonly string[]) => values.map((value) => ({ value, label: value }));

/** "Questions 1–5", or "Question 7" for a group of one. */
function heading(first: number, last: number): string {
	return first === last ? `Question ${first}` : `Questions ${first}–${last}`;
}

/** The answer choices a group offers, in the strings scoring compares against. */
function bankFor(group: TestContent["sections"][number]["question_groups"][number]): QuestionGroup["bank"] {
	if (group.type === "identifying_information") return asBank(TRUE_FALSE);
	if (group.type === "identifying_views_claims") return asBank(YES_NO);
	if (group.word_bank) return asBank(group.word_bank);
	if (group.option_bank) return asBank(group.option_bank);
	return undefined;
}

/**
 * Converts parsed content into the player's sections.
 *
 * Question ids are `q{n}` — the first number a control answers — so they stay
 * stable across content versions that only reword a prompt.
 *
 * @param assetUrl Where the browser should fetch a labelling image from. It is
 *   called once per image group, with that group's asset.
 * @throws Error when a group names an asset the content does not list.
 */
export function toAttemptSections(content: TestContent, assetUrl: (asset: ContentAsset) => string): AttemptSection[] {
	const assets = new Map(content.assets.map((asset) => [asset.id, asset]));
	return content.sections.map((section) => ({
		number: section.n,
		label: `${content.skill === "listening" ? "Section" : "Passage"} ${section.n}`,
		passages: section.passages,
		groups: section.question_groups.map((group, groupIndex): QuestionGroup => {
			const numbers = group.questions.flatMap((question) => question.covers ?? [question.n]);
			let image: QuestionGroup["image"];
			if (group.asset_id !== undefined) {
				const asset = assets.get(group.asset_id);
				if (!asset) throw new Error(`Section ${section.n} group ${groupIndex + 1} names a missing asset`);
				image = { url: assetUrl(asset), alt: asset.alt };
			}
			return {
				id: `s${section.n}-g${groupIndex + 1}`,
				heading: heading(Math.min(...numbers), Math.max(...numbers)),
				instructionHtml: group.instructions,
				widget: group.widget,
				container: group.container ?? "plain",
				bank: bankFor(group),
				...(group.choose === undefined ? {} : { choose: group.choose }),
				...(image === undefined ? {} : { image }),
				questions: group.questions.map((question) => ({
					id: `q${question.n}`,
					number: question.n,
					...(question.covers === undefined ? {} : { covers: question.covers }),
					promptHtml: question.prompt,
					...(question.options === undefined ? {} : { options: asBank(question.options) }),
					// The word limit is key-only; every group's instruction states it.
					hint: "",
				})),
			};
		}),
	}));
}

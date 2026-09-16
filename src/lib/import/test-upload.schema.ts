import { z } from "zod";

import {
	CONTAINER_KEYS,
	QUESTION_TYPE_KEYS,
	WIDGET_KEYS,
	getQuestionTypeDefinition,
	isTypeAllowed,
} from "../question-types.ts";

const MAX_PASSAGE_HTML_LENGTH = 200_000;
const identifierSchema = z
	.string()
	.trim()
	.min(1)
	.max(80)
	.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens");
const shortTextSchema = z.string().trim().min(1).max(500);
const authoredHtmlSchema = z.string().trim().min(1).max(50_000);
const answerSchema = z.string().trim().min(1).max(500);
const questionTypeSchema = z.enum(QUESTION_TYPE_KEYS);
const widgetSchema = z.enum(WIDGET_KEYS);
const containerSchema = z.enum(CONTAINER_KEYS);

const uniqueStrings = (values: readonly string[]) =>
	new Set(values.map((value) => value.trim().toLocaleLowerCase("en"))).size === values.length;

const safeFileNameSchema = z
	.string()
	.trim()
	.min(1)
	.max(255)
	.refine(
		(file) => !file.includes("/") && !file.includes("\\") && file !== "." && file !== "..",
		"Use a file name only; directories and traversal are not allowed",
	);

const optionListSchema = z
	.array(shortTextSchema)
	.min(2)
	.max(100)
	.refine(uniqueStrings, "Options must be unique (ignoring case)");

const passageSchema = z
	.object({
		title: z.string().trim().min(1).max(300),
		html: z.string().trim().min(1).max(MAX_PASSAGE_HTML_LENGTH),
	})
	.strict();

const questionSchema = z
	.object({
		n: z.number().int().positive().max(10_000),
		covers: z
			.array(z.number().int().positive().max(10_000))
			.min(2)
			.max(10)
			.refine((numbers) => new Set(numbers).size === numbers.length, "Covered question numbers must be unique")
			.optional(),
		prompt: authoredHtmlSchema,
		options: optionListSchema.optional(),
		marks: z.number().int().positive().max(10),
		answer: z.array(answerSchema).min(1).max(10),
		accepted_variants: z
			.array(answerSchema)
			.max(20)
			.refine(uniqueStrings, "Accepted variants must be unique (ignoring case)")
			.optional(),
	})
	.strict();

const questionGroupSchema = z
	.object({
		type: questionTypeSchema,
		widget: widgetSchema,
		container: containerSchema.optional(),
		instructions: authoredHtmlSchema,
		word_limit: z.number().int().positive().max(20).optional(),
		word_bank: optionListSchema.optional(),
		option_bank: optionListSchema.optional(),
		choose: z.number().int().min(2).max(10).optional(),
		asset_id: identifierSchema.optional(),
		questions: z.array(questionSchema).min(1).max(100),
	})
	.strict()
	.superRefine((group, ctx) => {
		const definition = getQuestionTypeDefinition(group.type);
		if (group.widget !== definition.widget) {
			ctx.addIssue({
				code: "custom",
				path: ["widget"],
				message: `${group.type} must use widget ${definition.widget}`,
			});
		}

		if (definition.container === null && group.container !== undefined) {
			ctx.addIssue({
				code: "custom",
				path: ["container"],
				message: `${group.type} does not use a completion container`,
			});
		} else if (definition.container !== null && group.container !== definition.container) {
			ctx.addIssue({
				code: "custom",
				path: ["container"],
				message: `${group.type} must use container ${definition.container}`,
			});
		}

		const needsTextLimit = group.widget === "text_gap" || (group.widget === "image_label" && !group.option_bank);
		if (needsTextLimit && group.word_limit === undefined) {
			ctx.addIssue({ code: "custom", path: ["word_limit"], message: "A text-entry group requires word_limit" });
		} else if (!needsTextLimit && group.word_limit !== undefined) {
			ctx.addIssue({ code: "custom", path: ["word_limit"], message: `${group.widget} does not use word_limit` });
		}

		if (group.type !== "summary_completion" && group.word_bank !== undefined) {
			ctx.addIssue({
				code: "custom",
				path: ["word_bank"],
				message: "Only summary_completion may define a word_bank",
			});
		}

		if (group.widget === "dropdown_bank" && group.option_bank === undefined) {
			ctx.addIssue({ code: "custom", path: ["option_bank"], message: "A matching group requires option_bank" });
		} else if (!["dropdown_bank", "image_label"].includes(group.widget) && group.option_bank !== undefined) {
			ctx.addIssue({ code: "custom", path: ["option_bank"], message: `${group.widget} does not use option_bank` });
		}

		if (group.widget === "checkbox_n" && group.choose === undefined) {
			ctx.addIssue({ code: "custom", path: ["choose"], message: "A multiple-answer group requires choose" });
		} else if (group.widget !== "checkbox_n" && group.choose !== undefined) {
			ctx.addIssue({ code: "custom", path: ["choose"], message: `${group.widget} does not use choose` });
		}

		if (group.widget === "image_label" && group.asset_id === undefined) {
			ctx.addIssue({ code: "custom", path: ["asset_id"], message: "An image-label group requires asset_id" });
		} else if (group.widget !== "image_label" && group.asset_id !== undefined) {
			ctx.addIssue({ code: "custom", path: ["asset_id"], message: `${group.widget} does not use asset_id` });
		}

		const segmentedAnswers =
			group.type === "identifying_information"
				? ["true", "false", "not given"]
				: group.type === "identifying_views_claims"
					? ["yes", "no", "not given"]
					: null;

		group.questions.forEach((question, questionIndex) => {
			const path = ["questions", questionIndex] as const;
			const isChoice = group.widget === "radio" || group.widget === "checkbox_n";
			if (isChoice && question.options === undefined) {
				ctx.addIssue({ code: "custom", path: [...path, "options"], message: `${group.widget} requires question options` });
			} else if (!isChoice && question.options !== undefined) {
				ctx.addIssue({ code: "custom", path: [...path, "options"], message: `${group.widget} does not use question options` });
			}

			if (group.widget === "checkbox_n") {
				const choose = group.choose;
				if (choose !== undefined && question.options !== undefined && question.options.length < choose) {
					ctx.addIssue({
						code: "custom",
						path: [...path, "options"],
						message: `choose is ${choose}, but this question has only ${question.options.length} options`,
					});
				}
				if (choose !== undefined && question.answer.length !== choose) {
					ctx.addIssue({
						code: "custom",
						path: [...path, "answer"],
						message: `A choose-${choose} question requires exactly ${choose} answers`,
					});
				}
				if (choose !== undefined && question.covers?.length !== choose) {
					ctx.addIssue({
						code: "custom",
						path: [...path, "covers"],
						message: `A choose-${choose} question must cover exactly ${choose} question numbers`,
					});
				}
			} else if (question.covers !== undefined) {
				ctx.addIssue({
					code: "custom",
					path: [...path, "covers"],
					message: "Only checkbox_n questions may cover more than one question number",
				});
			}

			const coveredNumbers = question.covers ?? [question.n];
			if (question.covers !== undefined) {
				if (question.covers[0] !== question.n) {
					ctx.addIssue({ code: "custom", path: [...path, "covers", 0], message: "covers must start with n" });
				}
				question.covers.forEach((number, index) => {
					if (number !== question.n + index) {
						ctx.addIssue({
							code: "custom",
							path: [...path, "covers", index],
							message: "Covered question numbers must be consecutive",
						});
					}
				});
			}
			if (question.marks !== coveredNumbers.length) {
				ctx.addIssue({
					code: "custom",
					path: [...path, "marks"],
					message: `marks must equal the ${coveredNumbers.length} question number(s) this control covers`,
				});
			}

			if (group.widget !== "checkbox_n" && ["radio", "segmented_3", "dropdown_bank", "image_label"].includes(group.widget) && question.answer.length !== 1) {
				ctx.addIssue({
					code: "custom",
					path: [...path, "answer"],
					message: `${group.widget} requires exactly one canonical answer per question`,
				});
			}

			const allowedAnswers = question.options ?? group.option_bank ?? group.word_bank;
			if (allowedAnswers !== undefined) {
				const normalized = new Set(allowedAnswers.map((answer) => answer.toLocaleLowerCase("en")));
				question.answer.forEach((answer, answerIndex) => {
					if (!normalized.has(answer.toLocaleLowerCase("en"))) {
						ctx.addIssue({
							code: "custom",
							path: [...path, "answer", answerIndex],
							message: "Answer must exist in the question options or group bank",
						});
					}
				});
			}

			if (segmentedAnswers !== null) {
				question.answer.forEach((answer, answerIndex) => {
					if (!segmentedAnswers.includes(answer.toLocaleLowerCase("en"))) {
						ctx.addIssue({
							code: "custom",
							path: [...path, "answer", answerIndex],
							message: `Answer must be one of: ${segmentedAnswers.join(", ")}`,
						});
					}
				});
			}
		});
	});

const sectionSchema = z
	.object({
		n: z.number().int().positive().max(100),
		title: z.string().trim().min(1).max(300),
		starts_at_seconds: z.number().int().nonnegative().max(14_400).optional(),
		ends_at_seconds: z.number().int().positive().max(14_400).optional(),
		passages: z.array(passageSchema).max(3),
		question_groups: z.array(questionGroupSchema).min(1).max(50),
	})
	.strict()
	.superRefine((section, ctx) => {
		if (
			section.starts_at_seconds !== undefined &&
			section.ends_at_seconds !== undefined &&
			section.ends_at_seconds <= section.starts_at_seconds
		) {
			ctx.addIssue({
				code: "custom",
				path: ["ends_at_seconds"],
				message: "ends_at_seconds must be greater than starts_at_seconds",
			});
		}
	});

const assetSchema = z
	.object({
		id: identifierSchema,
		file: safeFileNameSchema.regex(/\.(?:png|jpe?g|webp)$/i, "Assets must be PNG, JPEG or WebP images"),
		alt: z.string().trim().min(1).max(500),
	})
	.strict();

const audioSchema = z
	.object({
		file: safeFileNameSchema.regex(/\.mp3$/i, "The single Listening audio file must be MP3"),
		duration_seconds: z.number().int().positive().max(14_400),
	})
	.strict();

const transcriptCueSchema = z
	.object({
		at_seconds: z.number().nonnegative().max(14_400),
		speaker: z.string().trim().min(1).max(100),
		text: z.string().trim().min(1).max(10_000),
	})
	.strict();

/**
 * Version-one authoring payload for an IELTS Listening or Reading test.
 *
 * The inferred output type is {@link TestUpload}; do not hand-write a parallel
 * interface. Objects are strict so misspelled security-sensitive fields such
 * as `answer` are errors rather than silently discarded data.
 */
export const testUploadSchema = z
	.object({
		schema_version: z.literal(1),
		title: z.string().trim().min(1).max(300),
		skill: z.enum(["listening", "reading"]),
		variant: z.enum(["academic", "general", "n_a"]),
		difficulty: z.enum(["easy", "medium", "hard"]),
		duration_seconds: z.number().int().positive().max(14_400),
		transfer_seconds: z.number().int().nonnegative().max(3_600),
		kind: z.enum(["mock", "class", "practice"]),
		practice_question_type: questionTypeSchema.optional(),
		tags: z
			.array(identifierSchema)
			.max(30)
			.refine(uniqueStrings, "Tags must be unique (ignoring case)"),
		audio: audioSchema.optional(),
		assets: z.array(assetSchema).max(100),
		sections: z.array(sectionSchema).min(1).max(20),
		transcript: z.array(transcriptCueSchema).max(10_000).optional(),
	})
	.strict()
	.superRefine((test, ctx) => {
		if (test.skill === "listening") {
			if (test.variant !== "n_a") {
				ctx.addIssue({ code: "custom", path: ["variant"], message: "Listening must use variant n_a" });
			}
			if (test.audio === undefined) {
				ctx.addIssue({ code: "custom", path: ["audio"], message: "Listening requires one MP3 audio file" });
			}
		} else {
			if (test.variant === "n_a") {
				ctx.addIssue({ code: "custom", path: ["variant"], message: "Reading must use academic or general" });
			}
			if (test.audio !== undefined) {
				ctx.addIssue({ code: "custom", path: ["audio"], message: "Reading must not include audio" });
			}
			if (test.transfer_seconds !== 0) {
				ctx.addIssue({ code: "custom", path: ["transfer_seconds"], message: "Reading has no transfer time" });
			}
			if (test.transcript !== undefined && test.transcript.length > 0) {
				ctx.addIssue({ code: "custom", path: ["transcript"], message: "Reading must not include a transcript" });
			}
		}

		if (test.kind === "practice" && test.practice_question_type === undefined) {
			ctx.addIssue({
				code: "custom",
				path: ["practice_question_type"],
				message: "A practice set requires practice_question_type",
			});
		} else if (test.kind !== "practice" && test.practice_question_type !== undefined) {
			ctx.addIssue({
				code: "custom",
				path: ["practice_question_type"],
				message: "Only a practice set may define practice_question_type",
			});
		}

		const assetIds = new Set<string>();
		const assetFiles = new Set<string>();
		test.assets.forEach((asset, assetIndex) => {
			if (assetIds.has(asset.id)) {
				ctx.addIssue({ code: "custom", path: ["assets", assetIndex, "id"], message: `Duplicate asset id: ${asset.id}` });
			}
			assetIds.add(asset.id);
			const file = asset.file.toLocaleLowerCase("en");
			if (assetFiles.has(file)) {
				ctx.addIssue({ code: "custom", path: ["assets", assetIndex, "file"], message: `Duplicate asset file: ${asset.file}` });
			}
			assetFiles.add(file);
		});

		const usedQuestionNumbers = new Set<number>();
		let expectedQuestionNumber = 1;
		let priorSectionEnd = -1;
		test.sections.forEach((section, sectionIndex) => {
			if (section.n !== sectionIndex + 1) {
				ctx.addIssue({
					code: "custom",
					path: ["sections", sectionIndex, "n"],
					message: `Sections must be numbered in order; expected ${sectionIndex + 1}`,
				});
			}

			if (test.skill === "listening") {
				if (section.passages.length !== 0) {
					ctx.addIssue({ code: "custom", path: ["sections", sectionIndex, "passages"], message: "Listening sections must not contain passages" });
				}
				if (section.starts_at_seconds === undefined) {
					ctx.addIssue({ code: "custom", path: ["sections", sectionIndex, "starts_at_seconds"], message: "Listening sections require starts_at_seconds" });
				}
				if (section.ends_at_seconds === undefined) {
					ctx.addIssue({ code: "custom", path: ["sections", sectionIndex, "ends_at_seconds"], message: "Listening sections require ends_at_seconds" });
				}
				if (section.starts_at_seconds !== undefined && section.starts_at_seconds < priorSectionEnd) {
					ctx.addIssue({ code: "custom", path: ["sections", sectionIndex, "starts_at_seconds"], message: "Listening section markers must not overlap" });
				}
				if (section.ends_at_seconds !== undefined) {
					priorSectionEnd = section.ends_at_seconds;
					if (test.audio !== undefined && section.ends_at_seconds > test.audio.duration_seconds) {
						ctx.addIssue({ code: "custom", path: ["sections", sectionIndex, "ends_at_seconds"], message: "Section marker exceeds the audio duration" });
					}
				}
			} else {
				if (section.starts_at_seconds !== undefined || section.ends_at_seconds !== undefined) {
					ctx.addIssue({ code: "custom", path: ["sections", sectionIndex], message: "Reading sections must not contain audio markers" });
				}
				if (section.passages.length === 0) {
					ctx.addIssue({ code: "custom", path: ["sections", sectionIndex, "passages"], message: "Reading sections require at least one passage" });
				}
				if (test.variant === "academic" && section.passages.length !== 1) {
					ctx.addIssue({ code: "custom", path: ["sections", sectionIndex, "passages"], message: "Academic Reading has exactly one passage per section" });
				}
			}

			section.question_groups.forEach((group, groupIndex) => {
				const groupPath = ["sections", sectionIndex, "question_groups", groupIndex] as const;
				const availability = isTypeAllowed(group.type, test.skill, test.variant);
				if (availability === "disallowed") {
					ctx.addIssue({
						code: "custom",
						path: [...groupPath, "type"],
						message: `${group.type} is not available for ${test.skill}/${test.variant}`,
					});
				}
				if (test.kind === "practice" && test.practice_question_type !== undefined && group.type !== test.practice_question_type) {
					ctx.addIssue({
						code: "custom",
						path: [...groupPath, "type"],
						message: `A practice set may contain only ${test.practice_question_type}`,
					});
				}
				if (group.asset_id !== undefined && !assetIds.has(group.asset_id)) {
					ctx.addIssue({
						code: "custom",
						path: [...groupPath, "asset_id"],
						message: `Unknown asset id: ${group.asset_id}`,
					});
				}

				group.questions.forEach((question, questionIndex) => {
					const questionPath = [...groupPath, "questions", questionIndex] as const;
					const numbers = question.covers ?? [question.n];
					for (const number of numbers) {
						if (usedQuestionNumbers.has(number)) {
							ctx.addIssue({ code: "custom", path: [...questionPath, "n"], message: `Question number ${number} is duplicated` });
						}
						if (number !== expectedQuestionNumber) {
							ctx.addIssue({
								code: "custom",
								path: [...questionPath, "n"],
								message: `Question numbers must be contiguous; expected ${expectedQuestionNumber}, found ${number}`,
							});
						}
						usedQuestionNumbers.add(number);
						expectedQuestionNumber = Math.max(expectedQuestionNumber, number + 1);
					}
				});
			});
		});

		if (test.audio !== undefined && test.transcript !== undefined) {
			let priorCue = -1;
			test.transcript.forEach((cue, cueIndex) => {
				if (cue.at_seconds < priorCue) {
					ctx.addIssue({ code: "custom", path: ["transcript", cueIndex, "at_seconds"], message: "Transcript cues must be in time order" });
				}
				if (cue.at_seconds > test.audio!.duration_seconds) {
					ctx.addIssue({ code: "custom", path: ["transcript", cueIndex, "at_seconds"], message: "Transcript cue exceeds the audio duration" });
				}
				priorCue = cue.at_seconds;
			});
		}
	});

/** The validated and normalised upload type inferred from {@link testUploadSchema}. */
export type TestUpload = z.output<typeof testUploadSchema>;

/** The accepted input type inferred from {@link testUploadSchema}. */
export type TestUploadInput = z.input<typeof testUploadSchema>;

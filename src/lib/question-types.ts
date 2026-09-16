/**
 * The canonical IELTS Listening and Reading question-type taxonomy.
 *
 * Upload validation, authoring, the player and scoring all consume this file;
 * none of them should keep a second question-type matrix. The definitions are
 * transcribed from `MVP-1.md` §10 (D12).
 */

/** The six answer controls used by all supported question types. */
export const WIDGET_KEYS = [
	"radio",
	"checkbox_n",
	"segmented_3",
	"dropdown_bank",
	"text_gap",
	"image_label",
] as const;

/** One of {@link WIDGET_KEYS}. */
export type WidgetKey = (typeof WIDGET_KEYS)[number];

/** Layouts used around completion inputs; non-completion types have no container. */
export const CONTAINER_KEYS = [
	"form",
	"note",
	"table",
	"flow_chart",
	"summary",
	"sentence",
	"plain",
] as const;

/** One of {@link CONTAINER_KEYS}. */
export type ContainerKey = (typeof CONTAINER_KEYS)[number];

/**
 * Whether a type belongs to an official IELTS format.
 *
 * `warning` is intentionally distinct from `allowed`: IELTS's official
 * General Training list omits Y/N/NG and matching sentence endings, but the
 * authoring UI permits a teacher to override that omission after a warning.
 */
export const QUESTION_TYPE_AVAILABILITIES = ["allowed", "warning", "disallowed"] as const;

/** One of {@link QUESTION_TYPE_AVAILABILITIES}. */
export type QuestionTypeAvailability = (typeof QUESTION_TYPE_AVAILABILITIES)[number];

/** The two skills supported by this question taxonomy. */
export type QuestionSkill = "listening" | "reading";

/** Database variant values relevant to Listening and Reading. */
export type QuestionVariant = "n_a" | "academic" | "general";

type FormatKey = "listening" | "academic_reading" | "general_training_reading";

type QuestionTypeDefinitionShape = {
	officialName: string;
	widget: WidgetKey;
	container: ContainerKey | null;
	availability: Readonly<Record<FormatKey, QuestionTypeAvailability>>;
};

const availability = (
	listening: QuestionTypeAvailability,
	academicReading: QuestionTypeAvailability,
	generalTrainingReading: QuestionTypeAvailability,
) => ({
	listening,
	academic_reading: academicReading,
	general_training_reading: generalTrainingReading,
});

/**
 * The 18 canonical IELTS question types from `MVP-1.md` §10.
 *
 * Keys are persisted in content JSON, `tests.practice_question_type` and
 * `answer_marks.question_type`; changing one is therefore a data migration,
 * not a display-only edit.
 */
export const QUESTION_TYPES = {
	mcq_single: {
		officialName: "Multiple choice",
		widget: "radio",
		container: null,
		availability: availability("allowed", "allowed", "allowed"),
	},
	mcq_multi: {
		officialName: "Multiple choice (choose N)",
		widget: "checkbox_n",
		container: null,
		availability: availability("allowed", "allowed", "allowed"),
	},
	identifying_information: {
		officialName: "Identifying information (T/F/NG)",
		widget: "segmented_3",
		container: null,
		availability: availability("disallowed", "allowed", "allowed"),
	},
	identifying_views_claims: {
		officialName: "Identifying writer's views/claims (Y/N/NG)",
		widget: "segmented_3",
		container: null,
		availability: availability("disallowed", "allowed", "warning"),
	},
	matching: {
		officialName: "Matching",
		widget: "dropdown_bank",
		container: null,
		availability: availability("allowed", "disallowed", "disallowed"),
	},
	matching_information: {
		officialName: "Matching information",
		widget: "dropdown_bank",
		container: null,
		availability: availability("disallowed", "allowed", "allowed"),
	},
	matching_headings: {
		officialName: "Matching headings",
		widget: "dropdown_bank",
		container: null,
		availability: availability("disallowed", "allowed", "allowed"),
	},
	matching_features: {
		officialName: "Matching features",
		widget: "dropdown_bank",
		container: null,
		availability: availability("disallowed", "allowed", "allowed"),
	},
	matching_sentence_endings: {
		officialName: "Matching sentence endings",
		widget: "dropdown_bank",
		container: null,
		availability: availability("disallowed", "allowed", "warning"),
	},
	form_completion: {
		officialName: "Form completion",
		widget: "text_gap",
		container: "form",
		availability: availability("allowed", "disallowed", "disallowed"),
	},
	note_completion: {
		officialName: "Note completion",
		widget: "text_gap",
		container: "note",
		availability: availability("allowed", "allowed", "allowed"),
	},
	table_completion: {
		officialName: "Table completion",
		widget: "text_gap",
		container: "table",
		availability: availability("allowed", "allowed", "allowed"),
	},
	flow_chart_completion: {
		officialName: "Flow-chart completion",
		widget: "text_gap",
		container: "flow_chart",
		availability: availability("allowed", "allowed", "allowed"),
	},
	summary_completion: {
		officialName: "Summary completion",
		widget: "text_gap",
		container: "summary",
		availability: availability("disallowed", "allowed", "allowed"),
	},
	sentence_completion: {
		officialName: "Sentence completion",
		widget: "text_gap",
		container: "sentence",
		availability: availability("allowed", "allowed", "allowed"),
	},
	short_answer: {
		officialName: "Short-answer questions",
		widget: "text_gap",
		container: "plain",
		availability: availability("allowed", "allowed", "allowed"),
	},
	plan_map_diagram_labelling: {
		officialName: "Plan/map/diagram labelling",
		widget: "image_label",
		container: null,
		availability: availability("allowed", "disallowed", "disallowed"),
	},
	diagram_label_completion: {
		officialName: "Diagram label completion",
		widget: "image_label",
		container: null,
		availability: availability("disallowed", "allowed", "allowed"),
	},
} as const satisfies Record<string, QuestionTypeDefinitionShape>;

/** A canonical key in {@link QUESTION_TYPES}. */
export type QuestionType = keyof typeof QUESTION_TYPES;

/** A definition stored in {@link QUESTION_TYPES}. */
export type QuestionTypeDefinition = (typeof QUESTION_TYPES)[QuestionType];

/** Canonical type keys in their specification order, suitable for schema enums and menus. */
export const QUESTION_TYPE_KEYS = Object.freeze(Object.keys(QUESTION_TYPES) as QuestionType[]);

/** Whether an unknown value is a canonical IELTS question-type key. */
export function isQuestionType(value: unknown): value is QuestionType {
	return typeof value === "string" && Object.hasOwn(QUESTION_TYPES, value);
}

/** Returns the renderer, layout and format availability for a canonical type. */
export function getQuestionTypeDefinition(type: QuestionType): QuestionTypeDefinition {
	return QUESTION_TYPES[type];
}

/**
 * Returns whether `type` is official, override-only, or unavailable for a
 * skill/variant pair. Invalid pairs fail closed as `disallowed`.
 */
export function isTypeAllowed(
	type: QuestionType,
	skill: QuestionSkill,
	variant: QuestionVariant,
): QuestionTypeAvailability {
	if (skill === "listening" && variant === "n_a") {
		return QUESTION_TYPES[type].availability.listening;
	}
	if (skill === "reading" && variant === "academic") {
		return QUESTION_TYPES[type].availability.academic_reading;
	}
	if (skill === "reading" && variant === "general") {
		return QUESTION_TYPES[type].availability.general_training_reading;
	}
	return "disallowed";
}

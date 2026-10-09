import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { prepareTestImport } from "../../src/lib/import/import-test.ts";
import { testContentSchema, toAttemptSections } from "../../src/lib/test-content.ts";

const TEST_ID = "22222222-2222-4222-8222-222222222222";
const ACTOR_ID = "33333333-3333-4333-8333-333333333333";
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

const upload = {
	schema_version: 1,
	title: "Content mapping fixture",
	skill: "reading",
	variant: "academic",
	difficulty: "easy",
	duration_seconds: 3600,
	transfer_seconds: 0,
	kind: "mock",
	tags: ["fixture"],
	assets: [{ id: "figures", file: "figures.png", alt: "Four figures" }],
	sections: [
		{
			n: 1,
			title: "Passage one",
			passages: [{ title: "Passage one", html: '<p data-label="A">Text.</p>' }],
			question_groups: [
				{
					type: "identifying_views_claims",
					widget: "segmented_3",
					instructions: "Write YES, NO or NOT GIVEN.",
					questions: [{ n: 1, prompt: "A claim.", marks: 1, answer: ["Yes"] }],
				},
				{
					type: "mcq_multi",
					widget: "checkbox_n",
					instructions: "Choose TWO.",
					choose: 2,
					questions: [
						{ n: 2, covers: [2, 3], prompt: "Which two?", options: ["A", "B", "C"], marks: 2, answer: ["A", "C"] },
					],
				},
				{
					type: "diagram_label_completion",
					widget: "image_label",
					instructions: "Choose a label.",
					option_bank: ["A - one", "B - two"],
					asset_id: "figures",
					questions: [
						{ n: 4, prompt: "Figure 1", marks: 1, answer: ["B - two"] },
						{ n: 5, prompt: "Figure 2", marks: 1, answer: ["A - one"] },
					],
				},
			],
		},
	],
};

const content = () =>
	prepareTestImport(upload, { "figures.png": { bytes: PNG, mediaType: "image/png" } }, { testId: TEST_ID, actorId: ACTOR_ID })
		.content;

describe("toAttemptSections", () => {
	test("parses exactly what the importer writes to content.json", () => {
		assert.equal(testContentSchema.safeParse(content()).success, true);
	});

	test("refuses a content file that carries an answer", () => {
		const leaked = structuredClone(content());
		leaked.sections[0].question_groups[0].questions[0].answer = ["Yes"];
		assert.equal(testContentSchema.safeParse(leaked).success, false);
	});

	test("maps groups, banks, covers and images for the player", () => {
		const sections = toAttemptSections(testContentSchema.parse(content()), (asset) => `/media/${asset.ordinal}`);
		assert.equal(sections.length, 1);
		assert.equal(sections[0].label, "Passage 1");
		const [ynng, multi, image] = sections[0].groups;

		assert.equal(ynng.heading, "Question 1");
		assert.deepEqual(ynng.bank?.map((b) => b.value), ["Yes", "No", "Not Given"]);

		assert.equal(multi.heading, "Questions 2–3");
		assert.equal(multi.choose, 2);
		assert.deepEqual(multi.questions[0].covers, [2, 3]);

		assert.equal(image.heading, "Questions 4–5");
		assert.deepEqual(image.image, { url: "/media/1", alt: "Four figures" });
		assert.deepEqual(image.bank?.map((b) => b.value), ["A - one", "B - two"]);
		assert.equal(image.container, "plain");
	});

	test("never puts an answer into the player's sections", () => {
		const sections = toAttemptSections(testContentSchema.parse(content()), () => "/m");
		const text = JSON.stringify(sections);
		assert.equal(text.includes('"answer"'), false);
		assert.equal(text.includes("accepted_variants"), false);
	});
});

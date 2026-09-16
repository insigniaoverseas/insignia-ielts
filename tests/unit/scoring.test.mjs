import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
	answerKeySchema,
	bandFor,
	countWords,
	normalizeAnswer,
	scoreAttempt,
	scoreQuestion,
} from "../../src/lib/scoring.ts";

const TEST_ID = "11111111-1111-4111-8111-111111111111";

const key = {
	schema_version: 1,
	test_id: TEST_ID,
	content_version: 3,
	sections: [
		{
			n: 1,
			question_groups: [
				{
					type: "form_completion",
					word_limit: 1,
					questions: [
						{ n: 1, marks: 1, answer: ["Tennis"] },
						{ n: 2, marks: 1, answer: ["20"], accepted_variants: ["twenty"] },
						{ n: 3, marks: 1, answer: ["check-in"] },
						{ n: 4, marks: 1, answer: ["book"] },
					],
				},
				{
					type: "mcq_single",
					questions: [{ n: 5, marks: 1, answer: ["A poster"] }],
				},
				{
					type: "mcq_multi",
					questions: [{ n: 6, covers: [6, 7], marks: 2, answer: ["Pool", "Parking"] }],
				},
			],
		},
	],
};

const scale = [
	{ raw_min: 0, raw_max: 2, band: null },
	{ raw_min: 3, raw_max: 3, band: 4 },
	{ raw_min: 4, raw_max: 4, band: 5 },
	{ raw_min: 5, raw_max: 5, band: 6 },
	{ raw_min: 6, raw_max: 6, band: 7 },
	{ raw_min: 7, raw_max: 7, band: 9 },
];

describe("normalisation and IELTS word counting", () => {
	test("normalises Unicode width, surrounding/internal whitespace and case", () => {
		assert.equal(normalizeAnswer("  ＴＥＮＮＩＳ\u00a0 CLUB "), "tennis club");
	});

	test("counts a hyphenated expression as one word", () => {
		assert.equal(countWords("check-in"), 1);
		assert.equal(countWords("a twenty-one-year-old student"), 3);
	});

	test("counts numbers and decimal numbers as one token", () => {
		assert.equal(countWords("£20.50 and 1,000 rupees"), 4);
	});
});

describe("single-answer marking rules", () => {
	const question = (n) => key.sections[0].question_groups[0].questions.find((item) => item.n === n);

	test("is case-insensitive", () => {
		assert.equal(scoreQuestion(question(1), "form_completion", 1, 1, "tEnNiS")[0].isCorrect, true);
	});

	test('accepts an authored variant such as "twenty" for "20"', () => {
		assert.equal(scoreQuestion(question(2), "form_completion", 1, 1, "twenty")[0].isCorrect, true);
	});

	test("enforces the word limit before answer comparison", () => {
		const twoWordQuestion = { n: 1, marks: 1, answer: ["New York"] };
		assert.deepEqual(scoreQuestion(twoWordQuestion, "form_completion", 1, 1, "New York")[0], {
			qNumber: 1,
			sectionNo: 1,
			questionType: "form_completion",
			isCorrect: false,
			marksAwarded: 0,
		});
	});

	test("allows check-in under a one-word limit", () => {
		assert.equal(scoreQuestion(question(3), "form_completion", 1, 1, "CHECK-IN")[0].isCorrect, true);
	});

	test("does not stem plurals", () => {
		assert.equal(scoreQuestion(question(4), "form_completion", 1, 1, "books")[0].isCorrect, false);
	});

	test("blank, missing and wrong-shaped answers score zero", () => {
		assert.equal(scoreQuestion(question(1), "form_completion", 1, 1, " ")[0].marksAwarded, 0);
		assert.equal(scoreQuestion(question(1), "form_completion", 1, 1, undefined)[0].marksAwarded, 0);
		assert.equal(scoreQuestion(question(1), "form_completion", 1, 1, ["Tennis"])[0].marksAwarded, 0);
	});
});

describe("multi-answer marking and no negative marks", () => {
	const question = key.sections[0].question_groups[2].questions[0];

	test("selection order does not matter and emits one mark per covered number", () => {
		assert.deepEqual(scoreQuestion(question, "mcq_multi", 1, undefined, ["parking", "POOL"]), [
			{ qNumber: 6, sectionNo: 1, questionType: "mcq_multi", isCorrect: true, marksAwarded: 1 },
			{ qNumber: 7, sectionNo: 1, questionType: "mcq_multi", isCorrect: true, marksAwarded: 1 },
		]);
	});

	test("one right and one wrong awards one mark, never a negative mark", () => {
		const result = scoreQuestion(question, "mcq_multi", 1, undefined, ["Pool", "Cafe"]);
		assert.deepEqual(result.map((mark) => mark.marksAwarded), [1, 0]);
		assert.equal(result.reduce((sum, mark) => sum + mark.marksAwarded, 0), 1);
	});

	test("an invalid selection count or duplicate selection scores zero", () => {
		assert.equal(scoreQuestion(question, "mcq_multi", 1, undefined, ["Pool"]).every((mark) => !mark.isCorrect), true);
		assert.equal(scoreQuestion(question, "mcq_multi", 1, undefined, ["Pool", "pool"]).every((mark) => !mark.isCorrect), true);
	});
});

describe("database-driven band lookup", () => {
	test("uses the caller-supplied rows, not a hardcoded IELTS chart", () => {
		assert.deepEqual(bandFor(5, scale), { band: 6, belowBand: null });
		assert.deepEqual(bandFor(5, [{ raw_min: 0, raw_max: 7, band: 8.5 }]), { band: 8.5, belowBand: null });
	});

	test("derives Below 4 from the scale's lowest numeric band", () => {
		assert.deepEqual(bandFor(1, scale), { band: null, belowBand: 4 });
	});

	test("fails closed on a gap, overlap or invalid raw score", () => {
		assert.throws(() => bandFor(8, scale), /exactly one row/);
		assert.throws(() => bandFor(2, [...scale, { raw_min: 2, raw_max: 2, band: 3.5 }]), /exactly one row/);
		assert.throws(() => bandFor(-1, scale), /non-negative/);
	});
});

describe("complete attempt", () => {
	test("returns one mark per numbered question, section totals and the band", () => {
		const result = scoreAttempt(
			key,
			{ 1: "tennis", 2: "twenty", 3: "check-in", 4: "books", 5: "A poster", 6: ["Pool", "Parking"] },
			scale,
		);
		assert.equal(result.rawScore, 6);
		assert.equal(result.maxScore, 7);
		assert.equal(result.band, 7);
		assert.equal(result.marks.length, 7);
		assert.deepEqual(result.sectionScores, [{ sectionNo: 1, rawScore: 6, maxScore: 7 }]);
	});

	test("unanswered questions still get zero-mark rows", () => {
		const result = scoreAttempt(key, {}, scale);
		assert.equal(result.rawScore, 0);
		assert.equal(result.marks.length, 7);
		assert.equal(result.marks.every((mark) => mark.marksAwarded === 0), true);
		assert.equal(result.band, null);
		assert.equal(result.belowBand, 4);
	});

	test("refuses an answer for a control outside this immutable key", () => {
		assert.throws(() => scoreAttempt(key, { 8: "injected" }, scale), /unknown control 8/);
	});

	test("validates key structure before scoring", () => {
		const broken = structuredClone(key);
		Object.assign(broken.sections[0].question_groups[2].questions[0], { covers: [6, 8] });
		assert.equal(answerKeySchema.safeParse(broken).success, false);
	});

	test("refuses a text key without its scoring word limit", () => {
		const broken = structuredClone(key);
		delete broken.sections[0].question_groups[0].word_limit;
		assert.equal(answerKeySchema.safeParse(broken).success, false);
	});

	test("refuses spelling variants on a choice key", () => {
		const broken = structuredClone(key);
		Object.assign(broken.sections[0].question_groups[1].questions[0], { accepted_variants: ["poster"] });
		assert.equal(answerKeySchema.safeParse(broken).success, false);
	});
});

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
	controlsOf,
	givenAnswersFromRows,
	playerStateFromRows,
	rowsForValue,
} from "../../src/lib/attempts/answers.ts";

const sections = [
	{
		number: 1,
		label: "Section 1",
		passages: [],
		groups: [
			{
				id: "g1",
				heading: "Questions 1–2",
				instructionHtml: "",
				widget: "text_gap",
				container: "form",
				questions: [
					{ id: "q1", number: 1, promptHtml: "" },
					{ id: "q2", number: 2, promptHtml: "" },
				],
			},
		],
	},
	{
		number: 2,
		label: "Section 2",
		passages: [],
		groups: [
			{
				id: "g2",
				heading: "Questions 3–5",
				instructionHtml: "",
				widget: "checkbox_n",
				container: "plain",
				choose: 3,
				questions: [{ id: "q3", number: 3, covers: [3, 4, 5], promptHtml: "" }],
			},
		],
	},
];

describe("attempt answers mapping", () => {
	const [one, , multi] = controlsOf(sections);

	test("controls carry their covered numbers and section", () => {
		assert.deepEqual(multi, { id: "q3", number: 3, covers: [3, 4, 5], sectionNo: 2 });
	});

	test("a single answer is one row; blank clears it", () => {
		assert.deepEqual(rowsForValue(one, "  Prescott "), [{ q_number: 1, section_no: 1, given_answer: "  Prescott " }]);
		assert.deepEqual(rowsForValue(one, "   "), [{ q_number: 1, section_no: 1, given_answer: null }]);
	});

	test("a choose-three control always writes all three rows, clearing unticked ones", () => {
		assert.deepEqual(rowsForValue(multi, ["E", "H"]), [
			{ q_number: 3, section_no: 2, given_answer: "E" },
			{ q_number: 4, section_no: 2, given_answer: "H" },
			{ q_number: 5, section_no: 2, given_answer: null },
		]);
	});

	test("answers longer than the column are cut, never rejected", () => {
		const [row] = rowsForValue(one, "x".repeat(600));
		assert.equal(row.given_answer.length, 500);
	});

	test("resume rebuilds values, flags and the highest revision per control", () => {
		const state = playerStateFromRows(sections, [
			{ q_number: 1, section_no: 1, given_answer: "Prescott", flagged: true, revision: 4 },
			{ q_number: 3, section_no: 2, given_answer: "E", flagged: false, revision: 2 },
			{ q_number: 4, section_no: 2, given_answer: "H", flagged: false, revision: 3 },
			{ q_number: 5, section_no: 2, given_answer: null, flagged: false, revision: 3 },
		]);
		assert.deepEqual(state.answers, { q1: "Prescott", q3: ["E", "H"] });
		assert.deepEqual(state.flagged, [1]);
		assert.deepEqual(state.revisions, { q1: 4, q3: 3 });
	});

	test("scoring input is keyed by control, multi-answers as a list", () => {
		const given = givenAnswersFromRows(
			[{ n: 1 }, { n: 2 }, { n: 3, covers: [3, 4, 5] }],
			[
				{ q_number: 1, given_answer: "Prescott" },
				{ q_number: 2, given_answer: null },
				{ q_number: 3, given_answer: "E" },
				{ q_number: 4, given_answer: "F" },
				{ q_number: 5, given_answer: "H" },
			],
		);
		assert.deepEqual(given, { 1: "Prescott", 3: ["E", "F", "H"] });
	});
});

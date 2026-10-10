import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { applyOverrides } from "../../src/lib/attempts/overrides.ts";

const fresh = [
  { qNumber: 1, sectionNo: 1, isCorrect: false, marksAwarded: 0 },
  { qNumber: 2, sectionNo: 1, isCorrect: true, marksAwarded: 1 },
  { qNumber: 3, sectionNo: 2, isCorrect: false, marksAwarded: 0 },
];
const max = [{ sectionNo: 1, maxScore: 2 }, { sectionNo: 2, maxScore: 1 }];

describe("re-marking keeps a teacher's override", () => {
  test("with no overrides it is the key's marking, re-added", () => {
    const r = applyOverrides(fresh, [], max);
    assert.equal(r.rawScore, 1);
    assert.deepEqual(r.kept, []);
    assert.deepEqual(r.sectionScores, [{ sectionNo: 1, maxScore: 2, rawScore: 1 }, { sectionNo: 2, maxScore: 1, rawScore: 0 }]);
  });

  test("an overridden number keeps the teacher's mark, and the totals follow it", () => {
    const r = applyOverrides(fresh, [{ qNumber: 3, isCorrect: true, marksAwarded: 1 }], max);
    assert.equal(r.rawScore, 2);
    assert.deepEqual(r.kept, [3]);
    assert.equal(r.marks.find((m) => m.qNumber === 3).isCorrect, true);
    assert.equal(r.sectionScores[1].rawScore, 1);
  });

  test("a corrected key cannot undo an override, even one that took a mark away", () => {
    const keyNowSaysRight = fresh.map((m) => ({ ...m, isCorrect: true, marksAwarded: 1 }));
    const r = applyOverrides(keyNowSaysRight, [{ qNumber: 2, isCorrect: false, marksAwarded: 0 }], max);
    assert.equal(r.rawScore, 2);
    assert.equal(r.marks.find((m) => m.qNumber === 2).isCorrect, false);
  });
});

import { overridableAnswers } from "../../src/lib/attempts/overrides.ts";

describe("what screen 18 offers to re-mark", () => {
  const key = { sections: [{ question_groups: [
    { questions: [{ n: 1, answer: ["Leeds", "Leeds city"] }, { n: 2, answer: ["9"] }] },
    { questions: [{ n: 3, covers: [3, 4], answer: ["Japan", "Peru"] }] },
  ] }] };
  const rows = overridableAnswers(
    key,
    [{ q_number: 1, given_answer: " leds " }, { q_number: 3, given_answer: "Iran" }],
    [
      { q_number: 1, is_correct: false, marks_awarded: "0", overridden_by: null, override_note: null },
      { q_number: 2, is_correct: true, marks_awarded: 1, overridden_by: null, override_note: null },
      { q_number: 3, is_correct: true, marks_awarded: 1, overridden_by: "t", override_note: "accepted Iran" },
      { q_number: 4, is_correct: false, marks_awarded: 0, overridden_by: null, override_note: null },
    ],
  );
  test("wrong answers and existing overrides, never plain right answers", () => {
    assert.deepEqual(rows.map((r) => r.questionNumber), [1, 3, 4]);
  });
  test("shows what they wrote beside the key, alternatives as alternatives", () => {
    assert.equal(rows[0].givenAnswer, "leds");
    assert.equal(rows[0].correctAnswer, "Leeds / Leeds city");
    assert.equal(rows[2].givenAnswer, null);
    assert.equal(rows[2].correctAnswer, "Japan, Peru");
  });
  test("an override keeps its note", () => {
    assert.equal(rows[1].overridden, true);
    assert.equal(rows[1].overrideNote, "accepted Iran");
  });
});

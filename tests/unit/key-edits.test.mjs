import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { applyKeyEdits } from "../../src/lib/key-edits.ts";

const key = () => ({ sections: [{ question_groups: [{ questions: [
  { n: 1, marks: 1, answer: ["Leeds"] },
  { n: 2, marks: 1, answer: ["9"], accepted_variants: ["nine"] },
  { n: 3, covers: [3, 4], marks: 2, answer: ["Japan", "Peru"] },
] }] }] });

describe("answer key edits (M5-09)", () => {
  test("changes only answers and accepted spellings, and records exactly what changed", () => {
    const original = key();
    const r = applyKeyEdits(original, [
      { n: 1, answer: [" Leeds ", "leeds"], acceptedVariants: ["Leeds city", " ", "Leeds city"] },
      { n: 2, answer: ["9"], acceptedVariants: ["nine"] },
    ]);
    assert.equal(r.ok, true);
    const q1 = r.key.sections[0].question_groups[0].questions[0];
    assert.deepEqual(q1.answer, ["Leeds", "leeds"]);
    assert.deepEqual(q1.accepted_variants, ["Leeds city"]);
    assert.equal(q1.marks, 1);
    assert.deepEqual(r.changes.map((c) => c.n), [1], "an unchanged row is not a change");
    assert.deepEqual(original.sections[0].question_groups[0].questions[0].answer, ["Leeds"], "the input key is untouched");
  });

  test("clearing the accepted spellings removes the field", () => {
    const r = applyKeyEdits(key(), [{ n: 2, answer: ["9"], acceptedVariants: [] }]);
    assert.equal("accepted_variants" in r.key.sections[0].question_groups[0].questions[1], false);
  });

  test("refuses an empty answer, and a question the test doesn't have", () => {
    assert.equal(applyKeyEdits(key(), [{ n: 1, answer: ["  "], acceptedVariants: [] }]).ok, false);
    assert.equal(applyKeyEdits(key(), [{ n: 99, answer: ["x"], acceptedVariants: [] }]).ok, false);
  });
});

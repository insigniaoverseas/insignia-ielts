import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  addCounts,
  attemptMode,
  countsMessage,
  inBatches,
  detailsResultMessage,
  detailsWarning,
  drillsKept,
  isDrill,
  parseDetailsChange,
  planDetailsChange,
} from "../../src/lib/test-details.ts";

const row = (over = {}) => ({ id: "t1", title: "Easy 19 — Reading", kind: "mock", difficulty: "easy", status: "published", assigned: false, drill: null, ...over });

describe("changing a test's type and difficulty (M10-17)", () => {
  test("a change must name a known type or difficulty", () => {
    assert.deepEqual(parseDetailsChange({ kind: "practice" }), { kind: "practice" });
    assert.deepEqual(parseDetailsChange({ kind: "", difficulty: "medium" }), { difficulty: "medium" });
    assert.equal(parseDetailsChange({}), "Choose a type or a difficulty to change.");
    assert.equal(parseDetailsChange({ kind: "exam" }), "Choose Mock, Class or Practice.");
    assert.equal(parseDetailsChange({ difficulty: "very hard" }), "Choose Easy, Medium or Hard.");
  });

  test("only tests that actually change are updated, with only the columns that change", () => {
    const plan = planDetailsChange([row(), row({ id: "t2", difficulty: "medium" })], { difficulty: "medium" });
    assert.deepEqual(plan, [{ id: "t1", title: "Easy 19 — Reading", from: { kind: "mock", difficulty: "easy" }, set: { difficulty: "medium" } }]);
  });

  test("leaving practice clears the drilled question type; becoming practice keeps it", () => {
    assert.deepEqual(planDetailsChange([row({ kind: "practice" })], { kind: "class" })[0].set, { kind: "class", practice_question_type: null });
    assert.deepEqual(planDetailsChange([row()], { kind: "practice" })[0].set, { kind: "practice" });
  });

  test("making a published paper Practice warns, more strongly once it has been set", () => {
    assert.equal(detailsWarning([row()], { kind: "class" }), null);
    assert.equal(detailsWarning([row({ status: "draft" })], { kind: "practice" }), null);
    assert.equal(detailsWarning([row({ kind: "practice" })], { kind: "practice" }), null);
    assert.equal(detailsWarning([row()], { kind: "practice" }), "This test will appear in every student's Practice at Home straight away.");
    assert.match(detailsWarning([row({ assigned: true })], { kind: "practice" }), /It has already been set as a test/);
    assert.match(
      detailsWarning([row({ assigned: true }), row({ id: "t2" }), row({ id: "t3", assigned: true })], { kind: "practice" }),
      /^These 3 tests will appear .* 2 of them have already been set as a test/,
    );
  });

  test("the result sentence says what changed and what was already so", () => {
    const change = { kind: "practice", difficulty: "easy" };
    const plan = planDetailsChange([row(), row({ id: "t2" })], change);
    assert.equal(detailsResultMessage(plan, change, 2), "Changed 2 tests to Practice, Easy.");
    assert.equal(detailsResultMessage(plan.slice(0, 1), change, 3), "Changed 1 test to Practice, Easy. 2 already were.");
    assert.equal(detailsResultMessage([], change, 1), "Nothing to change — it already is that.");
  });

  test("a question-type practice set keeps its type; only its difficulty changes", () => {
    const drill = row({ id: "d1", kind: "practice", drill: "matching_headings" });
    const fullPaper = row({ id: "p1", kind: "practice" });
    assert.equal(isDrill(drill), true);
    assert.equal(isDrill(fullPaper), false);

    const toMock = { kind: "mock", difficulty: "hard" };
    const plan = planDetailsChange([drill, fullPaper], toMock);
    assert.deepEqual(plan.find((u) => u.id === "d1").set, { difficulty: "hard" });
    assert.deepEqual(plan.find((u) => u.id === "p1").set, { kind: "mock", practice_question_type: null, difficulty: "hard" });
    assert.equal(drillsKept([drill, fullPaper], toMock), 1);
    assert.equal(drillsKept([drill], { kind: "practice" }), 0);

    assert.deepEqual(planDetailsChange([drill], { kind: "class" }), []);
    assert.equal(detailsResultMessage([], { kind: "class" }, 1, 1), "Nothing changed. 1 question-type practice set stays Practice.");
    assert.equal(
      detailsResultMessage(planDetailsChange([drill, fullPaper], { kind: "mock" }), { kind: "mock" }, 2, 1),
      "Changed 1 test to Mock. 1 question-type practice set stays Practice.",
    );
  });

  test("a long change is sent in batches and its counts add up into one sentence", () => {
    assert.deepEqual(inBatches([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
    assert.deepEqual(inBatches([], 10), []);
    const total = addCounts({ changed: 8, already: 2, kept: 0, conflicts: 0 }, { changed: 4, already: 0, kept: 1, conflicts: 1 });
    assert.deepEqual(total, { changed: 12, already: 2, kept: 1, conflicts: 1 });
    assert.equal(
      countsMessage(total, { kind: "mock" }),
      "Changed 12 tests to Mock. 2 already were. 1 question-type practice set stays Practice. 1 test was changed by someone else while you were looking — reload the page and check.",
    );
    assert.equal(countsMessage({ changed: 0, already: 3, kept: 0, conflicts: 0 }, { difficulty: "easy" }), "Nothing to change — they already are that.");
  });

  test("the player runs by the attempt's own type, not the paper's file", () => {
    assert.equal(attemptMode("practice", "mock"), "practice");
    assert.equal(attemptMode("mock", "practice"), "mock");
    assert.equal(attemptMode("something odd", "class"), "class");
  });
});

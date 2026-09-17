import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  describeMembershipPlan,
  planChangesSomething,
  planMembershipAdd,
} from "../../src/lib/batch-membership-plan.ts";

const MORNING = "batch-morning";
const EVENING = "batch-evening";
const WEEKEND = "batch-weekend";

describe("planning a batch add", () => {
  test("a student in no batch is simply inserted", () => {
    const plan = planMembershipAdd(MORNING, ["priya"], [], "promote");
    assert.deepEqual(plan.insert, ["priya"]);
    assert.deepEqual(plan.reopen, []);
    assert.deepEqual(plan.close, []);
  });

  test("promote closes every other active batch", () => {
    const plan = planMembershipAdd(EVENING, ["priya"], [
      { batchId: MORNING, studentId: "priya", leftAt: null },
      { batchId: WEEKEND, studentId: "priya", leftAt: null },
    ], "promote");

    assert.deepEqual(plan.insert, ["priya"]);
    assert.deepEqual(
      plan.close.map((c) => c.batchId).sort(),
      [EVENING, MORNING, WEEKEND].filter((b) => b !== EVENING).sort(),
    );
  });

  test("addon leaves the other batches alone", () => {
    const plan = planMembershipAdd(WEEKEND, ["priya"], [
      { batchId: MORNING, studentId: "priya", leftAt: null },
    ], "addon");

    assert.deepEqual(plan.insert, ["priya"]);
    assert.deepEqual(plan.close, []);
  });

  test("somebody who left and comes back is reopened, never re-inserted", () => {
    // batch_students is keyed on (batch_id, student_id): a second row would
    // fail on the primary key, so this distinction is not cosmetic.
    const plan = planMembershipAdd(MORNING, ["priya"], [
      { batchId: MORNING, studentId: "priya", leftAt: "2026-05-01T00:00:00Z" },
    ], "addon");

    assert.deepEqual(plan.reopen, ["priya"]);
    assert.deepEqual(plan.insert, []);
  });

  test("a student already in the batch is unchanged, not an error", () => {
    const plan = planMembershipAdd(MORNING, ["priya"], [
      { batchId: MORNING, studentId: "priya", leftAt: null },
    ], "addon");

    assert.deepEqual(plan.unchanged, ["priya"]);
    assert.deepEqual(plan.insert, []);
    assert.deepEqual(plan.reopen, []);
    assert.equal(planChangesSomething(plan), false);
  });

  test("promoting someone already here still closes their other batches", () => {
    const plan = planMembershipAdd(MORNING, ["priya"], [
      { batchId: MORNING, studentId: "priya", leftAt: null },
      { batchId: WEEKEND, studentId: "priya", leftAt: null },
    ], "promote");

    assert.deepEqual(plan.unchanged, ["priya"]);
    assert.deepEqual(plan.close, [{ batchId: WEEKEND, studentId: "priya" }]);
    assert.equal(planChangesSomething(plan), true);
  });

  test("a batch already left is not closed again", () => {
    const plan = planMembershipAdd(MORNING, ["priya"], [
      { batchId: WEEKEND, studentId: "priya", leftAt: "2026-05-01T00:00:00Z" },
    ], "promote");

    assert.deepEqual(plan.close, []);
  });

  test("duplicates in the request are collapsed", () => {
    const plan = planMembershipAdd(MORNING, ["priya", "priya", "", "amit"], [], "addon");
    assert.deepEqual(plan.insert, ["priya", "amit"]);
  });

  test("one student's batches never affect another's", () => {
    const plan = planMembershipAdd(EVENING, ["priya", "amit"], [
      { batchId: MORNING, studentId: "priya", leftAt: null },
      { batchId: WEEKEND, studentId: "ravi", leftAt: null },
    ], "promote");

    assert.deepEqual(plan.insert, ["priya", "amit"]);
    assert.deepEqual(plan.close, [{ batchId: MORNING, studentId: "priya" }]);
  });
});

describe("describing the result", () => {
  test("says moved when a promotion actually moved somebody", () => {
    const plan = planMembershipAdd(EVENING, ["priya"], [
      { batchId: MORNING, studentId: "priya", leftAt: null },
    ], "promote");
    assert.match(describeMembershipPlan(plan, "promote"), /Moved 1 student into this batch/);
  });

  test("says added when nobody had to move", () => {
    const plan = planMembershipAdd(MORNING, ["priya", "amit"], [], "promote");
    assert.match(describeMembershipPlan(plan, "promote"), /Added 2 students/);
  });

  test("says so plainly when there was nothing to do", () => {
    const plan = planMembershipAdd(MORNING, ["priya"], [
      { batchId: MORNING, studentId: "priya", leftAt: null },
    ], "addon");
    assert.match(describeMembershipPlan(plan, "addon"), /already in this batch/);
  });
});

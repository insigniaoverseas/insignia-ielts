import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { planBatchRemoval, removalDoneMessage } from "../../src/lib/batch-removal.ts";

describe("Remove batch decides delete or archive (M10-14)", () => {
  test("a batch no test was ever assigned to is deleted for good", () => {
    const plan = planBatchRemoval("Test batch", 0, 0);
    assert.equal(plan.kind, "delete");
    assert.match(plan.title, /^Delete Test batch\?$/);
    assert.match(plan.description, /deleted for good/);
    assert.match(plan.description, /no students/);
  });
  test("deleting says how many students will be left without a batch", () => {
    assert.match(planBatchRemoval("B", 0, 1).description, /1 student will no longer be in a batch/);
    assert.match(planBatchRemoval("B", 0, 12).description, /12 students will no longer be in a batch/);
  });
  test("a batch that was ever assigned a test is archived, never deleted", () => {
    for (const n of [1, 3, 40]) {
      const plan = planBatchRemoval("Morning A", n, 18);
      assert.equal(plan.kind, "archive", String(n));
      assert.match(plan.description, /results stay/);
      assert.match(plan.description, /restore/);
      assert.doesNotMatch(plan.description, /deleted for good/);
    }
  });
  test("the counts are said in words", () => {
    assert.match(planBatchRemoval("B", 1, 0).description, /^1 test was assigned/);
    assert.match(planBatchRemoval("B", 3, 0).description, /^3 tests were assigned/);
  });
  test("the confirmation on the list matches what happened", () => {
    assert.equal(removalDoneMessage("B", "delete"), "B was deleted.");
    assert.match(removalDoneMessage("B", "archive"), /removed\. Its results are kept/);
  });
});

import { describePurge, purgeConfirmed } from "../../src/lib/batch-removal.ts";

describe("Remove batch frees its students (M10-14)", () => {
  test("archiving says the students can join another batch", () => {
    assert.match(planBatchRemoval("B", 2, 18).description, /18 students are freed to join another batch/);
    assert.match(planBatchRemoval("B", 2, 1).description, /student is freed/);
  });
});

describe("Delete permanently (M10-14)", () => {
  const preview = { ownAssignments: 3, sharedAssignments: 1, attempts: 42, students: 18 };

  test("says it can't be undone, and counts what goes", () => {
    const lines = describePurge("Morning A", preview).join(" ");
    assert.match(lines, /deleted for good\. This can't be undone/);
    assert.match(lines, /3 assignments made to this batch will be removed, with 42 attempts/);
    assert.match(lines, /1 assignment also given to other batches or students will be kept/);
    assert.match(lines, /18 students will be freed/);
  });
  test("always says the Test library is untouched", () => {
    for (const p of [preview, { ownAssignments: 0, sharedAssignments: 0, attempts: 0, students: 0 }]) {
      assert.match(describePurge("B", p).join(" "), /tests themselves stay in the Test library/);
    }
  });
  test("never calls an assignment a test being deleted", () => {
    assert.doesNotMatch(describePurge("B", preview).join(" "), /tests? (will be|are) deleted/i);
  });
  test("nothing to mention, nothing mentioned", () => {
    const lines = describePurge("B", { ownAssignments: 0, sharedAssignments: 0, attempts: 0, students: 0 });
    assert.equal(lines.length, 2);
  });
  test("typing the batch name confirms — case and extra spaces forgiven", () => {
    assert.equal(purgeConfirmed("Morning A", "morning   a "), true);
    assert.equal(purgeConfirmed("Morning A", "Morning"), false);
    assert.equal(purgeConfirmed("Morning A", ""), false);
    assert.equal(purgeConfirmed("Morning A", "   "), false);
  });
});

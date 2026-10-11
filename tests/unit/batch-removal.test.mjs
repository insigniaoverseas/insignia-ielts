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

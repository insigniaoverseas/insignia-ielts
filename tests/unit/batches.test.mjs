import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { BATCH_STATUSES, isBatchStatus, validateBatch, validateBatchEdit } from "../../src/lib/batch-input.ts";

/** A batch that passes, so each test can change one thing about it. */
const valid = {
  name: "Morning — Jan 2026",
  startsOn: "2026-01-05",
  endsOn: "2026-04-05",
  branchId: null,
  teacherIds: [],
};

describe("batch validation", () => {
  test("accepts a well-formed batch", () => {
    const result = validateBatch(valid);
    assert.equal(result.ok, true);
    assert.equal(result.name, "Morning — Jan 2026");
    assert.equal(result.startsOn, "2026-01-05");
    assert.equal(result.endsOn, "2026-04-05");
  });

  test("an open-ended batch is normal, not an error", () => {
    for (const endsOn of [null, "", "   "]) {
      const result = validateBatch({ ...valid, endsOn });
      assert.equal(result.ok, true, `endsOn=${JSON.stringify(endsOn)}`);
      assert.equal(result.endsOn, null);
    }
  });

  test("the name is trimmed, and blank is refused", () => {
    assert.equal(validateBatch({ ...valid, name: "  Evening  " }).name, "Evening");

    for (const name of ["", "   "]) {
      const result = validateBatch({ ...valid, name });
      assert.equal(result.ok, false);
      assert.equal(result.field, "name");
    }
  });

  test("refuses an end date before the start date", () => {
    // The database's batches_ends_after_starts would refuse this too; this is
    // the half that says so in words.
    const result = validateBatch({ ...valid, startsOn: "2026-04-05", endsOn: "2026-01-05" });
    assert.equal(result.ok, false);
    assert.equal(result.field, "endsOn");
    assert.match(result.message, /before the start date/);
  });

  test("the same day is a valid one-day batch", () => {
    assert.equal(validateBatch({ ...valid, startsOn: "2026-01-05", endsOn: "2026-01-05" }).ok, true);
  });

  test("refuses dates that are not dates", () => {
    for (const startsOn of ["", "tomorrow", "05-01-2026", "2026-1-5", "2026-13-01", "2026-02-30"]) {
      const result = validateBatch({ ...valid, startsOn });
      assert.equal(result.ok, false, `startsOn=${startsOn}`);
      assert.equal(result.field, "startsOn");
    }

    const badEnd = validateBatch({ ...valid, endsOn: "2026-02-30" });
    assert.equal(badEnd.ok, false);
    assert.equal(badEnd.field, "endsOn");
  });

  test("refuses a name longer than the column expects", () => {
    const result = validateBatch({ ...valid, name: "x".repeat(121) });
    assert.equal(result.ok, false);
    assert.equal(result.field, "name");
  });
});

describe("batch edit validation", () => {
  const edit = { ...valid, status: "active" };

  test("accepts every status the database allows", () => {
    for (const status of BATCH_STATUSES) {
      const result = validateBatchEdit({ ...edit, status });
      assert.equal(result.ok, true, status);
      assert.equal(result.status, status);
    }
    assert.deepEqual([...BATCH_STATUSES], ["active", "completed", "archived"]);
  });

  test("refuses a status the constraint would reject", () => {
    // Never falls back to "active": quietly reactivating an archived batch is
    // worse than refusing a value the form should not have sent.
    for (const status of ["", "ACTIVE", "finished", "deleted", "draft"]) {
      const result = validateBatchEdit({ ...edit, status });
      assert.equal(result.ok, false, status);
      assert.equal(result.field, "status");
    }
  });

  test("isBatchStatus is exact about what it accepts", () => {
    assert.equal(isBatchStatus("completed"), true);
    assert.equal(isBatchStatus("Completed"), false);
    assert.equal(isBatchStatus("toString"), false);
  });

  test("still applies every create rule", () => {
    const badDates = validateBatchEdit({ ...edit, startsOn: "2026-04-05", endsOn: "2026-01-05" });
    assert.equal(badDates.ok, false);
    assert.equal(badDates.field, "endsOn");

    const noName = validateBatchEdit({ ...edit, name: "  " });
    assert.equal(noName.ok, false);
    assert.equal(noName.field, "name");
  });

  test("checks the status before the rest, so a stale dropdown is named first", () => {
    const result = validateBatchEdit({ ...edit, status: "deleted", name: "" });
    assert.equal(result.ok, false);
    assert.equal(result.field, "status");
  });
});

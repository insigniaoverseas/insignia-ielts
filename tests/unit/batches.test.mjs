import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { validateBatch } from "../../src/lib/batch-input.ts";

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

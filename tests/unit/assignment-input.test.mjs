import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { kolkataLocalToUtc, validateAssignment } from "../../src/lib/assignment-input.ts";

const NOW = new Date("2026-10-10T06:30:00.000Z"); // 12:00 IST
const base = {
  testId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  batchIds: ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"],
  studentIds: [],
  opensAt: "",
  dueBy: "",
  attempts: "1",
  allowReview: true,
  release: "manual",
  releaseAt: "",
};

describe("assigning a test — when results come out (M6-05)", () => {
  test("held until released is the plain case", () => {
    const r = validateAssignment(base, NOW);
    assert.equal(r.ok, true);
    assert.equal(r.resultsRelease, "manual");
    assert.equal(r.resultsReleasedAt, null);
  });

  test("straight away carries no time — the database refuses one", () => {
    const r = validateAssignment({ ...base, release: "immediate", releaseAt: "2026-10-12T10:00" }, NOW);
    assert.equal(r.ok, true);
    assert.equal(r.resultsReleasedAt, null);
  });

  test("a scheduled release is read as institute time", () => {
    const r = validateAssignment({ ...base, release: "scheduled", releaseAt: "2026-10-12T18:00" }, NOW);
    assert.equal(r.ok, true);
    assert.equal(r.resultsRelease, "scheduled");
    assert.equal(r.resultsReleasedAt, "2026-10-12T12:30:00.000Z");
  });

  test("a scheduled release needs a real, future time after the test opens", () => {
    for (const [releaseAt, opensAt] of [["", ""], ["not a date", ""], ["2026-10-10T11:00", ""], ["2026-10-13T09:00", "2026-10-14T09:00"]]) {
      const r = validateAssignment({ ...base, release: "scheduled", releaseAt, opensAt }, NOW);
      assert.equal(r.ok, false, JSON.stringify({ releaseAt, opensAt }));
      assert.equal(r.field, "release");
    }
  });

  test("anything else is refused rather than guessed", () => {
    const r = validateAssignment({ ...base, release: "whenever" }, NOW);
    assert.equal(r.ok, false);
    assert.equal(r.field, "release");
  });
});

describe("assigning a test — the rest of the form", () => {
  test("needs a test and somebody to take it", () => {
    assert.equal(validateAssignment({ ...base, testId: "" }, NOW).field, "test");
    assert.equal(validateAssignment({ ...base, batchIds: [] }, NOW).field, "who");
  });

  test("attempts stay between 1 and 9", () => {
    for (const attempts of ["0", "10", "1.5", "x"]) assert.equal(validateAssignment({ ...base, attempts }, NOW).field, "attempts");
  });

  test("datetime-local is Asia/Kolkata, whatever the browser's zone", () => {
    assert.equal(kolkataLocalToUtc("2026-10-11T09:30")?.toISOString(), "2026-10-11T04:00:00.000Z");
    assert.equal(kolkataLocalToUtc("2026-02-30T10:00"), null);
  });
});

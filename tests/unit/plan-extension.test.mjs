import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { extendedExpiry, validateExtension } from "../../src/lib/plan-extension.ts";

const ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("extending a plan — the new end date", () => {
  test("counts from the plan's own end date, so no time is lost", () => {
    assert.equal(extendedExpiry("2026-11-15", "2026-10-10", 3), "2027-02-15");
  });
  test("a plan that already lapsed counts from today", () => {
    assert.equal(extendedExpiry("2026-08-01", "2026-10-10", 1), "2026-11-10");
  });
  test("ending today counts from today", () => {
    assert.equal(extendedExpiry("2026-10-10", "2026-10-10", 6), "2027-04-10");
  });
  test("month ends clamp instead of spilling over", () => {
    assert.equal(extendedExpiry("2027-01-31", "2026-10-10", 1), "2027-02-28");
    assert.equal(extendedExpiry("2027-12-31", "2026-10-10", 2), "2028-02-29");
    assert.equal(extendedExpiry("2026-12-15", "2026-10-10", 1), "2027-01-15");
  });
});

describe("extending a plan — the request", () => {
  test("accepts a real request", () => {
    const r = validateExtension({ studentIds: [ID, ID], months: 3, reason: "  missed classes  " });
    assert.deepEqual(r, { ok: true, studentIds: [ID], months: 3, reason: "missed classes" });
  });
  test("refuses what screen 24 cannot send", () => {
    assert.equal(validateExtension({ studentIds: [], months: 3, reason: "x" }).ok, false);
    assert.equal(validateExtension({ studentIds: [ID], months: 2, reason: "x" }).ok, false);
    assert.equal(validateExtension({ studentIds: [ID], months: 3, reason: "   " }).ok, false);
    assert.equal(validateExtension({ studentIds: ["nope"], months: 3, reason: "x" }).ok, false);
    assert.equal(validateExtension({ studentIds: [ID], months: 3, reason: "x".repeat(301) }).ok, false);
  });
});

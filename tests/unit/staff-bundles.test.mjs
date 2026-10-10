import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { toSlot } from "../../src/lib/bundle-slots.ts";
import { filterAudit, filterStudents, STUDENTS_PAGE_SIZE } from "../../src/lib/staff-filters.ts";

const branchAdmin = { id: "a1", role: "admin", branchId: "b1", permissions: { "student:manage": "branch" } };

describe("layout bundle slots", () => {
  test("a page the person may not open is withheld, data and all", () => {
    const slot = toSlot(branchAdmin, "audit:read", { ok: true, data: { secret: true } });
    assert.deepEqual(slot, { ok: false, reason: "forbidden" });
    assert.equal("data" in slot, false);
  });

  test("a permitted page carries its data", () => {
    assert.deepEqual(toSlot(branchAdmin, "student:manage", { ok: true, data: [1] }), { ok: true, data: [1] });
  });

  test("a page with no permission of its own is always sent", () => {
    assert.deepEqual(toSlot(branchAdmin, null, { ok: true, data: "overview" }), { ok: true, data: "overview" });
  });

  test("a failed load is an error for that page only", () => {
    assert.deepEqual(toSlot(branchAdmin, "student:manage", { ok: false }), { ok: false, reason: "error" });
  });

  test("forbidden outranks a failed load — no hint that the page exists", () => {
    assert.deepEqual(toSlot(branchAdmin, "audit:read", { ok: false }), { ok: false, reason: "forbidden" });
  });
});

describe("admin list filters in the browser", () => {
  const row = (id, extra) => ({ id, name: `Student ${id}`, phone: `+91 98${id}`, batchId: "x", planState: "active", ...extra });
  const rows = [
    row("1", { name: "Asha Rao", batchId: "morning" }),
    row("2", { name: "Ravi Kumar", planState: "expiring" }),
    row("3", { name: "Asha Mehta", planState: "expired", batchId: "morning" }),
  ];

  test("search matches name or phone, case-insensitively", () => {
    assert.deepEqual(filterStudents(rows, { search: "  asha " }).rows.map((r) => r.id), ["1", "3"]);
    assert.deepEqual(filterStudents(rows, { search: "982" }).rows.map((r) => r.id), ["2"]);
  });

  test("batch and status combine; 'all' means no filter", () => {
    assert.deepEqual(filterStudents(rows, { batch: "morning", status: "expired" }).rows.map((r) => r.id), ["3"]);
    assert.equal(filterStudents(rows, { batch: "all", status: "all" }).total, 3);
  });

  test("shows one page but counts every match", () => {
    const many = Array.from({ length: STUDENTS_PAGE_SIZE + 5 }, (_, i) => row(String(i)));
    const result = filterStudents(many, {});
    assert.equal(result.rows.length, STUDENTS_PAGE_SIZE);
    assert.equal(result.total, STUDENTS_PAGE_SIZE + 5);
  });

  test("audit filter by action", () => {
    const entries = [{ action: "auth.sign_in" }, { action: "plan.extend" }, { action: "auth.sign_in" }];
    assert.equal(filterAudit(entries, "auth.sign_in").length, 2);
    assert.equal(filterAudit(entries, "all").length, 3);
    assert.equal(filterAudit(entries).length, 3);
  });
});

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  ACCOUNT_LIMIT,
  UNLOCK_PERMISSIONS,
  WINDOW_SECONDS,
  accountKey,
  canUnlockSignIn,
  ipKey,
  windowEndOf,
  windowStartAt,
} from "../../src/lib/auth/lockout-rules.ts";

const actor = (role, permissions) => ({ id: "u", role, branchId: "b", permissions });

describe("lockout numbers (MVP-1 §8: lockout after 5 failures)", () => {
  test("five wrong passwords, fifteen minutes", () => {
    assert.equal(ACCOUNT_LIMIT, 5);
    assert.equal(WINDOW_SECONDS, 900);
  });
});

describe("rate_limits keys", () => {
  test("an account key ignores case and stray spaces, so the lock can't be dodged by typing it differently", () => {
    assert.equal(accountKey("  Priya@Example.com "), accountKey("priya@example.com"));
    assert.equal(accountKey("priya@example.com"), "signin:account:priya@example.com");
  });
  test("account and IP keys never collide", () => {
    assert.notEqual(accountKey("1.2.3.4"), ipKey("1.2.3.4"));
  });
});

describe("fixed windows", () => {
  test("the window start floors to a 15-minute boundary, as bump_rate_limit does", () => {
    assert.equal(windowStartAt(new Date("2026-10-11T10:14:59.999Z")).toISOString(), "2026-10-11T10:00:00.000Z");
    assert.equal(windowStartAt(new Date("2026-10-11T10:15:00.000Z")).toISOString(), "2026-10-11T10:15:00.000Z");
  });
  test("the lock lifts at the end of its window", () => {
    assert.equal(windowEndOf("2026-10-11T10:15:00+00:00").toISOString(), "2026-10-11T10:30:00.000Z");
  });
});

describe("who may unlock a student's sign-in", () => {
  test("a teacher may — the login screen sends the student to them", () => {
    assert.equal(canUnlockSignIn(actor("teacher", { "assignment:manage": "batch" })), true);
  });
  test("an admin and the Owner may", () => {
    assert.equal(canUnlockSignIn(actor("admin", { "student:manage": "branch", "assignment:manage": "branch" })), true);
    assert.equal(canUnlockSignIn(actor("super_admin", { "student:manage": "all" })), true);
  });
  test("an invigilator and a student may not", () => {
    assert.equal(canUnlockSignIn(actor("invigilator", { "session:invigilate": "branch" })), false);
    assert.equal(canUnlockSignIn(actor("student", { "attempt:take": "own" })), false);
  });
  test("no permissions, no unlock — fails closed", () => {
    assert.equal(canUnlockSignIn(actor("teacher", {})), false);
  });
  test("the action checks exactly these permissions", () => {
    assert.deepEqual([...UNLOCK_PERMISSIONS].sort(), ["assignment:manage", "student:manage"]);
  });
});

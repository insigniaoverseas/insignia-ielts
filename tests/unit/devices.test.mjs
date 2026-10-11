import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { accountPathFor, deviceRows } from "../../src/lib/auth/devices.ts";

const CHROME_WIN = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";
const SAFARI_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

const sessions = [
  { id: "old", user_agent: CHROME_WIN, last_seen_at: "2026-10-01T09:00:00Z" },
  { id: "this", user_agent: SAFARI_IPHONE, last_seen_at: "2026-10-05T09:00:00Z" },
  { id: "recent", user_agent: CHROME_WIN, last_seen_at: "2026-10-11T09:00:00Z" },
];

describe("the signed-in-on list (M10-12)", () => {
  const rows = deviceRows(sessions, "this", (iso) => iso.slice(0, 10));

  test("this device comes first, even when another was used more recently", () => {
    assert.deepEqual(rows.map((r) => r.id), ["this", "recent", "old"]);
  });
  test("only this device is marked current — it gets no Sign out button", () => {
    assert.deepEqual(rows.map((r) => r.current), [true, false, false]);
  });
  test("devices are named in words, not user-agent strings", () => {
    assert.match(rows[1].label, /Chrome/);
    assert.doesNotMatch(rows[1].label, /Mozilla/);
  });
  test("last used comes from the caller's formatter", () => assert.equal(rows[2].lastUsedLabel, "2026-10-01"));
  test("with no session cookie, nothing is marked current", () => {
    assert.ok(deviceRows(sessions, undefined, String).every((r) => !r.current));
  });
  test("the input is not reordered in place", () => {
    deviceRows(sessions, "this", String);
    assert.equal(sessions[0].id, "old");
  });
});

describe("where each role's list lives", () => {
  test("students: Profile", () => assert.equal(accountPathFor("student"), "/profile"));
  test("teachers and invigilators: the teacher side", () => {
    assert.equal(accountPathFor("teacher"), "/teacher/account");
    assert.equal(accountPathFor("invigilator"), "/teacher/account");
  });
  test("admins and the Owner: the admin side", () => {
    assert.equal(accountPathFor("admin"), "/admin/account");
    assert.equal(accountPathFor("super_admin"), "/admin/account");
  });
});

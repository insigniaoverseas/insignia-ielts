// lib/permissions.ts against the permissions the migrations actually seed.
//   npm run test:unit
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

import { PERMISSIONS, SCOPES, can, canAssignRole, canInviteRole, parsePermissions, scopeOf } from "../../src/lib/permissions.ts";
import { migratedDatabase } from "../db/setup.mjs";

/** Role key → Actor built from the seeded roles.permissions. */
const actors = {};
let db;

before(async () => {
  db = await migratedDatabase();
  const { rows } = await db.query(`select key, name, permissions from public.roles`);
  for (const r of rows) actors[r.key] = { id: r.key, role: r.key, branchId: "b1", permissions: parsePermissions(r.permissions), raw: r.permissions, name: r.name };
});
after(() => db.close());

describe("seeded roles match the agreed matrix (PROJECT-MEMORY §4, 2026-09-15)", () => {
  test("super_admin is shown as Owner", () => {
    assert.equal(actors.super_admin.name, "Owner");
    assert.equal(actors.admin.name, "Admin");
  });

  test("every seeded permission is one lib/permissions.ts knows (no drift)", () => {
    for (const a of Object.values(actors)) {
      for (const [key, scope] of Object.entries(a.raw)) {
        assert.ok(PERMISSIONS.includes(key), `${a.role}: unknown permission ${key}`);
        assert.ok(SCOPES.includes(scope), `${a.role}: bad scope ${scope}`);
      }
    }
  });

  const matrix = {
    student:     { "attempt:take": "own" },
    invigilator: { "session:invigilate": "branch" },
    teacher:     { "session:invigilate": "batch", "assignment:manage": "batch", "results:release": "batch", "mark:override": "batch", "test:author": "own" },
    admin:       { "session:invigilate": "branch", "assignment:manage": "branch", "results:release": "branch", "mark:override": "branch", "test:author": "all", "test:publish": "all", "band_scale:edit": "all", "student:manage": "branch", "staff:manage": "branch", "audit:read": "branch" },
    super_admin: Object.fromEntries(PERMISSIONS.filter((p) => p !== "attempt:take").map((p) => [p, "all"])),
  };
  for (const [role, expected] of Object.entries(matrix)) {
    test(`${role}: exactly the agreed permissions and scopes`, () => {
      for (const p of PERMISSIONS) assert.equal(scopeOf(actors[role], p), expected[p] ?? null, `${role} / ${p}`);
    });
  }

  test("teachers draft but cannot publish", () => {
    assert.ok(can(actors.teacher, "test:author"));
    assert.ok(!can(actors.teacher, "test:publish"));
  });

  test("only the Owner manages admins and changes roles", () => {
    for (const role of ["student", "invigilator", "teacher", "admin"]) {
      assert.ok(!can(actors[role], "admin:manage"), role);
      assert.ok(!can(actors[role], "role:change"), role);
    }
    assert.ok(can(actors.super_admin, "admin:manage"));
    assert.ok(can(actors.super_admin, "role:change"));
  });
});

describe("who can invite whom", () => {
  const cases = [
    ["admin", "student", true], ["admin", "teacher", true], ["admin", "invigilator", true],
    ["admin", "admin", false], ["admin", "super_admin", false],
    ["super_admin", "admin", true], ["super_admin", "super_admin", false],
    ["teacher", "student", false], ["invigilator", "student", false], ["student", "student", false],
    ["super_admin", "made_up_role", false],
  ];
  for (const [inviter, target, expected] of cases) {
    test(`${inviter} → ${target}: ${expected ? "allowed" : "refused"}`, () => {
      assert.equal(canInviteRole(actors[inviter], target), expected);
    });
  }

  test("nobody can be made an Owner, and only the Owner changes roles", () => {
    assert.equal(canAssignRole(actors.super_admin, "admin"), true);
    assert.equal(canAssignRole(actors.super_admin, "super_admin"), false);
    assert.equal(canAssignRole(actors.admin, "teacher"), false);
  });
});

describe("parsePermissions fails closed", () => {
  test("drops unknown permissions and invalid scopes", () => {
    assert.deepEqual(parsePermissions({ "test:publish": "all", "made:up": "all", "audit:read": "everywhere" }), { "test:publish": "all" });
  });
  for (const raw of [null, undefined, "test:publish", 42, ["test:publish"]]) {
    test(`non-object ${JSON.stringify(raw)} → no permissions`, () => assert.deepEqual(parsePermissions(raw), {}));
  }
});

describe("the database refuses malformed permissions", () => {
  test("a bad scope is rejected by roles_permissions_well_formed", async () => {
    await assert.rejects(db.exec(`update public.roles set permissions = '{"test:publish": "everywhere"}' where key = 'admin'`));
  });
  test("a badly formed key is rejected", async () => {
    await assert.rejects(db.exec(`update public.roles set permissions = '{"Test Publish": "all"}' where key = 'admin'`));
  });
});

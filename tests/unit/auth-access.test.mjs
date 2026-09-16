import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { homeForRole, roleCanAccess, routeArea, signInPath } from "../../src/lib/auth/access.ts";

describe("role-based route access", () => {
  test("classifies every protected application area", () => {
    assert.equal(routeArea("/admin/students/123"), "admin");
    assert.equal(routeArea("/teacher/live/123"), "teacher");
    assert.equal(routeArea("/results/123"), "student");
    assert.equal(routeArea("/login"), null);
  });

  test("keeps each role in its own application", () => {
    assert.equal(roleCanAccess("super_admin", "admin"), true);
    assert.equal(roleCanAccess("admin", "admin"), true);
    assert.equal(roleCanAccess("teacher", "teacher"), true);
    assert.equal(roleCanAccess("invigilator", "teacher"), true);
    assert.equal(roleCanAccess("student", "student"), true);
    assert.equal(roleCanAccess("student", "admin"), false);
    assert.equal(roleCanAccess("admin", "student"), false);
    assert.equal(roleCanAccess("teacher", "admin"), false);
  });

  test("redirects a refused role to its own home", () => {
    assert.equal(homeForRole("super_admin"), "/admin/overview");
    assert.equal(homeForRole("teacher"), "/teacher/dashboard");
    assert.equal(homeForRole("student"), "/home");
    assert.equal(homeForRole("unknown"), "/login");
  });

  test("only carries a local path through login", () => {
    assert.equal(signInPath("/tests/a/start"), "/login?next=%2Ftests%2Fa%2Fstart");
    assert.equal(signInPath("https://evil.example"), "/login");
    assert.equal(signInPath("//evil.example"), "/login");
  });
});

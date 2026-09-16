import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  homeForRole,
  roleCanAccess,
  routeArea,
  routeDecision,
  routeNeedsIdentity,
  signInPath,
} from "../../src/lib/auth/access.ts";

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

describe("entry and login routing", () => {
  const anon = { userId: null, role: null, session: "unverified" };
  const student = { userId: "u1", role: "student", session: "live" };

  test("resolves identity only where the answer depends on it", () => {
    assert.equal(routeNeedsIdentity("/"), true);
    assert.equal(routeNeedsIdentity("/login"), true);
    assert.equal(routeNeedsIdentity("/admin/students"), true);
    assert.equal(routeNeedsIdentity("/home"), true);
    assert.equal(routeNeedsIdentity("/forgot"), false);
    assert.equal(routeNeedsIdentity("/invite/abc"), false);
    assert.equal(routeNeedsIdentity("/setup"), false);
  });

  test("the bare URL always enters through the auth flow", () => {
    assert.deepEqual(routeDecision({ pathname: "/", ...anon }), { kind: "redirect", to: "/login" });
    assert.deepEqual(routeDecision({ pathname: "/", ...student }), { kind: "redirect", to: "/home" });
    assert.deepEqual(routeDecision({ pathname: "/", userId: "u1", role: "admin", session: "live" }), {
      kind: "redirect",
      to: "/admin/overview",
    });
  });

  test("a live session never sees the login form", () => {
    assert.deepEqual(routeDecision({ pathname: "/login", ...student }), { kind: "redirect", to: "/home" });
    assert.deepEqual(routeDecision({ pathname: "/login", ...anon }), { kind: "pass" });
  });

  test("the bootstrap Owner, signed in with no profile yet, reaches the login page", () => {
    // `/login` then sends them to `/setup`; Proxy must not loop them here.
    assert.deepEqual(routeDecision({ pathname: "/login", userId: "owner", role: null, session: "ended" }), {
      kind: "pass",
    });
  });

  test("a dead session outranks every other outcome", () => {
    const ended = { kind: "endSession", to: "/login?ended=1" };
    assert.deepEqual(routeDecision({ pathname: "/home", userId: "u1", role: "student", session: "ended" }), ended);
    assert.deepEqual(routeDecision({ pathname: "/login", userId: "u1", role: "student", session: "ended" }), ended);
    assert.deepEqual(routeDecision({ pathname: "/", userId: "u1", role: "student", session: "ended" }), ended);
  });

  test("a database blip does not sign the institute out", () => {
    assert.deepEqual(routeDecision({ pathname: "/home", userId: "u1", role: "student", session: "unverified" }), {
      kind: "pass",
    });
  });

  test("protected areas keep their sign-in and cross-role rules", () => {
    assert.deepEqual(routeDecision({ pathname: "/tests/a/start", ...anon }), {
      kind: "redirect",
      to: "/login?next=%2Ftests%2Fa%2Fstart",
    });
    assert.deepEqual(routeDecision({ pathname: "/home", userId: "u1", role: null, session: "unverified" }), {
      kind: "redirect",
      to: "/login",
    });
    assert.deepEqual(routeDecision({ pathname: "/admin/students", ...student }), { kind: "redirect", to: "/home" });
    assert.deepEqual(routeDecision({ pathname: "/home", ...student }), { kind: "pass" });
  });

  test("public routes are left alone", () => {
    assert.deepEqual(routeDecision({ pathname: "/forgot", ...anon }), { kind: "pass" });
    assert.deepEqual(routeDecision({ pathname: "/invite/abc", ...student }), { kind: "pass" });
  });
});

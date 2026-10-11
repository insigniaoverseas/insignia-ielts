import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  endedSignInPath,
  homeForRole,
  roleCanAccess,
  routeArea,
  routeDecision,
  routeNeedsIdentity,
  routeNeedsRole,
  safeRelativePath,
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

  test("looks up role and session only where Proxy routes by role", () => {
    // Inside an app area the layout guard reads them; Proxy repeating the
    // query cost a round trip on every click.
    assert.equal(routeNeedsRole("/"), true);
    assert.equal(routeNeedsRole("/login"), true);
    assert.equal(routeNeedsRole("/home"), false);
    assert.equal(routeNeedsRole("/admin/students"), false);
    assert.equal(routeNeedsRole("/teacher/dashboard"), false);
    assert.equal(routeNeedsRole("/attempt/123"), false);
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
    assert.deepEqual(routeDecision({ pathname: "/home", userId: "u1", role: "student", session: "ended" }), {
      kind: "endSession",
      to: "/login?ended=1&next=%2Fhome",
    });
    assert.deepEqual(routeDecision({ pathname: "/login", userId: "u1", role: "student", session: "ended" }), ended);
    assert.deepEqual(routeDecision({ pathname: "/", userId: "u1", role: "student", session: "ended" }), ended);
  });

  test("an admin whose session ended is sent to the staff message (M10-13)", () => {
    assert.deepEqual(routeDecision({ pathname: "/admin/overview", userId: "a1", role: "admin", session: "ended" }), {
      kind: "endSession",
      to: "/login?ended=staff&next=%2Fadmin%2Foverview",
    });
    assert.deepEqual(routeDecision({ pathname: "/login", userId: "t1", role: "teacher", session: "ended" }), {
      kind: "endSession",
      to: "/login?ended=staff",
    });
  });

  test("a session ended at /login keeps where they were going (M9-04)", () => {
    // The guard sends a student pulled out of a test to /login?ended=1&next=…;
    // Proxy ends the session there and must not drop the way back.
    assert.deepEqual(
      routeDecision({ pathname: "/login", userId: "u1", role: "student", session: "ended", next: "/attempt/a1" }),
      { kind: "endSession", to: "/login?ended=1&next=%2Fattempt%2Fa1" },
    );
    assert.deepEqual(
      routeDecision({ pathname: "/login", userId: "u1", role: "student", session: "ended", next: "//evil.com" }),
      { kind: "endSession", to: "/login?ended=1" },
    );
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

describe("after sign-in, only ever back to this site (open redirect)", () => {
  test("keeps a real path, with its query and hash", () => {
    assert.equal(safeRelativePath("/review/abc?show=all#q3"), "/review/abc?show=all#q3");
    assert.equal(safeRelativePath("/home"), "/home");
  });

  test("refuses everything a browser would send elsewhere", () => {
    for (const bad of [
      "https://evil.com", "//evil.com", "/\\evil.com", "/\\/evil.com", "\\\\evil.com",
      "/\t/evil.com", "/\n/evil.com", "/\r//evil.com", "/\u0000/evil.com",
      "javascript:alert(1)", "evil.com", "", null, undefined,
    ]) {
      assert.equal(safeRelativePath(bad), null, JSON.stringify(bad));
    }
  });

  test("the sign-in link never carries a foreign destination", () => {
    assert.equal(signInPath("/\\evil.com"), "/login");
    assert.equal(signInPath("/tests?tab=done"), "/login?next=%2Ftests%3Ftab%3Ddone");
  });
});

describe("endedSignInPath", () => {
  test("keeps a path on this site and nothing else", () => {
    assert.equal(endedSignInPath("/attempt/a1"), "/login?ended=1&next=%2Fattempt%2Fa1");
    assert.equal(endedSignInPath(undefined), "/login?ended=1");
    assert.equal(endedSignInPath(null), "/login?ended=1");
    assert.equal(endedSignInPath("/"), "/login?ended=1");
    assert.equal(endedSignInPath("/login"), "/login?ended=1");
    assert.equal(endedSignInPath("https://evil.com/x"), "/login?ended=1");
    assert.equal(endedSignInPath("/\\evil.com"), "/login?ended=1");
  });
  test("staff get their own sign-in message — no 'your answers are saved'", () => {
    assert.equal(endedSignInPath("/admin/overview", "admin"), "/login?ended=staff&next=%2Fadmin%2Foverview");
    assert.equal(endedSignInPath(null, "super_admin"), "/login?ended=staff");
    assert.equal(endedSignInPath(null, "teacher"), "/login?ended=staff");
    assert.equal(endedSignInPath(null, "invigilator"), "/login?ended=staff");
  });
  test("students, and an unknown role, keep the student message", () => {
    assert.equal(endedSignInPath("/attempt/a1", "student"), "/login?ended=1&next=%2Fattempt%2Fa1");
    assert.equal(endedSignInPath(null, null), "/login?ended=1");
  });
});

// lib/security/headers.ts — the CSP rules the product depends on (MVP-1 §8).
//   npm run test:unit
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { STATIC_SECURITY_HEADERS, contentSecurityPolicy, generateNonce, securityHeaders } from "../../src/lib/security/headers.ts";

const directive = (csp, name) => csp.split("; ").find((d) => d.startsWith(`${name} `)) ?? "";

describe("nonce", () => {
  test("is 16 random bytes, base64", () => {
    const n = generateNonce();
    assert.match(n, /^[A-Za-z0-9+/]{22}==$/);
  });
  test("is different every time", () => {
    const seen = new Set(Array.from({ length: 1000 }, generateNonce));
    assert.equal(seen.size, 1000);
  });
});

describe("production CSP", () => {
  const csp = contentSecurityPolicy("abc123");

  test("scripts need this request's nonce — no 'unsafe-inline', no 'unsafe-eval'", () => {
    const scripts = directive(csp, "script-src");
    assert.match(scripts, /'nonce-abc123'/);
    assert.match(scripts, /'strict-dynamic'/);
    assert.doesNotMatch(scripts, /unsafe-inline|unsafe-eval/);
  });
  test("no plugins, no framing, no base-tag or form hijack", () => {
    assert.equal(directive(csp, "object-src"), "object-src 'none'");
    assert.equal(directive(csp, "frame-ancestors"), "frame-ancestors 'none'");
    assert.equal(directive(csp, "base-uri"), "base-uri 'self'");
    assert.equal(directive(csp, "form-action"), "form-action 'self'");
  });
  test("the browser talks only to our own origin", () => {
    assert.equal(directive(csp, "connect-src"), "connect-src 'self'");
    assert.equal(directive(csp, "default-src"), "default-src 'self'");
  });
  test("forces HTTPS", () => assert.ok(csp.includes("upgrade-insecure-requests")));
  test("no wildcard sources anywhere", () => assert.doesNotMatch(csp, /\s\*(\s|;|$)|https:\s|http:\s/));
});

describe("development CSP", () => {
  const csp = contentSecurityPolicy("abc123", { isDev: true });
  test("allows 'unsafe-eval' for React dev tooling only in dev", () => assert.match(directive(csp, "script-src"), /'unsafe-eval'/));
  test("doesn't force HTTPS on localhost", () => assert.ok(!csp.includes("upgrade-insecure-requests")));
});

describe("static headers", () => {
  test("HSTS, nosniff, no framing, referrer policy", () => {
    assert.match(STATIC_SECURITY_HEADERS["Strict-Transport-Security"], /max-age=\d{8}/);
    assert.equal(STATIC_SECURITY_HEADERS["X-Content-Type-Options"], "nosniff");
    assert.equal(STATIC_SECURITY_HEADERS["X-Frame-Options"], "DENY");
    assert.equal(STATIC_SECURITY_HEADERS["Referrer-Policy"], "strict-origin-when-cross-origin");
  });
  test("securityHeaders() = CSP + every static header", () => {
    const h = securityHeaders("n");
    assert.ok(h["Content-Security-Policy"].includes("'nonce-n'"));
    for (const [k, v] of Object.entries(STATIC_SECURITY_HEADERS)) assert.equal(h[k], v);
  });
  test("public/_headers carries the same static headers for static files", () => {
    const file = readFileSync(new URL("../../public/_headers", import.meta.url), "utf8");
    for (const name of ["Strict-Transport-Security", "X-Content-Type-Options", "Referrer-Policy", "X-Frame-Options"]) {
      assert.ok(file.includes(`${name}: ${STATIC_SECURITY_HEADERS[name]}`), `${name} differs between _headers and headers.ts`);
    }
    assert.ok(file.includes("Cache-Control: public,max-age=31536000,immutable"), "OpenNext's static cache rule must stay");
  });
});

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { secureSessionCookie } from "../../src/lib/auth/session-cookie.ts";

describe("application session cookie security", () => {
  test("uses Secure behind an HTTPS proxy", () => {
    assert.equal(
      secureSessionCookie({ forwardedProto: "https", host: "ielts.example", nodeEnv: "development" }),
      true,
    );
  });

  test("does not use Secure behind an HTTP proxy", () => {
    assert.equal(
      secureSessionCookie({ forwardedProto: "http", host: "ielts.example", nodeEnv: "production" }),
      false,
    );
  });

  test("keeps localhost cookies usable even under a production build", () => {
    assert.equal(secureSessionCookie({ forwardedProto: null, host: "localhost:3000", nodeEnv: "production" }), false);
    assert.equal(secureSessionCookie({ forwardedProto: null, host: "[::1]:3000", nodeEnv: "production" }), false);
  });

  test("defaults a production domain to Secure", () => {
    assert.equal(secureSessionCookie({ forwardedProto: null, host: "ielts.example", nodeEnv: "production" }), true);
  });

  test("defaults a development request to a non-Secure cookie", () => {
    assert.equal(secureSessionCookie({ forwardedProto: null, host: "dev.ielts.example", nodeEnv: "development" }), false);
  });
});

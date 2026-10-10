import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { isAcceptedSiteverify } from "../../src/lib/turnstile.ts";

describe("Turnstile Siteverify replies", () => {
  test("a real reply must succeed and name this form's action", () => {
    assert.equal(isAcceptedSiteverify({ success: true, action: "login" }, "login"), true);
    assert.equal(isAcceptedSiteverify({ success: true, action: "accept-invitation" }, "login"), false);
    assert.equal(isAcceptedSiteverify({ success: true }, "login"), false, "no action, no testing flag: refused");
    assert.equal(isAcceptedSiteverify({ success: false, action: "login" }, "login"), false);
  });

  test("Cloudflare's test keys pass on localhost, though they report no action", () => {
    const testing = { success: true, metadata: { result_with_testing_key: true } };
    assert.equal(isAcceptedSiteverify(testing, "login"), true);
    assert.equal(isAcceptedSiteverify({ ...testing, success: false }, "login"), false);
    assert.equal(isAcceptedSiteverify({ ...testing, action: "other" }, "login"), false, "an action it does report must still match");
  });
});

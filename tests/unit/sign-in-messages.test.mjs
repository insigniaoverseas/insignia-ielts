import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { SIGN_IN_MESSAGES, canSignIn, emailRequestProblem } from "../../src/lib/auth/sign-in-messages.ts";

describe("sign-in errors say what is wrong (M10-11)", () => {
  test("a wrong email and a wrong password get different messages", () => {
    assert.notEqual(SIGN_IN_MESSAGES.noAccount, SIGN_IN_MESSAGES.wrongPassword);
    assert.match(SIGN_IN_MESSAGES.noAccount, /no account with this email/i);
    assert.match(SIGN_IN_MESSAGES.wrongPassword, /password isn't right/i);
  });
  test("a switched-off account sends them to their teacher", () => {
    assert.match(SIGN_IN_MESSAGES.switchedOff, /ask your teacher/i);
  });
  test("a wrong code and an expired one are told apart", () => {
    assert.notEqual(SIGN_IN_MESSAGES.codeWrong, SIGN_IN_MESSAGES.codeGone);
  });
  test("every message is plain words — no codes or jargon", () => {
    for (const text of Object.values(SIGN_IN_MESSAGES)) assert.doesNotMatch(text, /error|invalid|credential|401|403/i, text);
  });
});

describe("email requests", () => {
  test("sent is not a problem", () => assert.equal(emailRequestProblem("sent"), null));
  test("each refusal has its own sentence", () => {
    assert.equal(emailRequestProblem("no_account"), SIGN_IN_MESSAGES.noAccount);
    assert.equal(emailRequestProblem("switched_off"), SIGN_IN_MESSAGES.switchedOff);
    assert.equal(emailRequestProblem("too_many"), SIGN_IN_MESSAGES.tooManyEmails);
    assert.equal(emailRequestProblem("failed"), SIGN_IN_MESSAGES.emailFailed);
  });
});

describe("who may sign in", () => {
  test("only active accounts — fails closed", () => {
    assert.equal(canSignIn("active"), true);
    for (const status of ["suspended", "inactive", "", "Active"]) assert.equal(canSignIn(status), false, status);
  });
});

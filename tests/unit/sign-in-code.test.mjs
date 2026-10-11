import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  CODE_TTL_MINUTES,
  MAX_CODE_ATTEMPTS,
  MAX_CODE_REQUESTS,
  displaySignInCode,
  hashSignInCode,
  mintSignInCode,
  normaliseSignInCode,
} from "../../src/lib/auth/sign-in-code-rules.ts";
import { signInCodeEmail } from "../../src/lib/mail/templates.ts";

describe("minting a code", () => {
  test("always six digits, leading zeros kept", () => {
    for (let i = 0; i < 2000; i++) assert.match(mintSignInCode(), /^\d{6}$/);
  });
  test("not the same code twice in a row (it is random)", () => {
    const seen = new Set(Array.from({ length: 200 }, () => mintSignInCode()));
    assert.ok(seen.size > 190, `only ${seen.size} distinct codes in 200`);
  });
});

describe("reading what was typed", () => {
  test("spaces and dashes are forgiven — '482 913' is how the email shows it", () => {
    assert.equal(normaliseSignInCode("482 913"), "482913");
    assert.equal(normaliseSignInCode(" 482-913 "), "482913");
  });
  test("anything that isn't six digits is refused before it costs a guess", () => {
    for (const bad of ["", "12345", "1234567", "12a456", "４８２９１３"]) assert.equal(normaliseSignInCode(bad), null, bad);
  });
  test("display splits it 3 + 3", () => assert.equal(displaySignInCode("012345"), "012 345"));
});

describe("hashing", () => {
  test("bound to the user — the same code hashes differently for someone else", async () => {
    const a = await hashSignInCode("user-a", "123456");
    assert.notEqual(a, await hashSignInCode("user-b", "123456"));
    assert.equal(a, await hashSignInCode("user-a", "123456"));
    assert.match(a, /^[0-9a-f]{64}$/);
  });
});

describe("limits (MVP-1 §8: codes must not become a way to guess into an account)", () => {
  test("ten minutes, five guesses per code, three codes per 15 minutes", () => {
    assert.equal(CODE_TTL_MINUTES, 10);
    assert.equal(MAX_CODE_ATTEMPTS, 5);
    assert.equal(MAX_CODE_REQUESTS, 3);
  });
});

describe("the email", () => {
  const mail = signInCodeEmail({ name: "Priya Sharma", branchName: "Insignia <Main>", code: "482 913", validFor: "10 minutes" });
  test("the code is in the subject, so a phone notification shows it", () => assert.match(mail.subject, /^482 913 /));
  test("no link — it would open on the phone, not the PC", () => {
    assert.doesNotMatch(mail.html, /<a\s/);
    assert.doesNotMatch(mail.text, /https?:\/\//);
  });
  test("names are escaped", () => {
    assert.match(mail.html, /Insignia &lt;Main&gt;/);
    assert.doesNotMatch(mail.html, /<Main>/);
  });
  test("says how long it works", () => assert.match(mail.text, /10 minutes/));
});

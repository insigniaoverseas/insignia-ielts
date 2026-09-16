// Invitation tokens and password rules (M1-02, M1-06).
//   npm run test:unit
import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { hashInvitationToken, isPlausibleToken, mintInvitationToken, MIN_TOKEN_LENGTH } from "../../src/lib/auth/tokens.ts";
import { PASSWORD_RULES, firstPasswordProblem, isAcceptablePassword, MIN_PASSWORD_LENGTH } from "../../src/lib/auth/password.ts";

describe("invitation tokens", () => {
  test("mints a URL-safe token long enough to be unguessable", async () => {
    const { token } = await mintInvitationToken();
    assert.match(token, /^[A-Za-z0-9_-]+$/, "must survive a URL path segment unescaped");
    // 32 random bytes in base64url, unpadded.
    assert.equal(token.length, 43);
  });

  test("never mints the same token twice", async () => {
    const seen = new Set();
    for (let i = 0; i < 200; i += 1) {
      const { token } = await mintInvitationToken();
      assert.equal(seen.has(token), false, "a repeat means the entropy source is broken");
      seen.add(token);
    }
  });

  test("the hash it stores is not the token it emails", async () => {
    const { token, tokenHash } = await mintInvitationToken();
    assert.notEqual(token, tokenHash);
    assert.match(tokenHash, /^[0-9a-f]{64}$/, "lowercase hex SHA-256");
  });

  test("hashing is deterministic, so the lookup finds the row", async () => {
    const { token, tokenHash } = await mintInvitationToken();
    assert.equal(await hashInvitationToken(token), tokenHash);
  });

  test("a different token gives a different hash", async () => {
    const a = await hashInvitationToken("aaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    const b = await hashInvitationToken("aaaaaaaaaaaaaaaaaaaaaaaaaaab");
    assert.notEqual(a, b);
  });

  describe("shape check, so a probe costs no database round trip", () => {
    test("accepts a real token", async () => {
      const { token } = await mintInvitationToken();
      assert.equal(isPlausibleToken(token), true);
    });

    test("rejects a truncated paste", () => {
      assert.equal(isPlausibleToken("abc"), false);
      assert.equal(isPlausibleToken("a".repeat(MIN_TOKEN_LENGTH - 1)), false);
    });

    test("rejects anything that is not base64url", () => {
      // The characters an injection attempt or a mangled email would carry.
      for (const bad of ["a".repeat(40) + "/", "a".repeat(40) + "+", "a".repeat(40) + "'", "a".repeat(40) + " ", "a".repeat(40) + "%00"]) {
        assert.equal(isPlausibleToken(bad), false, `should refuse ${JSON.stringify(bad)}`);
      }
    });

    test("rejects an empty string", () => {
      assert.equal(isPlausibleToken(""), false);
    });
  });
});

describe("password rules", () => {
  test("the screen and the server share one definition", () => {
    // If this ever needs changing, the form ticks and the server check move
    // together — which is the entire reason the rules live in one module.
    assert.equal(PASSWORD_RULES.length, 3);
    assert.equal(MIN_PASSWORD_LENGTH, 8);
  });

  test("accepts a reasonable password", () => {
    assert.equal(isAcceptablePassword("banana42"), true);
    assert.equal(firstPasswordProblem("banana42"), null);
  });

  test("rejects one that is too short, and says so", () => {
    assert.equal(isAcceptablePassword("ban42"), false);
    assert.match(firstPasswordProblem("ban42") ?? "", /at least 8 characters/i);
  });

  test("rejects letters alone", () => {
    assert.equal(isAcceptablePassword("bananabread"), false);
    assert.match(firstPasswordProblem("bananabread") ?? "", /number or symbol/i);
  });

  test("rejects digits alone", () => {
    assert.equal(isAcceptablePassword("12345678"), false);
    assert.match(firstPasswordProblem("12345678") ?? "", /a letter/i);
  });

  test("a symbol counts as 'a number or symbol'", () => {
    assert.equal(isAcceptablePassword("banana!!"), true);
  });

  test("reports the first unmet rule, not all of them", () => {
    // "12" fails both length and 'a letter'; the message names length first,
    // because that is the order the screen lists them in.
    assert.match(firstPasswordProblem("12") ?? "", /at least 8 characters/i);
  });
});

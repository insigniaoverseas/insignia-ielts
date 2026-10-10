import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { audioCacheKey, audioCacheOwnerPrefix, isOwnedAudioKey } from "../../src/lib/audio-cache-key.ts";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const TEST = "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA";

describe("audio cache keys (M2-06, D10)", () => {
  test("name the owner, the test and the version — never a signature", () => {
    assert.equal(audioCacheKey(A, TEST, 3), `/audio-cache/${A}/${TEST.toLowerCase()}/v3`);
  });

  test("another student's copy is never theirs, as a path or as an absolute URL", () => {
    const keyOfA = audioCacheKey(A, TEST, 1);
    assert.equal(isOwnedAudioKey(keyOfA, A), true);
    assert.equal(isOwnedAudioKey(keyOfA, B), false);
    assert.equal(isOwnedAudioKey(`https://ielts.example${keyOfA}`, A), true);
    assert.equal(isOwnedAudioKey(`https://ielts.example${keyOfA}`, B), false);
  });

  test("an owner id cannot be a prefix of another's", () => {
    assert.ok(audioCacheOwnerPrefix(A).endsWith("/"));
  });

  test("refuses anything that could escape its owner's prefix", () => {
    assert.throws(() => audioCacheKey("../other", TEST, 1));
    assert.throws(() => audioCacheKey(A, "../../x", 1));
    assert.throws(() => audioCacheKey(A, TEST, 0));
    assert.throws(() => audioCacheKey(A, TEST, 1.5));
  });
});

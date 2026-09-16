// R2 server-generated keys, attempt scoping and real five-minute presigning.
//   npm run test:unit
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

import {
  R2_SIGNED_URL_TTL_SECONDS,
  R2AccessError,
  answerKeyObjectKey,
  assetObjectKey,
  audioObjectKey,
  authorizeSignedDownload,
  contentObjectKey,
  parseR2ObjectKey,
  transcriptObjectKey,
} from "../../src/lib/r2-keys.ts";

const TEST_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_TEST_ID = "22222222-2222-4222-8222-222222222222";
const ATTEMPT_ID = "33333333-3333-4333-8333-333333333333";

const access = (overrides = {}) => ({
  attemptId: ATTEMPT_ID,
  testId: TEST_ID,
  contentVersion: 7,
  status: "in_progress",
  resultsReleased: false,
  ...overrides,
});

describe("server-generated R2 keys", () => {
  test("builds the prescribed, versioned layout", () => {
    assert.equal(contentObjectKey(TEST_ID, 7), `tests/${TEST_ID}/v7/content.json`);
    assert.equal(answerKeyObjectKey(TEST_ID, 7), `tests/${TEST_ID}/v7/key.json`);
    assert.equal(transcriptObjectKey(TEST_ID, 7), `tests/${TEST_ID}/v7/transcript.json`);
    assert.equal(assetObjectKey(TEST_ID, 7, 2, "webp"), `tests/${TEST_ID}/v7/assets/2.webp`);
    assert.equal(audioObjectKey(TEST_ID, 7), `audio/${TEST_ID}/v7/test.mp3`);
  });

  test("rejects malformed ids, versions, ordinals and extensions", () => {
    assert.throws(() => contentObjectKey("../escape", 1), R2AccessError);
    assert.throws(() => contentObjectKey(TEST_ID, 0), R2AccessError);
    assert.throws(() => contentObjectKey(TEST_ID, 1.5), R2AccessError);
    assert.throws(() => assetObjectKey(TEST_ID, 1, 0, "png"), R2AccessError);
    assert.throws(() => assetObjectKey(TEST_ID, 1, 1, "svg"), R2AccessError);
  });

  test("asset names are an ordinal plus an allowlisted extension only", () => {
    const hostileName = "../../teacher-answer-key.png";
    const key = assetObjectKey(TEST_ID, 7, 1, "png");
    assert.doesNotMatch(key, new RegExp(hostileName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.equal(key, `tests/${TEST_ID}/v7/assets/1.png`);
  });

  test("parses only canonical keys and refuses traversal or extra components", () => {
    assert.deepEqual(parseR2ObjectKey(audioObjectKey(TEST_ID, 7)), {
      key: `audio/${TEST_ID}/v7/test.mp3`,
      kind: "audio",
      bucket: "audio",
      testId: TEST_ID,
      contentVersion: 7,
    });
    for (const key of [
      `tests/${TEST_ID}/v7/assets/../key.json`,
      `tests/${TEST_ID}/v07/content.json`,
      `tests/${TEST_ID}/v7/answers.json`,
      `audio/${TEST_ID}/v7/my-file.mp3`,
      `/audio/${TEST_ID}/v7/test.mp3`,
    ]) {
      assert.throws(() => parseR2ObjectKey(key), R2AccessError, key);
    }
  });
});

describe("signed-download policy", () => {
  test("has a fixed five-minute TTL", () => assert.equal(R2_SIGNED_URL_TTL_SECONDS, 300));

  test("refuses key.json unconditionally, before attempt context", () => {
    assert.throws(() => authorizeSignedDownload(answerKeyObjectKey(TEST_ID, 7)), /key\.json is never signable/);
  });

  test("refuses content.json unconditionally", () => {
    assert.throws(() => authorizeSignedDownload(contentObjectKey(TEST_ID, 7), access()), /never signable/);
  });

  test("requires matching server-resolved attempt context for audio and assets", () => {
    const audio = audioObjectKey(TEST_ID, 7);
    assert.throws(() => authorizeSignedDownload(audio), /Attempt context/);
    assert.throws(() => authorizeSignedDownload(audio, access({ testId: OTHER_TEST_ID })), /does not belong/);
    assert.throws(() => authorizeSignedDownload(audio, access({ contentVersion: 8 })), /does not belong/);
    assert.throws(() => authorizeSignedDownload(audio, access({ status: "expired" })), /in-progress attempt/);
    assert.equal(authorizeSignedDownload(audio, access()).kind, "audio");
    assert.equal(authorizeSignedDownload(assetObjectKey(TEST_ID, 7, 1, "png"), access()).kind, "asset");
  });

  test("releases transcripts only for submitted attempts whose results are released", () => {
    const transcript = transcriptObjectKey(TEST_ID, 7);
    assert.throws(() => authorizeSignedDownload(transcript, access()), /submitted attempt with released results/);
    assert.throws(
      () => authorizeSignedDownload(transcript, access({ status: "submitted", resultsReleased: false })),
      /submitted attempt with released results/,
    );
    assert.throws(
      () => authorizeSignedDownload(transcript, access({ status: "in_progress", resultsReleased: true })),
      /submitted attempt with released results/,
    );
    assert.equal(
      authorizeSignedDownload(transcript, access({ status: "submitted", resultsReleased: true })).kind,
      "transcript",
    );
  });
});

describe("real S3-compatible signer", () => {
  test("signUrl refuses protected JSON before reading missing credentials and signs an exact GET for 300 seconds", () => {
    const moduleUrl = new URL("../../src/lib/r2.ts", import.meta.url).href;
    const childSource = `
      const r2 = await import(${JSON.stringify(moduleUrl)});
      const testId = ${JSON.stringify(TEST_ID)};
      const attemptId = ${JSON.stringify(ATTEMPT_ID)};
      const refused = [];
      for (const key of [r2.answerKeyObjectKey(testId, 7), r2.contentObjectKey(testId, 7)]) {
        try { await r2.signUrl(key); } catch (error) { refused.push(error.message); }
      }
      const signed = await r2.signUrl(r2.audioObjectKey(testId, 7), {
        attemptId,
        testId,
        contentVersion: 7,
        status: "in_progress",
        resultsReleased: false,
      }, {
        accountId: "a".repeat(32),
        accessKeyId: "test-access-key",
        secretAccessKey: "test-secret-key",
      });
      console.log(JSON.stringify({ refused, signed }));
    `;
    const child = spawnSync(process.execPath, ["--conditions=react-server", "--input-type=module", "--eval", childSource], {
      encoding: "utf8",
    });
    assert.equal(child.status, 0, child.stderr);
    const result = JSON.parse(child.stdout.trim());
    assert.deepEqual(result.refused, [
      "key.json is never signable",
      "content.json is binding-read only and never signable",
    ]);
    const url = new URL(result.signed);
    assert.equal(url.origin, `https://${"a".repeat(32)}.r2.cloudflarestorage.com`);
    assert.equal(url.pathname, `/insignia-ielts-audio/audio/${TEST_ID}/v7/test.mp3`);
    assert.equal(url.searchParams.get("X-Amz-Expires"), "300");
    assert.equal(url.searchParams.get("X-Amz-Algorithm"), "AWS4-HMAC-SHA256");
    assert.ok(url.searchParams.has("X-Amz-Signature"));
    assert.doesNotMatch(result.signed, /test-secret-key/);
  });
});

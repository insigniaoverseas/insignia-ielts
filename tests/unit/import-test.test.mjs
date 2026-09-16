// The importer is the sole answer-key split and upload transaction (M0-17).
//   npm run test:unit
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  TestImportError,
  importTest,
  inspectMp3,
  prepareTestImport,
} from "../../src/lib/import/import-test.ts";

const docs = readFileSync(new URL("../../docs/test-authoring.md", import.meta.url), "utf8");
const TEST_ID = "11111111-1111-4111-8111-111111111111";
const ACTOR_ID = "22222222-2222-4222-8222-222222222222";

function documentedSample(name) {
  const pattern = new RegExp(`<!-- sample:${name}:start -->\\s*\`\`\`json\\n([\\s\\S]*?)\\n\`\`\`\\s*<!-- sample:${name}:end -->`);
  const match = docs.match(pattern);
  assert.ok(match, `missing ${name} sample`);
  return JSON.parse(match[1]);
}

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
// MPEG-1 Layer III, 64 kbps, 44.1 kHz, mono.
const mp3 = new Uint8Array([0xff, 0xfb, 0x50, 0xc0]);

function everyKey(value, found = []) {
  if (Array.isArray(value)) for (const item of value) everyKey(item, found);
  else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      found.push(key);
      everyKey(child, found);
    }
  }
  return found;
}

describe("canonical answer-key split", () => {
  test("content.json contains none of the four protected answer fields", () => {
    const input = documentedSample("general");
    input.sections[0].passages[0].html += '<script>stealAnswers()</script>';
    input.sections[0].question_groups[0].instructions += '<img src=x onerror="steal()">';
    input.sections[0].question_groups[0].questions[0].prompt += '<iframe src="evil"></iframe>';
    const prepared = prepareTestImport(input, {}, { testId: TEST_ID, actorId: ACTOR_ID });

    const protectedKeys = new Set(["answer", "accepted_variants", "marks", "word_limit"]);
    assert.deepEqual(everyKey(prepared.content).filter((key) => protectedKeys.has(key)), []);
    assert.ok(everyKey(prepared.answerKey).includes("answer"));
    assert.ok(everyKey(prepared.answerKey).includes("marks"));
    assert.doesNotMatch(JSON.stringify(prepared.content), /script|iframe|onerror|stealAnswers/);
  });

  test("sanitises HTML and rejects a prompt that becomes empty", () => {
    const input = documentedSample("general");
    input.sections[0].question_groups[0].questions[0].prompt = "<script>only executable text</script>";
    assert.throws(
      () => prepareTestImport(input, {}, { testId: TEST_ID, actorId: ACTOR_ID }),
      /empty after sanitising/,
    );
  });

  test("replaces author file names with generated asset ordinals", () => {
    const input = documentedSample("academic");
    const files = { "tram-parts.webp": { bytes: webp, mediaType: "image/webp" } };
    const prepared = prepareTestImport(input, files, { testId: TEST_ID, actorId: ACTOR_ID });
    assert.equal(prepared.objects[2].key, `tests/${TEST_ID}/v1/assets/1.webp`);
    assert.deepEqual(prepared.content.assets, [{ id: "tram-parts", alt: "Labelled diagram of a modern tram", ordinal: 1 }]);
    assert.doesNotMatch(JSON.stringify(prepared.content), /tram-parts\.webp/);
  });
});

describe("binary boundary", () => {
  test("accepts the prescribed 64 kbps mono MP3 and emits all Listening objects", () => {
    assert.deepEqual(inspectMp3(mp3), { bitrateKbps: 64, mono: true });
    const input = documentedSample("listening");
    const files = {
      "club-plan.png": { bytes: png, mediaType: "image/png" },
      "test.mp3": { bytes: mp3, mediaType: "audio/mpeg" },
    };
    const prepared = prepareTestImport(input, files, { testId: TEST_ID, actorId: ACTOR_ID });
    assert.deepEqual(prepared.objects.map((object) => object.key), [
      `tests/${TEST_ID}/v1/content.json`,
      `tests/${TEST_ID}/v1/key.json`,
      `tests/${TEST_ID}/v1/transcript.json`,
      `tests/${TEST_ID}/v1/assets/1.png`,
      `audio/${TEST_ID}/v1/test.mp3`,
    ]);
    assert.equal(prepared.row.total_questions, 11);
    assert.equal(prepared.row.r2_audio_key, `audio/${TEST_ID}/v1/test.mp3`);
  });

  test("rejects MIME spoofing, wrong magic bytes, stereo and bitrate above 64 kbps", () => {
    const academic = documentedSample("academic");
    assert.throws(
      () => prepareTestImport(academic, { "tram-parts.webp": { bytes: webp, mediaType: "image/png" } }, { testId: TEST_ID, actorId: ACTOR_ID }),
      /expected image\/webp/,
    );
    assert.throws(
      () => prepareTestImport(academic, { "tram-parts.webp": { bytes: png, mediaType: "image/webp" } }, { testId: TEST_ID, actorId: ACTOR_ID }),
      /does not match/,
    );

    const listening = documentedSample("listening");
    const base = { "club-plan.png": { bytes: png, mediaType: "image/png" } };
    assert.throws(
      () => prepareTestImport(listening, { ...base, "test.mp3": { bytes: new Uint8Array([0xff, 0xfb, 0x90, 0xc0]), mediaType: "audio/mpeg" } }, { testId: TEST_ID, actorId: ACTOR_ID }),
      /maximum is 64 kbps/,
    );
    assert.throws(
      () => prepareTestImport(listening, { ...base, "test.mp3": { bytes: new Uint8Array([0xff, 0xfb, 0x50, 0x00]), mediaType: "audio/mpeg" } }, { testId: TEST_ID, actorId: ACTOR_ID }),
      /must be mono/,
    );
  });

  test("requires every reference and refuses unreferenced files", () => {
    const academic = documentedSample("academic");
    assert.throws(() => prepareTestImport(academic, {}, { testId: TEST_ID, actorId: ACTOR_ID }), /Missing referenced file/);
    assert.throws(
      () => prepareTestImport(academic, {
        "tram-parts.webp": { bytes: webp, mediaType: "image/webp" },
        "extra.png": { bytes: png, mediaType: "image/png" },
      }, { testId: TEST_ID, actorId: ACTOR_ID }),
      /Unreferenced file supplied/,
    );
  });
});

describe("upload transaction", () => {
  test("uploads private objects before creating one draft catalogue row", async () => {
    const calls = [];
    const prepared = await importTest(documentedSample("general"), {}, ACTOR_ID, {
      newId: () => TEST_ID,
      async putObject(object) { calls.push(`put:${object.key}`); },
      async deleteObject(_bucket, key) { calls.push(`delete:${key}`); },
      async createDraft(row) { calls.push(`draft:${row.id}`); },
    });
    assert.equal(prepared.row.status, "draft");
    assert.deepEqual(calls, [
      `put:tests/${TEST_ID}/v1/content.json`,
      `put:tests/${TEST_ID}/v1/key.json`,
      `draft:${TEST_ID}`,
    ]);
  });

  test("rolls uploaded objects back in reverse order if the catalogue write fails", async () => {
    const deleted = [];
    await assert.rejects(
      importTest(documentedSample("general"), {}, ACTOR_ID, {
        newId: () => TEST_ID,
        async putObject() {},
        async deleteObject(_bucket, key) { deleted.push(key); },
        async createDraft() { throw new Error("database unavailable"); },
      }),
      (error) => error instanceof TestImportError && error.cause?.message === "database unavailable",
    );
    assert.deepEqual(deleted, [
      `tests/${TEST_ID}/v1/key.json`,
      `tests/${TEST_ID}/v1/content.json`,
    ]);
  });
});

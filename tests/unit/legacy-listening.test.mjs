// M0-20: the prototype's 40 answers become a canonical private key only.
//   npm run test:unit
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { describe, test } from "node:test";

import { QUESTIONS, TEST } from "../../Design files/Prioritizing project scope/ielts-data.js";
import { prepareTestImport } from "../../src/lib/import/import-test.ts";
import { buildLegacyListeningUpload } from "../../src/lib/import/legacy-listening.ts";

const TEST_ID = "11111111-1111-4111-8111-111111111111";
const ACTOR_ID = "22222222-2222-4222-8222-222222222222";
const mp3 = new Uint8Array([0xff, 0xfb, 0x50, 0xc0]);

function build() {
  return buildLegacyListeningUpload(TEST, QUESTIONS, {
    audioFile: "listening-mock-2.mp3",
    audioDurationSeconds: 1680,
    sectionEndsSeconds: [420, 840, 1260, 1680],
  });
}

function convertedQuestions(upload) {
  return upload.sections.flatMap((section) =>
    section.question_groups.flatMap((group) =>
      group.questions.map((question) => ({ section, group, question })),
    ),
  );
}

function keys(value, found = []) {
  if (Array.isArray(value)) for (const item of value) keys(item, found);
  else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      found.push(key);
      keys(child, found);
    }
  }
  return found;
}

describe("legacy Listening conversion", () => {
  test("converts all 40 source questions and preserves every authored answer", () => {
    const upload = build();
    const converted = convertedQuestions(upload);

    assert.equal(upload.sections.length, 4);
    assert.deepEqual(converted.map(({ question }) => question.n), Array.from({ length: 40 }, (_, index) => index + 1));
    assert.deepEqual(
      converted.map(({ question }) => question.answer[0]),
      QUESTIONS.map((question) => question.answer),
    );
    assert.equal(converted.reduce((total, { question }) => total + question.marks, 0), 40);
  });

  test("uses only Listening-valid canonical types and preserves legacy choice banks", () => {
    const converted = convertedQuestions(build());
    const q31 = converted.find(({ question }) => question.n === 31);
    const q17 = converted.find(({ question }) => question.n === 17);

    assert.equal(q31.group.type, "mcq_single");
    assert.deepEqual(q31.question.options, ["True", "False", "Not Given"]);
    assert.equal(q17.group.type, "matching");
    assert.deepEqual(q17.group.option_bank, QUESTIONS.find((question) => question.n === 17).options);
    assert.equal("options" in q17.question, false);
  });

  test("removes embedded question numbers and preserves the legacy final-period comparison", () => {
    const q5 = convertedQuestions(build()).find(({ question }) => question.n === 5).question;
    assert.doesNotMatch(q5.prompt, /<strong>5<\/strong>/);
    assert.deepEqual(q5.answer, ["9 p.m."]);
    assert.deepEqual(q5.accepted_variants, ["9 p.m"]);
  });

  test("requires real contiguous timing metadata instead of guessing it", () => {
    assert.throws(
      () => buildLegacyListeningUpload(TEST, QUESTIONS, {
        audioFile: "listening-mock-2.mp3",
        audioDurationSeconds: 1680,
        sectionEndsSeconds: [420, 840, 1260, 1679],
      }),
      /final section end must equal the audio duration/,
    );
    assert.throws(
      () => buildLegacyListeningUpload(TEST, QUESTIONS, {
        audioFile: "listening-mock-2.mp3",
        audioDurationSeconds: 1680,
        sectionEndsSeconds: [420, 840, 840, 1680],
      }),
      /section 3 end must be after 840/,
    );
  });

  test("fails when a source answer is missing", () => {
    const broken = structuredClone(QUESTIONS);
    broken[19].answer = "";
    assert.throws(
      () => buildLegacyListeningUpload(TEST, broken, {
        audioFile: "listening-mock-2.mp3",
        audioDurationSeconds: 1680,
        sectionEndsSeconds: [420, 840, 1260, 1680],
      }),
      /too_small|Too small|at least 1 character/,
    );
  });
});

describe("legacy Listening key split", () => {
  test("produces 40 private key entries while content contains no scoring fields", () => {
    const prepared = prepareTestImport(
      build(),
      { "listening-mock-2.mp3": { bytes: mp3, mediaType: "audio/mpeg" } },
      { testId: TEST_ID, actorId: ACTOR_ID },
    );
    const protectedKeys = new Set(["answer", "accepted_variants", "marks", "word_limit"]);
    const keyQuestions = prepared.answerKey.sections.flatMap((section) =>
      section.question_groups.flatMap((group) => group.questions),
    );

    assert.equal(prepared.row.total_questions, 40);
    assert.equal(keyQuestions.length, 40);
    assert.deepEqual(keys(prepared.content).filter((key) => protectedKeys.has(key)), []);
    assert.deepEqual(prepared.objects.map((object) => object.key), [
      `tests/${TEST_ID}/v1/content.json`,
      `tests/${TEST_ID}/v1/key.json`,
      `audio/${TEST_ID}/v1/test.mp3`,
    ]);
  });

  test("the legacy CLI delegates its dry-run to the canonical importer", () => {
    const directory = mkdtempSync(join(tmpdir(), "insignia-legacy-listening-"));
    const audioPath = join(directory, "listening-mock-2.mp3");
    const jsonPath = join(directory, "listening-mock-test-2.json");
    const scriptPath = fileURLToPath(new URL("../../scripts/import-legacy-tests.ts", import.meta.url));
    const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
    writeFileSync(audioPath, mp3);

    try {
      const result = spawnSync(
        process.execPath,
        [
          "--conditions=react-server",
          scriptPath,
          "--audio", audioPath,
          "--audio-duration", "1680",
          "--section-ends", "420,840,1260,1680",
          "--output", jsonPath,
          "--import",
          "--actor", ACTOR_ID,
          "--dry-run",
        ],
        { cwd: repositoryRoot, encoding: "utf8" },
      );

      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /Generated .* from 40 legacy questions/);
      assert.match(result.stdout, /Validated listening-mock-test-2\.json as draft/);
      assert.equal(JSON.parse(readFileSync(jsonPath, "utf8")).sections.length, 4);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

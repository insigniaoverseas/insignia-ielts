// M0-20: a source paper's 40 answers become a canonical private key only.
//   npm run test:unit
//
// The fixture below is invented content in the shape of a real Listening paper.
// Real papers and their keys never live in this repository: it is public, and
// MVP-1 §7 keeps answer keys off the client and out of version control.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { describe, test } from "node:test";

import { prepareTestImport } from "../../src/lib/import/import-test.ts";
import { buildLegacyListeningUpload } from "../../src/lib/import/legacy-listening.ts";

const TEST_ID = "11111111-1111-4111-8111-111111111111";
const ACTOR_ID = "22222222-2222-4222-8222-222222222222";
const mp3 = new Uint8Array([0xff, 0xfb, 0x50, 0xc0]);

const FORM_HINT = "Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.";
const NOTE_TWO = "Write NO MORE THAN TWO WORDS for each answer.";
const NOTE_THREE = "Write NO MORE THAN THREE WORDS for each answer.";
const NOTE_ONE = "Write ONE WORD ONLY for each answer.";

const BANK = ["A — first", "B — second", "C — third", "D — fourth"];
const NATIONS = ["Japan", "Iran", "Saudi Arabia", "Afghanistan", "Iraq"];

const gap = (container, hint) => (n, section, acceptedVariants) => ({
  n,
  section,
  type: "text",
  container,
  prompt: `Gap <strong>${n}</strong> ______`,
  answer: `answer${n}`,
  hint,
  ...(acceptedVariants ? { accepted_variants: acceptedVariants } : {}),
});
const radio = (n, section) => ({
  n,
  section,
  type: "radio",
  prompt: `Choice ${n}`,
  options: [`${n}a`, `${n}b`, `${n}c`],
  answer: `${n}b`,
});
const match = (n, section) => ({ n, section, type: "match", prompt: `Item ${n}`, options: BANK, answer: BANK[n % 4] });
const multi = (n, section, answer) => ({
  n,
  section,
  type: "multi",
  prompt: "Which TWO nations?",
  options: NATIONS,
  answer,
});

const TEST = {
  name: "Listening Sample Test 1",
  skill: "Listening",
  mode: "mock",
  minutes: 30,
  sections: [
    { n: 1, title: "Applying for a number", from: 1, to: 10 },
    { n: 2, title: "Staying safe online", from: 11, to: 20 },
    { n: 3, title: "Studying abroad", from: 21, to: 30 },
    { n: 4, title: "A painter's life", from: 31, to: 40 },
  ],
};

const QUESTIONS = [
  ...[1, 2, 3, 4].map((n) => radio(n, 1)),
  gap("form", FORM_HINT)(5, 1, ["variant five"]),
  ...[6, 7, 8, 9, 10].map((n) => gap("form", FORM_HINT)(n, 1)),
  ...[11, 12, 13, 14, 15, 16].map((n) => gap("note", NOTE_TWO)(n, 2)),
  ...[17, 18, 19, 20].map((n) => match(n, 2)),
  ...[21, 22, 23].map((n) => radio(n, 3)),
  ...[24, 25, 26, 27, 28].map((n) => gap("note", NOTE_THREE)(n, 3)),
  multi(29, 3, "Japan"),
  multi(30, 3, "Afghanistan"),
  ...[31, 32, 33, 34, 35, 36, 37, 38, 39, 40].map((n) => gap("note", NOTE_ONE)(n, 4)),
];

function media() {
  return {
    audioFile: "listening-sample-test-1.mp3",
    audioDurationSeconds: 1916,
    sectionEndsSeconds: [481, 977, 1465, 1916],
  };
}

function build() {
  return buildLegacyListeningUpload(TEST, QUESTIONS, media());
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
    assert.equal(converted.reduce((total, { question }) => total + question.marks, 0), 40);
    assert.deepEqual(
      converted.flatMap(({ question }) => question.covers ?? [question.n]),
      Array.from({ length: 40 }, (_, index) => index + 1),
    );
    assert.deepEqual(
      converted.flatMap(({ question }) => question.answer),
      QUESTIONS.map((question) => question.answer),
    );
  });

  test("groups each run of source questions the way the source paper does", () => {
    const shape = build().sections.map((section) =>
      section.question_groups.map((group) => [
        group.type,
        group.questions.flatMap((question) => question.covers ?? [question.n]),
      ]),
    );

    assert.deepEqual(shape, [
      [["mcq_single", [1, 2, 3, 4]], ["form_completion", [5, 6, 7, 8, 9, 10]]],
      [["note_completion", [11, 12, 13, 14, 15, 16]], ["matching", [17, 18, 19, 20]]],
      [["mcq_single", [21, 22, 23]], ["note_completion", [24, 25, 26, 27, 28]], ["mcq_multi", [29, 30]]],
      [["note_completion", [31, 32, 33, 34, 35, 36, 37, 38, 39, 40]]],
    ]);
  });

  test("takes each group's word limit from the source instruction, not a default", () => {
    const limits = build().sections.flatMap((section) =>
      section.question_groups
        .filter((group) => group.word_limit !== undefined)
        .map((group) => [group.questions[0].n, group.word_limit]),
    );

    assert.deepEqual(limits, [[5, 2], [11, 2], [24, 3], [31, 1]]);
  });

  test("refuses a word-limit instruction it cannot read rather than guessing one", () => {
    const broken = structuredClone(QUESTIONS);
    broken[30].hint = "Write a short answer.";
    assert.throws(() => buildLegacyListeningUpload(TEST, broken, media()), /unrecognised word limit instruction/);
  });

  test("folds a choose-TWO run into one control worth one mark per number", () => {
    const group = build()
      .sections.flatMap((section) => section.question_groups)
      .find((candidate) => candidate.type === "mcq_multi");

    assert.equal(group.widget, "checkbox_n");
    assert.equal(group.choose, 2);
    assert.equal(group.instructions, "Choose TWO letters, A-E.");
    assert.equal(group.questions.length, 1);
    assert.deepEqual(group.questions[0].covers, [29, 30]);
    assert.equal(group.questions[0].marks, 2);
    assert.deepEqual(group.questions[0].answer, ["Japan", "Afghanistan"]);
  });

  test("rejects a multi-answer control that repeats an answer", () => {
    const broken = structuredClone(QUESTIONS);
    broken[29].answer = "Japan";
    assert.throws(() => buildLegacyListeningUpload(TEST, broken, media()), /repeats an answer/);
  });

  test("keeps form and note completion in their own groups and preserves matching banks", () => {
    const converted = convertedQuestions(build());
    const q5 = converted.find(({ question }) => question.n === 5);
    const q11 = converted.find(({ question }) => question.n === 11);
    const q17 = converted.find(({ question }) => question.n === 17);

    assert.equal(q5.group.container, "form");
    assert.equal(q11.group.container, "note");
    assert.equal(q17.group.type, "matching");
    assert.deepEqual(q17.group.option_bank, BANK);
    assert.equal("options" in q17.question, false);
  });

  test("removes embedded question numbers and carries only authored variants", () => {
    const converted = convertedQuestions(build());
    const q5 = converted.find(({ question }) => question.n === 5).question;
    assert.doesNotMatch(q5.prompt, /<strong>5<\/strong>/);
    assert.deepEqual(q5.accepted_variants, ["variant five"]);
    assert.equal("accepted_variants" in converted.find(({ question }) => question.n === 6).question, false);
  });

  test("refuses True/False/Not Given, which IELTS Listening does not use", () => {
    // The design prototype's mock data has T/F/NG in a Listening paper. M0-15
    // marks that combination disallowed, and the converter must not launder it
    // into a plain multiple choice the way the first draft did.
    const broken = structuredClone(QUESTIONS);
    for (const n of [1, 2, 3, 4]) {
      broken[n - 1] = { ...broken[n - 1], type: "tfng", options: ["True", "False", "Not Given"], answer: "True" };
    }
    assert.throws(() => buildLegacyListeningUpload(TEST, broken, media()), /identifying_information is not available for listening/);
  });

  test("requires real contiguous timing metadata instead of guessing it", () => {
    assert.throws(
      () => buildLegacyListeningUpload(TEST, QUESTIONS, { ...media(), sectionEndsSeconds: [481, 977, 1465, 1915] }),
      /final section end must equal the audio duration/,
    );
    assert.throws(
      () => buildLegacyListeningUpload(TEST, QUESTIONS, { ...media(), sectionEndsSeconds: [481, 977, 977, 1916] }),
      /section 3 end must be after 977/,
    );
  });

  test("stretches the test clock so the timer cannot expire mid-recording", () => {
    // MVP-1 §7: the server owns the timer. A 30-minute clock over a 32-minute
    // recording would cut Part 4 off for every candidate.
    assert.equal(TEST.minutes * 60, 1800);
    assert.equal(build().duration_seconds, 1916);
  });

  test("fails when a source answer is missing", () => {
    const broken = structuredClone(QUESTIONS);
    broken[19].answer = "";
    assert.throws(() => buildLegacyListeningUpload(TEST, broken, media()), /too_small|Too small|at least 1 character/);
  });
});

describe("legacy Listening key split", () => {
  test("produces a private key for all 40 numbers while content has no scoring fields", () => {
    const prepared = prepareTestImport(
      build(),
      { "listening-sample-test-1.mp3": { bytes: mp3, mediaType: "audio/mpeg" } },
      { testId: TEST_ID, actorId: ACTOR_ID },
    );
    const protectedKeys = new Set(["answer", "accepted_variants", "marks", "word_limit"]);
    const keyQuestions = prepared.answerKey.sections.flatMap((section) =>
      section.question_groups.flatMap((group) => group.questions),
    );

    assert.equal(prepared.row.total_questions, 40);
    // 39 controls, because the choose-TWO control answers questions 29 and 30.
    assert.equal(keyQuestions.length, 39);
    assert.deepEqual(
      keyQuestions.flatMap((question) => question.covers ?? [question.n]),
      Array.from({ length: 40 }, (_, index) => index + 1),
    );
    assert.deepEqual(keys(prepared.content).filter((key) => protectedKeys.has(key)), []);
    assert.deepEqual(prepared.objects.map((object) => object.key), [
      `tests/${TEST_ID}/v1/content.json`,
      `tests/${TEST_ID}/v1/key.json`,
      `audio/${TEST_ID}/v1/test.mp3`,
    ]);
  });

  test("the legacy CLI loads an out-of-tree source paper and delegates its dry-run", () => {
    const directory = mkdtempSync(join(tmpdir(), "insignia-legacy-listening-"));
    const sourcePath = join(directory, "source.js");
    const audioPath = join(directory, "listening-sample-test-1.mp3");
    const jsonPath = join(directory, "listening-sample-test-1.json");
    const scriptPath = fileURLToPath(new URL("../../scripts/import-legacy-tests.ts", import.meta.url));
    const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
    writeFileSync(audioPath, mp3);
    writeFileSync(
      sourcePath,
      `export const TEST = ${JSON.stringify(TEST)};\nexport const QUESTIONS = ${JSON.stringify(QUESTIONS)};\n`,
    );

    try {
      const result = spawnSync(
        process.execPath,
        [
          "--conditions=react-server",
          scriptPath,
          "--source", sourcePath,
          "--audio", audioPath,
          "--audio-duration", "1916",
          "--section-ends", "481,977,1465,1916",
          "--import",
          "--actor", ACTOR_ID,
          "--dry-run",
        ],
        { cwd: repositoryRoot, encoding: "utf8" },
      );

      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /Generated .* from 40 legacy questions/);
      assert.match(result.stdout, /Validated listening-sample-test-1\.json as draft/);
      assert.equal(JSON.parse(readFileSync(jsonPath, "utf8")).sections.length, 4);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("the CLI refuses a source file that does not export a paper", () => {
    const directory = mkdtempSync(join(tmpdir(), "insignia-legacy-listening-"));
    const sourcePath = join(directory, "source.js");
    const audioPath = join(directory, "listening-sample-test-1.mp3");
    const scriptPath = fileURLToPath(new URL("../../scripts/import-legacy-tests.ts", import.meta.url));
    writeFileSync(audioPath, mp3);
    writeFileSync(sourcePath, "export const TEST = {};\n");

    try {
      const result = spawnSync(
        process.execPath,
        [
          "--conditions=react-server",
          scriptPath,
          "--source", sourcePath,
          "--audio", audioPath,
          "--audio-duration", "1916",
          "--section-ends", "481,977,1465,1916",
        ],
        { cwd: fileURLToPath(new URL("../..", import.meta.url)), encoding: "utf8" },
      );

      assert.equal(result.status, 1);
      assert.match(result.stderr, /must export both TEST and QUESTIONS/);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

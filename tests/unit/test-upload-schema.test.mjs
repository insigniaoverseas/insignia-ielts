// lib/import/test-upload.schema.ts, including the executable documentation.
//   npm run test:unit
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { QUESTION_TYPE_KEYS } from "../../src/lib/question-types.ts";
import { testUploadSchema } from "../../src/lib/import/test-upload.schema.ts";

const docs = readFileSync(new URL("../../docs/test-authoring.md", import.meta.url), "utf8");

function documentedSample(name) {
  const pattern = new RegExp(`<!-- sample:${name}:start -->\\s*\`\`\`json\\n([\\s\\S]*?)\\n\`\`\`\\s*<!-- sample:${name}:end -->`);
  const match = docs.match(pattern);
  assert.ok(match, `missing ${name} JSON sample in docs/test-authoring.md`);
  return JSON.parse(match[1]);
}

const samples = {
  listening: documentedSample("listening"),
  academic: documentedSample("academic"),
  general: documentedSample("general"),
};

const clone = (value) => structuredClone(value);
const paths = (result) => {
  assert.equal(result.success, false, "expected validation to fail");
  return result.error.issues.map((issue) => issue.path.join("."));
};

describe("worked authoring samples", () => {
  for (const [name, sample] of Object.entries(samples)) {
    test(`${name} sample is valid schema_version 1 JSON`, () => {
      const result = testUploadSchema.safeParse(sample);
      assert.equal(result.success, true, result.success ? undefined : JSON.stringify(result.error.issues, null, 2));
    });
  }

  test("the three worked samples collectively demonstrate all 18 canonical types", () => {
    const demonstrated = new Set(
      Object.values(samples).flatMap((sample) =>
        sample.sections.flatMap((section) => section.question_groups.map((group) => group.type)),
      ),
    );
    assert.deepEqual([...demonstrated].sort(), [...QUESTION_TYPE_KEYS].sort());
  });
});

describe("errors point to the malformed question", () => {
  test("independent mistakes on two questions produce independent nested paths", () => {
    const input = clone(samples.general);
    input.sections[0].question_groups[0].questions[0].answer = [];
    input.sections[0].question_groups[0].questions[1].marks = 0;

    const issuePaths = paths(testUploadSchema.safeParse(input));
    assert.ok(issuePaths.includes("sections.0.question_groups.0.questions.0.answer"));
    assert.ok(issuePaths.includes("sections.0.question_groups.0.questions.1.marks"));
  });

  test("a misspelled answer field is rejected at that question instead of discarded", () => {
    const input = clone(samples.general);
    const question = input.sections[0].question_groups[0].questions[0];
    question.anwser = question.answer;
    delete question.answer;

    const issuePaths = paths(testUploadSchema.safeParse(input));
    assert.ok(issuePaths.includes("sections.0.question_groups.0.questions.0.answer"));
    assert.ok(issuePaths.includes("sections.0.question_groups.0.questions.0"));
  });

  test("an answer outside its shared bank points to the answer value", () => {
    const input = clone(samples.general);
    input.sections[0].question_groups[0].questions[1].answer = ["C"];
    assert.ok(
      paths(testUploadSchema.safeParse(input)).includes(
        "sections.0.question_groups.0.questions.1.answer.0",
      ),
    );
  });
});

describe("type, widget and format rules", () => {
  test("a type cannot claim another renderer or completion container", () => {
    const input = clone(samples.academic);
    input.sections[0].question_groups[2].widget = "radio";
    input.sections[0].question_groups[6].container = "note";
    const issuePaths = paths(testUploadSchema.safeParse(input));
    assert.ok(issuePaths.includes("sections.0.question_groups.2.widget"));
    assert.ok(issuePaths.includes("sections.0.question_groups.6.container"));
  });

  test("General Training Y/N/NG is accepted as the documented warning-only exception", () => {
    const input = clone(samples.general);
    input.practice_question_type = "identifying_views_claims";
    const group = input.sections[0].question_groups[0];
    group.type = "identifying_views_claims";
    group.widget = "segmented_3";
    delete group.option_bank;
    group.questions[0].answer = ["Yes"];
    group.questions[1].answer = ["Not Given"];

    const result = testUploadSchema.safeParse(input);
    assert.equal(result.success, true, result.success ? undefined : JSON.stringify(result.error.issues, null, 2));
  });

  test("a genuinely unavailable type is rejected at the group type", () => {
    const input = clone(samples.general);
    input.practice_question_type = "matching";
    input.sections[0].question_groups[0].type = "matching";
    assert.ok(
      paths(testUploadSchema.safeParse(input)).includes("sections.0.question_groups.0.type"),
    );
  });

  test("practice sets may contain only their declared question type", () => {
    const input = clone(samples.general);
    input.sections[0].question_groups[0].type = "matching_headings";
    assert.ok(
      paths(testUploadSchema.safeParse(input)).includes("sections.0.question_groups.0.type"),
    );
  });

  test("choice questions cannot declare text spelling variants", () => {
    const input = clone(samples.listening);
    input.sections[0].question_groups[0].questions[0].accepted_variants = ["A Friend"];
    assert.ok(
      paths(testUploadSchema.safeParse(input)).includes(
        "sections.0.question_groups.0.questions.0.accepted_variants",
      ),
    );
  });
});

describe("test-wide structural rules", () => {
  test("Listening requires n_a, one MP3 and audio markers", () => {
    const input = clone(samples.listening);
    input.variant = "academic";
    delete input.audio;
    delete input.sections[0].starts_at_seconds;
    const issuePaths = paths(testUploadSchema.safeParse(input));
    assert.ok(issuePaths.includes("variant"));
    assert.ok(issuePaths.includes("audio"));
    assert.ok(issuePaths.includes("sections.0.starts_at_seconds"));
  });

  test("Listening markers start at zero, stay contiguous and cover the audio", () => {
    const lateStart = clone(samples.listening);
    lateStart.sections[0].starts_at_seconds = 1;
    assert.ok(paths(testUploadSchema.safeParse(lateStart)).includes("sections.0.starts_at_seconds"));

    const shortMarkers = clone(samples.listening);
    shortMarkers.sections[0].ends_at_seconds -= 1;
    assert.ok(paths(testUploadSchema.safeParse(shortMarkers)).includes("sections.0.ends_at_seconds"));

    const gap = clone(samples.listening);
    const finalGroup = gap.sections[0].question_groups.pop();
    gap.sections[0].ends_at_seconds = 300;
    gap.sections.push({
      n: 2,
      title: "The rest of the recording",
      starts_at_seconds: 301,
      ends_at_seconds: gap.audio.duration_seconds,
      passages: [],
      question_groups: [finalGroup],
    });
    assert.ok(paths(testUploadSchema.safeParse(gap)).includes("sections.1.starts_at_seconds"));
  });

  test("Reading rejects audio, transcript, transfer time and audio markers", () => {
    const input = clone(samples.academic);
    input.audio = { file: "test.mp3", duration_seconds: 100 };
    input.transcript = [{ at_seconds: 1, speaker: "A", text: "Hello" }];
    input.transfer_seconds = 10;
    input.sections[0].starts_at_seconds = 0;
    input.sections[0].ends_at_seconds = 100;
    const issuePaths = paths(testUploadSchema.safeParse(input));
    assert.ok(issuePaths.includes("audio"));
    assert.ok(issuePaths.includes("transcript"));
    assert.ok(issuePaths.includes("transfer_seconds"));
    assert.ok(issuePaths.includes("sections.0"));
  });

  test("question numbers are unique and contiguous across groups", () => {
    const input = clone(samples.academic);
    input.sections[0].question_groups[1].questions[0].n = 1;
    const issuePaths = paths(testUploadSchema.safeParse(input));
    assert.ok(issuePaths.includes("sections.0.question_groups.1.questions.0.n"));
  });

  test("image groups must reference a declared safe image asset", () => {
    const input = clone(samples.academic);
    input.sections[0].question_groups[7].asset_id = "missing-image";
    input.assets[0].file = "../tram-parts.svg";
    const issuePaths = paths(testUploadSchema.safeParse(input));
    assert.ok(issuePaths.includes("sections.0.question_groups.7.asset_id"));
    assert.ok(issuePaths.includes("assets.0.file"));
  });

  test("multi-answer marks, answers and covered numbers agree with choose", () => {
    const input = clone(samples.listening);
    const question = input.sections[0].question_groups[1].questions[0];
    question.covers = [2, 4];
    question.marks = 1;
    question.answer = ["Pool"];
    const issuePaths = paths(testUploadSchema.safeParse(input));
    assert.ok(issuePaths.includes("sections.0.question_groups.1.questions.0.covers.1"));
    assert.ok(issuePaths.includes("sections.0.question_groups.1.questions.0.marks"));
    assert.ok(issuePaths.includes("sections.0.question_groups.1.questions.0.answer"));
  });
});

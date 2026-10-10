import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { buildReview } from "../../src/lib/attempts/review.ts";
import { answerKeySchema } from "../../src/lib/scoring.ts";
import { sanitizePassageHtml } from "../../src/lib/security/sanitize.ts";
import { testContentSchema } from "../../src/lib/test-content.ts";

const TEST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const content = testContentSchema.parse({
  schema_version: 1, test_id: TEST, content_version: 1, title: "T", skill: "listening", variant: "n_a",
  difficulty: "easy", duration_seconds: 1800, transfer_seconds: 0, kind: "mock", tags: [], assets: [],
  sections: [{
    n: 1, title: "S1", passages: [],
    question_groups: [
      { type: "form_completion", widget: "text_gap", instructions: "Write ONE WORD.",
        questions: [
          { n: 1, prompt: "Name: ______ <script>alert(1)</script>" },
          { n: 2, prompt: "Town: ______" },
        ] },
      { type: "mcq_multi", widget: "checkbox_n", choose: 2, instructions: "Choose TWO.",
        questions: [{ n: 3, covers: [3, 4], prompt: "Which two?", options: ["Japan", "Iran", "Peru"] }] },
    ],
  }],
});

const key = answerKeySchema.parse({
  schema_version: 1, test_id: TEST, content_version: 1,
  sections: [{
    n: 1,
    question_groups: [
      { type: "form_completion", word_limit: 1, questions: [
        { n: 1, marks: 1, answer: ["Smith"] },
        { n: 2, marks: 1, answer: ["Leeds", "Leeds city"] },
      ] },
      { type: "mcq_multi", questions: [{ n: 3, covers: [3, 4], marks: 2, answer: ["Japan", "Peru"] }] },
    ],
  }],
});

describe("Review my mistakes (M4-01)", () => {
  const built = buildReview(
    content,
    key,
    [
      { q_number: 1, given_answer: "smith" },
      { q_number: 2, given_answer: null },
      { q_number: 3, given_answer: "Japan" },
      { q_number: 4, given_answer: "Iran" },
    ],
    [
      { q_number: 1, is_correct: true },
      { q_number: 2, is_correct: false },
      { q_number: 3, is_correct: true },
      { q_number: 4, is_correct: false },
    ],
    sanitizePassageHtml,
  );

  test("counts per question number, from the stored marks — never re-marked", () => {
    assert.deepEqual(built.summary, { correct: 2, wrong: 2, total: 4 });
  });

  test("one row per control, labelled as the student saw it", () => {
    assert.deepEqual(built.questions.map((q) => q.label), ["1", "2", "3–4"]);
    assert.equal(built.questions[0].correct, true);
    assert.equal(built.questions[1].givenAnswer, null, "a blank answer reads as empty, not as text");
    assert.equal(built.questions[2].correct, false, "a multi-answer control is right only if every number is");
    assert.equal(built.questions[2].givenAnswer, "Japan, Iran");
  });

  test("alternatives read as alternatives; a multi-answer key lists every choice", () => {
    assert.equal(built.questions[1].correctAnswer, "Leeds / Leeds city");
    assert.equal(built.questions[2].correctAnswer, "Japan, Peru");
  });

  test("prompts are sanitised again on render (non-negotiable 8)", () => {
    assert.ok(!built.questions[0].promptHtml.includes("<script"));
    assert.ok(built.questions[0].promptHtml.includes("Name:"));
  });
});

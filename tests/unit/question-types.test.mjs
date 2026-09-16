// lib/question-types.ts against the exact matrix in MVP-1.md §10.
//   npm run test:unit
import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  CONTAINER_KEYS,
  QUESTION_TYPES,
  QUESTION_TYPE_KEYS,
  WIDGET_KEYS,
  getQuestionTypeDefinition,
  isQuestionType,
  isTypeAllowed,
} from "../../src/lib/question-types.ts";

const A = "allowed";
const W = "warning";
const D = "disallowed";

// type: [widget, container, Listening, Academic Reading, GT Reading]
const expected = {
  mcq_single: ["radio", null, A, A, A],
  mcq_multi: ["checkbox_n", null, A, A, A],
  identifying_information: ["segmented_3", null, D, A, A],
  identifying_views_claims: ["segmented_3", null, D, A, W],
  matching: ["dropdown_bank", null, A, D, D],
  matching_information: ["dropdown_bank", null, D, A, A],
  matching_headings: ["dropdown_bank", null, D, A, A],
  matching_features: ["dropdown_bank", null, D, A, A],
  matching_sentence_endings: ["dropdown_bank", null, D, A, W],
  form_completion: ["text_gap", "form", A, D, D],
  note_completion: ["text_gap", "note", A, A, A],
  table_completion: ["text_gap", "table", A, A, A],
  flow_chart_completion: ["text_gap", "flow_chart", A, A, A],
  summary_completion: ["text_gap", "summary", D, A, A],
  sentence_completion: ["text_gap", "sentence", A, A, A],
  short_answer: ["text_gap", "plain", A, A, A],
  plan_map_diagram_labelling: ["image_label", null, A, D, D],
  diagram_label_completion: ["image_label", null, D, A, A],
};

describe("canonical IELTS question-type matrix", () => {
  test("contains exactly the 18 canonical keys in specification order", () => {
    assert.deepEqual(QUESTION_TYPE_KEYS, Object.keys(expected));
    assert.equal(QUESTION_TYPE_KEYS.length, 18);
  });

  for (const [type, [widget, container, listening, academic, general]] of Object.entries(expected)) {
    test(`${type}: renderer, container and format availability match §10`, () => {
      const definition = getQuestionTypeDefinition(type);
      assert.equal(definition.widget, widget);
      assert.equal(definition.container, container);
      assert.equal(definition.availability.listening, listening);
      assert.equal(definition.availability.academic_reading, academic);
      assert.equal(definition.availability.general_training_reading, general);
      assert.ok(definition.officialName.length > 0);
    });
  }

  test("all six widgets are represented and no unknown renderer exists", () => {
    const used = new Set(Object.values(QUESTION_TYPES).map(({ widget }) => widget));
    assert.deepEqual([...used].sort(), [...WIDGET_KEYS].sort());
  });

  test("only text-gap types declare completion containers", () => {
    for (const definition of Object.values(QUESTION_TYPES)) {
      assert.equal(definition.container !== null, definition.widget === "text_gap");
      if (definition.container !== null) assert.ok(CONTAINER_KEYS.includes(definition.container));
    }
  });
});

describe("question-type lookups", () => {
  test("the two GT omissions are warnings, not booleans or hard failures", () => {
    assert.equal(isTypeAllowed("identifying_views_claims", "reading", "general"), "warning");
    assert.equal(isTypeAllowed("matching_sentence_endings", "reading", "general"), "warning");
  });

  test("official and unavailable combinations stay distinct", () => {
    assert.equal(isTypeAllowed("matching", "listening", "n_a"), "allowed");
    assert.equal(isTypeAllowed("matching", "reading", "academic"), "disallowed");
    assert.equal(isTypeAllowed("diagram_label_completion", "reading", "general"), "allowed");
  });

  test("invalid skill/variant pairs fail closed", () => {
    assert.equal(isTypeAllowed("mcq_single", "listening", "academic"), "disallowed");
    assert.equal(isTypeAllowed("mcq_single", "reading", "n_a"), "disallowed");
  });

  test("untrusted values can be narrowed before lookup", () => {
    assert.equal(isQuestionType("matching_headings"), true);
    assert.equal(isQuestionType("Matching headings"), false);
    assert.equal(isQuestionType("made_up"), false);
    assert.equal(isQuestionType(null), false);
  });
});

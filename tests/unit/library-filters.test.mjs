import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { NO_FILTERS, filterTests, filtersFromQuery, filtersToQuery, hasFilters, toggleFilter } from "../../src/lib/library-filters.ts";

const rows = [
  { title: "Easy Practice Test 1 — Listening", tags: ["book 1"], skill: "listening", variant: "n_a", difficulty: "easy", kind: "mock", status: "published" },
  { title: "Medium Practice Test 7 — Reading", tags: [], skill: "reading", variant: "academic", difficulty: "medium", kind: "mock", status: "published" },
  { title: "GT Reading 2", tags: ["general"], skill: "reading", variant: "general", difficulty: "hard", kind: "class", status: "draft" },
  { title: "Headings drill", tags: [], skill: "reading", variant: "academic", difficulty: "easy", kind: "practice", status: "published" },
];
const titles = (list) => list.map((r) => r.title);

describe("test library filters (M10-02, several values M10-17)", () => {
  test("no filters shows everything", () => assert.equal(filterTests(rows, NO_FILTERS).length, 4));

  test("filters combine across groups", () => {
    assert.deepEqual(titles(filterTests(rows, { ...NO_FILTERS, skill: ["reading"], variant: ["academic"] })), ["Medium Practice Test 7 — Reading", "Headings drill"]);
    assert.equal(filterTests(rows, { ...NO_FILTERS, variant: ["general"], status: ["published"] }).length, 0);
  });

  test("several values in one group match any of them — Easy and Medium", () => {
    assert.deepEqual(titles(filterTests(rows, { ...NO_FILTERS, difficulty: ["easy", "medium"] })), [
      "Easy Practice Test 1 — Listening",
      "Medium Practice Test 7 — Reading",
      "Headings drill",
    ]);
    assert.deepEqual(titles(filterTests(rows, { ...NO_FILTERS, kind: ["class", "practice"], difficulty: ["easy", "hard"] })), ["GT Reading 2", "Headings drill"]);
  });

  test("search matches title or tag, any case", () => {
    assert.equal(filterTests(rows, { ...NO_FILTERS, q: "LISTENING" }).length, 1);
    assert.equal(filterTests(rows, { ...NO_FILTERS, q: "book 1" }).length, 1);
  });

  test("rows without tags or status (the Assign page) count as published", () => {
    const assignRows = [{ title: "A", skill: "reading", variant: "academic", difficulty: "easy", kind: "practice" }];
    assert.equal(filterTests(assignRows, { ...NO_FILTERS, kind: ["practice"], q: "a" }).length, 1);
    assert.equal(filterTests(assignRows, { ...NO_FILTERS, status: ["draft"] }).length, 0);
  });

  test("the URL round-trips lists, in the chips' order, and drops unknown values", () => {
    const f = { ...NO_FILTERS, difficulty: ["easy", "medium"], kind: ["practice"] };
    assert.equal(filtersToQuery(f), "?difficulty=easy,medium&kind=practice");
    assert.deepEqual(filtersFromQuery(new URLSearchParams(filtersToQuery(f).slice(1))), f);
    assert.deepEqual(filtersFromQuery({ difficulty: "medium,easy,impossible", skill: "writing" }), { ...NO_FILTERS, difficulty: ["easy", "medium"] });
    assert.equal(filtersToQuery(NO_FILTERS), "");
  });

  test("an old single-value link still works", () => {
    assert.deepEqual(filtersFromQuery({ difficulty: "hard", kind: "class" }), { ...NO_FILTERS, difficulty: ["hard"], kind: ["class"] });
  });

  test("toggling a chip adds or removes one value and keeps the order", () => {
    const one = toggleFilter(NO_FILTERS, "difficulty", "medium");
    const two = toggleFilter(one, "difficulty", "easy");
    assert.deepEqual(two.difficulty, ["easy", "medium"]);
    assert.deepEqual(toggleFilter(two, "difficulty", "medium").difficulty, ["easy"]);
    assert.equal(hasFilters(NO_FILTERS), false);
    assert.equal(hasFilters(two), true);
    assert.equal(hasFilters({ ...NO_FILTERS, q: "  " }), false);
  });
});

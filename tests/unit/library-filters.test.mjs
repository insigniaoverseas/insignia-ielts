import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { NO_FILTERS, filterTests, filtersFromQuery, filtersToQuery } from "../../src/lib/library-filters.ts";

const rows = [
  { title: "Easy Practice Test 1 — Listening", tags: ["book 1"], skill: "listening", variant: "n_a", difficulty: "easy", kind: "mock", status: "published" },
  { title: "Medium Practice Test 7 — Reading", tags: [], skill: "reading", variant: "academic", difficulty: "medium", kind: "mock", status: "published" },
  { title: "GT Reading 2", tags: ["general"], skill: "reading", variant: "general", difficulty: "hard", kind: "class", status: "draft" },
];

describe("test library filters (M10-02)", () => {
  test("no filters shows everything", () => assert.equal(filterTests(rows, NO_FILTERS).length, 3));
  test("filters combine", () => {
    assert.deepEqual(filterTests(rows, { ...NO_FILTERS, skill: "reading", variant: "academic" }).map((r) => r.title), ["Medium Practice Test 7 — Reading"]);
    assert.equal(filterTests(rows, { ...NO_FILTERS, variant: "general", status: "published" }).length, 0);
  });
  test("search matches title or tag, any case", () => {
    assert.equal(filterTests(rows, { ...NO_FILTERS, q: "LISTENING" }).length, 1);
    assert.equal(filterTests(rows, { ...NO_FILTERS, q: "book 1" }).length, 1);
  });
  test("the URL round-trips, and unknown values are dropped", () => {
    const f = { ...NO_FILTERS, difficulty: "hard", kind: "class" };
    assert.deepEqual(filtersFromQuery(new URLSearchParams(filtersToQuery(f).slice(1))), f);
    assert.deepEqual(filtersFromQuery({ difficulty: "impossible", skill: "writing" }), NO_FILTERS);
    assert.equal(filtersToQuery(NO_FILTERS), "");
  });
});

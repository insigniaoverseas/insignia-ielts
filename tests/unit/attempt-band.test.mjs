import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { bandLookupScore } from "../../src/lib/attempts/band.ts";

describe("band lookup score", () => {
	test("a 40-question paper is read as-is", () => {
		assert.equal(bandLookupScore(27, 40), 27);
		assert.equal(bandLookupScore(0, 40), 0);
	});

	test("a 41-question paper is scaled to 40 and rounded", () => {
		assert.equal(bandLookupScore(41, 41), 40);
		assert.equal(bandLookupScore(20, 41), 20);
		assert.equal(bandLookupScore(39, 41), 38);
	});

	test("refuses a paper with no questions", () => {
		assert.throws(() => bandLookupScore(0, 0), RangeError);
	});
});

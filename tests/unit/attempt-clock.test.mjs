import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { isOverdue, secondsLeft } from "../../src/lib/attempts/clock.ts";

const now = Date.parse("2026-10-09T10:00:00Z");

describe("attempt clock", () => {
	test("counts whole seconds down to the server deadline", () => {
		assert.equal(secondsLeft({ expires_at: "2026-10-09T10:30:00Z" }, now), 1800);
		assert.equal(secondsLeft({ expires_at: "2026-10-09T10:00:00.999Z" }, now), 0);
	});

	test("never goes negative after the deadline", () => {
		assert.equal(secondsLeft({ expires_at: "2026-10-09T09:00:00Z" }, now), 0);
	});

	test("only an in-progress attempt at or past its deadline is overdue", () => {
		assert.equal(isOverdue({ status: "in_progress", expires_at: "2026-10-09T10:00:00Z" }, now), true);
		assert.equal(isOverdue({ status: "in_progress", expires_at: "2026-10-09T10:00:01Z" }, now), false);
		assert.equal(isOverdue({ status: "submitted", expires_at: "2026-10-09T09:00:00Z" }, now), false);
	});
});

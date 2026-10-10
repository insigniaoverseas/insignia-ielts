import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { isOverdue, secondsLeft, timeTakenSeconds } from "../../src/lib/attempts/clock.ts";

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

import { practiceCheckIn } from "../../src/lib/attempts/clock.ts";

describe("practice pause", () => {
	const at = (iso) => Date.parse(iso);

	test("the first check-in only records where the clock is", () => {
		assert.deepEqual(practiceCheckIn({ expires_at: "2026-10-09T10:30:00Z", time_remaining_seconds: null }, now), {
			expiresAt: null,
			checkpoint: 1800,
		});
	});

	test("regular check-ins while working change nothing but the checkpoint", () => {
		// 30 s after a check-in at 1800 left.
		const result = practiceCheckIn(
			{ expires_at: "2026-10-09T10:30:00Z", time_remaining_seconds: 1830 },
			now,
		);
		assert.deepEqual(result, { expiresAt: null, checkpoint: 1800 });
	});

	test("after ten minutes away, the time away is given back, less one interval", () => {
		// Last check-in had 1800 left; the student returns 600 s later.
		const result = practiceCheckIn(
			{ expires_at: "2026-10-09T10:30:00Z", time_remaining_seconds: 1800 },
			at("2026-10-09T10:10:00Z"),
		);
		assert.equal(result.checkpoint, 1770);
		assert.equal(result.expiresAt, "2026-10-09T10:39:30.000Z");
	});

	test("returning after the old deadline still resumes with the time that was left", () => {
		const result = practiceCheckIn(
			{ expires_at: "2026-10-09T10:30:00Z", time_remaining_seconds: 1200 },
			at("2026-10-09T12:00:00Z"),
		);
		assert.equal(result.checkpoint, 1170);
		assert.equal(result.expiresAt, "2026-10-09T12:19:30.000Z");
	});

	test("never moves the deadline earlier", () => {
		const result = practiceCheckIn(
			{ expires_at: "2026-10-09T10:30:00Z", time_remaining_seconds: 20 },
			at("2026-10-09T10:29:00Z"),
		);
		assert.equal(result.expiresAt, null);
	});
});

describe("time taken", () => {
  const started_at = "2026-10-10T06:00:00.000Z";
  const expires_at = "2026-10-10T06:40:00.000Z"; // 30 min + 10 min transfer

  test("is the time between start and hand-in", () => {
    assert.equal(timeTakenSeconds({ started_at, expires_at, submitted_at: "2026-10-10T06:25:30.000Z" }), 25 * 60 + 30);
  });

  test("stops at the deadline when the attempt was closed hours later", () => {
    assert.equal(timeTakenSeconds({ started_at, expires_at, submitted_at: "2026-10-10T09:15:05.000Z" }), 40 * 60);
  });

  test("counts extra time an invigilator gave, because it moved the deadline", () => {
    const extended = "2026-10-10T06:45:00.000Z";
    assert.equal(timeTakenSeconds({ started_at, expires_at: extended, submitted_at: "2026-10-10T06:44:00.000Z" }), 44 * 60);
  });
});

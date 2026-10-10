import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { REFRESH_MS, shouldRefreshOnActivity, shouldRefreshOnTick } from "../../src/lib/refresh-policy.ts";

describe("student auto-refresh", () => {
  const now = 10 * REFRESH_MS;

  test("a tick refreshes only a visible tab used in the last minute", () => {
    assert.equal(shouldRefreshOnTick(now, now - 5_000, true), true);
    assert.equal(shouldRefreshOnTick(now, now - 5_000, false), false);
    assert.equal(shouldRefreshOnTick(now, now - REFRESH_MS, true), false);
  });

  test("the first touch after being idle refreshes at once", () => {
    // Idle a minute, nothing refreshed since: check the session now.
    assert.equal(shouldRefreshOnActivity(now, now - REFRESH_MS, now - 2 * REFRESH_MS), true);
  });

  test("ordinary use does not refresh on every touch", () => {
    assert.equal(shouldRefreshOnActivity(now, now - 1_000, now - 2 * REFRESH_MS), false);
    // Idle, but a refresh (coming back to the tab) already happened.
    assert.equal(shouldRefreshOnActivity(now, now - REFRESH_MS, now - 1_000), false);
  });
});

import { test } from "node:test";
import assert from "node:assert/strict";

import { normaliseIndianMobile } from "../../src/lib/phone.ts";

test("accepts a mobile number however staff type it", () => {
  for (const input of ["9876543210", "98765 43210", "+91 98765 43210", "+91-98765-43210", "919876543210", "098765 43210"]) {
    assert.equal(normaliseIndianMobile(input), "9876543210", input);
  }
});

test("refuses what isn't an Indian mobile number", () => {
  for (const input of ["", "12345", "1234567890", "98765432101", "+1 415 555 0100", "abcdefghij"]) {
    assert.equal(normaliseIndianMobile(input), null, input);
  }
});

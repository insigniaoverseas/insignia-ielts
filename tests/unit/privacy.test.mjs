import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { PRIVACY_NOTICE_VERSION, RETENTION_MONTHS, privacyNotice, privacySummary } from "../../src/lib/privacy.ts";

describe("privacy notice (DPDP Act 2023)", () => {
  const text = (contact) => privacyNotice(contact).flatMap((s) => [s.heading, ...s.points]).join("\n");

  test("states what is kept, why, who sees it, how long, and the person's rights", () => {
    const headings = privacyNotice(null).map((s) => s.heading);
    assert.deepEqual(headings, ["What we keep", "Why we keep it", "Who can see it", "How long we keep it", "Your choices"]);
    assert.match(text(null), new RegExp(`${RETENTION_MONTHS} months`));
    assert.match(text(null), /Data Protection Board of India/);
    assert.match(text(null), /withdraw/i);
  });

  test("names the contact address when set, and the front desk when not", () => {
    assert.match(text("privacy@insignia.example"), /privacy@insignia\.example/);
    assert.match(text(null), /front desk/);
  });

  test("the short version on the accept screen agrees with the full notice", () => {
    assert.ok(privacySummary().some((line) => line.includes(`${RETENTION_MONTHS} months`)));
  });

  test("every acceptance can be tied to a dated version", () => {
    assert.match(PRIVACY_NOTICE_VERSION, /^\d{4}-\d{2}-\d{2}$/);
  });
});

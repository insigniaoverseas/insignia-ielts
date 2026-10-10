import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { deviceLabel } from "../../src/lib/auth/device-label.ts";

describe("device labels on Profile", () => {
  test("names the browser and the system, not the user-agent's first words", () => {
    assert.equal(
      deviceLabel(
        "Mozilla/5.0 (Linux; Android 14; SM-A146B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
      ),
      "Chrome on Android",
    );
    assert.equal(
      deviceLabel(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      ),
      "Safari on iPhone",
    );
    assert.equal(
      deviceLabel("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0"),
      "Firefox on Windows",
    );
  });

  test("browsers that also claim to be Chrome are named for themselves", () => {
    assert.equal(
      deviceLabel(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0",
      ),
      "Edge on Windows",
    );
    assert.equal(
      deviceLabel(
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36",
      ),
      "Samsung Internet on Android",
    );
    assert.equal(
      deviceLabel(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
      ),
      "Chrome on Mac",
    );
  });

  test("falls back to whatever is known", () => {
    assert.equal(deviceLabel(null), "Unknown device");
    assert.equal(deviceLabel(""), "Unknown device");
    assert.equal(deviceLabel("curl/8.7.1"), "Unknown device");
    assert.equal(deviceLabel("SomeBot (Windows NT 10.0)"), "Windows");
  });
});

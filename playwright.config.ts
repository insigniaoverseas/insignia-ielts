import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end checks for `MVP-1.md` §19 (M9-07) — the ones only a real browser
 * against a running app can prove. See `tests/e2e/README.md`.
 *
 * Runs against `E2E_BASE_URL` (default `http://localhost:3000`). It never
 * starts a server itself: the app needs `.dev.vars` and, locally, Turnstile's
 * test keys, so start it the way `tests/e2e/README.md` says first.
 */
export default defineConfig({
	testDir: "tests/e2e",
	// Signed-in checks share accounts and a single-session rule for students:
	// running them in parallel would sign each other out.
	workers: 1,
	fullyParallel: false,
	retries: 0,
	timeout: 90_000,
	expect: { timeout: 15_000 },
	reporter: [["list"]],
	use: {
		baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
		trace: "retain-on-failure",
		...devices["Desktop Chrome"],
		// `E2E_CHANNEL=chrome` uses the installed Google Chrome instead of
		// Playwright's own Chromium download.
		...(process.env.E2E_CHANNEL ? { channel: process.env.E2E_CHANNEL } : {}),
	},
});

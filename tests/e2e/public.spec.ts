import { expect, test } from "@playwright/test";

/**
 * §19 checks that need no account and change nothing — safe to run against
 * any environment, production included.
 */

const ZERO = "00000000-0000-4000-8000-000000000000";

test.describe("V16 — no signup route exists (D9)", () => {
	for (const path of ["/signup", "/sign-up", "/register", "/join", "/create-account", "/auth/signup", "/api/auth/signup", "/invite"]) {
		test(`${path} is not a page`, async ({ request }) => {
			const res = await request.get(path, { maxRedirects: 0 });
			// Not found, or bounced to sign-in by the proxy — never a form.
			expect([404, 307, 308]).toContain(res.status());
			if (res.status() !== 404) expect(res.headers()["location"]).toContain("/login");
		});
	}

	test("Supabase Auth itself refuses signups", async ({ request }) => {
		const url = process.env.SUPABASE_URL;
		const key = process.env.SUPABASE_PUBLISHABLE_KEY;
		test.skip(!url || !key, "SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY not set");
		// Read-only: the public settings endpoint, not a signup attempt.
		const res = await request.get(`${url}/auth/v1/settings`, { headers: { apikey: key! } });
		expect(res.ok()).toBe(true);
		expect((await res.json()).disable_signup).toBe(true);
	});
});

test("V17 — sign-in asks for email and password, never a PIN", async ({ page }) => {
	await page.goto("/login");
	await expect(page.getByLabel("Email")).toBeVisible();
	await expect(page.getByLabel("Password")).toBeVisible();
	await expect(page.getByText(/\bPIN\b/i)).toHaveCount(0);
	await expect(page.locator('input[inputmode="numeric"][maxlength="4"], input[maxlength="6"][inputmode="numeric"]')).toHaveCount(0);
});

test.describe("V18 — a dead invite or reset link explains itself", () => {
	test("unknown invite token", async ({ page }) => {
		const res = await page.goto("/invite/not-a-real-token-0000000000000000");
		expect(res?.status()).toBeLessThan(500);
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
		await expect(page.locator("body")).not.toContainText(/error|exception|stack|undefined/i);
	});

	test("unknown reset token", async ({ page }) => {
		const res = await page.goto("/reset/not-a-real-token-0000000000000000");
		expect(res?.status()).toBeLessThan(500);
		await expect(page.getByRole("link", { name: "Send me a new link" })).toBeVisible();
	});
});

test.describe("Signed out, nothing private answers", () => {
	const guarded = [
		"/home",
		"/tests",
		"/profile",
		"/profile/password",
		`/attempt/${ZERO}`,
		`/results/${ZERO}`,
		`/review/${ZERO}`,
		`/tests/${ZERO}/start`,
		`/tests/${ZERO}/start/audio`,
		`/tests/practice:${ZERO}/start/audio`,
		`/teacher/live/${ZERO}`,
		`/teacher/live/${ZERO}/state`,
		"/teacher/dashboard",
		"/admin/overview",
		`/admin/library/${ZERO}/answer-key`,
		`/admin/library/${ZERO}/preview/media/audio`,
	];
	for (const path of guarded) {
		test(`${path} → sign-in`, async ({ request }) => {
			const res = await request.get(path, { maxRedirects: 0 });
			expect(res.status()).toBe(307);
			expect(res.headers()["location"]).toMatch(/\/login\?next=/);
		});
	}
});

test("Every page carries a nonce CSP and the security headers", async ({ request }) => {
	const res = await request.get("/login");
	const h = res.headers();
	expect(h["content-security-policy"]).toMatch(/script-src[^;]*'nonce-[A-Za-z0-9+/=]+'/);
	expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
	expect(h["content-security-policy"]).toContain("object-src 'none'");
	expect(h["x-content-type-options"]).toBe("nosniff");
	expect(h["referrer-policy"]).toBeTruthy();
});

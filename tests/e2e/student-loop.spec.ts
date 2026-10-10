import { expect, test, type BrowserContext, type Page } from "@playwright/test";

/**
 * §19 checks that need real accounts: V1, V2, V6, V10, V13, V14, V15.
 *
 * **This writes data.** It signs two test students in (ending their other
 * sessions), starts a real attempt on `E2E_LISTENING_REF` for student A and
 * submits it. Point it only at **test accounts** and a test assignment whose
 * attempt limit can absorb a run. Skipped entirely unless every variable below
 * is set — see `tests/e2e/README.md`.
 */

const env = {
	aEmail: process.env.E2E_STUDENT_A_EMAIL,
	aPassword: process.env.E2E_STUDENT_A_PASSWORD,
	bEmail: process.env.E2E_STUDENT_B_EMAIL,
	bPassword: process.env.E2E_STUDENT_B_PASSWORD,
	/** An assignment id, or `practice:{testId}`, for a Listening **mock** student A may start now. */
	ref: process.env.E2E_LISTENING_REF,
};
const configured = Object.values(env).every(Boolean);

/** Field names that only exist in `key.json` or the marks — never in a player response. */
const KEY_MARKERS = ['"accepted_variants"', '"is_correct"', '"marks_awarded"', "key.json", '"answer":['];

async function signIn(page: Page, email: string, password: string) {
	await page.goto("/login");
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill(password);
	// Turnstile fills a hidden input once it has a token (test keys: at once).
	await expect(page.locator('input[name="cf-turnstile-response"]')).not.toHaveValue("", { timeout: 20_000 });
	await page.getByRole("button", { name: "Sign in" }).click();
	await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
}

async function signOut(page: Page) {
	await page.goto("/profile");
	await page.getByRole("button", { name: "Log out" }).click();
	await page.getByRole("button", { name: "Yes, log out" }).click();
	await expect(page).toHaveURL(/\/login/);
}

/** Keys currently in the browser's audio cache. */
async function cachedAudioKeys(page: Page): Promise<string[]> {
	return page.evaluate(async () => {
		if (!(await caches.has("insignia-audio-v1"))) return [];
		const cache = await caches.open("insignia-audio-v1");
		return (await cache.keys()).map((r) => new URL(r.url).pathname);
	});
}

/** Seconds on the player's clock. */
async function clockSeconds(page: Page): Promise<number> {
	const text = (await page.getByRole("timer").textContent()) ?? "";
	const m = /(\d+):(\d{2})/.exec(text);
	if (!m) throw new Error(`No clock in "${text}"`);
	return Number(m[1]) * 60 + Number(m[2]);
}

test.describe.serial("Student loop, signed in", () => {
	test.skip(!configured, "Set E2E_STUDENT_A_*, E2E_STUDENT_B_* and E2E_LISTENING_REF to run (see tests/e2e/README.md)");

	let context: BrowserContext;
	let page: Page;
	let attemptId = "";

	test.beforeAll(async ({ browser }) => {
		context = await browser.newContext();
		page = await context.newPage();
		await signIn(page, env.aEmail!, env.aPassword!);
	});
	test.afterAll(async () => context?.close());

	test("V15 — Start stays unavailable until the whole recording is downloaded", async () => {
		// Hold the download for a few seconds so the waiting state is observable.
		let release!: () => void;
		const held = new Promise<void>((resolve) => (release = resolve));
		await page.route("**/start/audio", async (route) => {
			await held;
			await route.continue();
		});

		await page.goto(`/tests/${encodeURIComponent(env.ref!)}/start`);
		const start = page.getByRole("button", { name: /Wait for the audio|I.m ready/ });
		await expect(page.getByText("Getting your audio ready")).toBeVisible();
		await expect(start).toBeDisabled();
		await expect(start).toHaveText(/Wait for the audio/);

		release();
		await expect(page.getByRole("button", { name: /I.m ready — Start/ })).toBeEnabled({ timeout: 60_000 });
		await page.unroute("**/start/audio");

		const keys = await cachedAudioKeys(page);
		expect(keys).toHaveLength(1);
		expect(keys[0]).toMatch(/^\/audio-cache\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/v\d+$/);
	});

	test("V6 + V13 — no answer key in any response, and the audio never touches the network", async () => {
		const bodies: { url: string; body: string }[] = [];
		const audioRequests: string[] = [];
		page.on("request", (req) => {
			const url = req.url();
			if (/\/start\/audio|\.mp3|r2\.cloudflarestorage\.com\/.*audio/.test(url)) audioRequests.push(url);
		});
		page.on("response", async (res) => {
			const type = res.headers()["content-type"] ?? "";
			if (!/json|text|x-component/.test(type)) return;
			try {
				bodies.push({ url: res.url(), body: await res.text() });
			} catch {
				// Redirects and aborted requests have no body.
			}
		});

		await page.getByRole("button", { name: /I.m ready — Start/ }).click();
		await expect(page).toHaveURL(/\/attempt\/[0-9a-f-]{36}/, { timeout: 30_000 });
		attemptId = page.url().split("/attempt/")[1]!.split(/[?#]/)[0]!;
		await expect(page.getByRole("timer")).toBeVisible();

		// Walk every section and back: navigation must never re-request audio.
		for (;;) {
			const next = page.getByRole("button", { name: "Next", exact: true });
			if (!(await next.isVisible())) break;
			await next.click();
		}
		while (await page.getByRole("button", { name: "Previous" }).isEnabled()) {
			await page.getByRole("button", { name: "Previous" }).click();
		}

		expect(audioRequests, "the player plays the cached copy").toEqual([]);
		for (const { url, body } of bodies) {
			for (const marker of KEY_MARKERS) {
				expect(body.includes(marker), `${marker} in ${url}`).toBe(false);
			}
		}
	});

	test("V1 — a reload resumes with the server's time, not a fresh clock", async () => {
		const before = await clockSeconds(page);
		await page.reload();
		await expect(page.getByRole("timer")).toBeVisible();
		const after = await clockSeconds(page);
		expect(after).toBeLessThanOrEqual(before);
		expect(before - after).toBeLessThan(30);
	});

	test("V2 — moving the browser's clock does not move the test's", async () => {
		const honest = await clockSeconds(page);
		const skewed = await context.newPage();
		// Two hours ahead, before any app code runs.
		await skewed.addInitScript(() => {
			const shift = 2 * 60 * 60 * 1000;
			const RealDate = Date;
			const now = () => RealDate.now() + shift;
			globalThis.Date = new Proxy(RealDate, {
				construct: (target, args) => Reflect.construct(target, args.length ? args : [now()]),
				get: (target, prop, receiver) => (prop === "now" ? now : Reflect.get(target, prop, receiver)),
			});
		});
		await skewed.goto(`/attempt/${attemptId}`);
		await expect(skewed.getByRole("timer")).toBeVisible();
		const seen = await clockSeconds(skewed);
		expect(Math.abs(seen - honest)).toBeLessThan(30);
		await skewed.close();
	});

	test("V10 — student B cannot open student A's attempt, result or review", async ({ browser }) => {
		const other = await browser.newContext();
		const b = await other.newPage();
		await signIn(b, env.bEmail!, env.bPassword!);
		for (const path of [`/attempt/${attemptId}`, `/results/${attemptId}`, `/review/${attemptId}`]) {
			await b.goto(path);
			await expect(b.getByRole("heading", { name: "We couldn’t find that page" }), path).toBeVisible();
			await expect(b.getByRole("timer"), path).toHaveCount(0);
		}
		await other.close();
	});

	test("Submit, and the mock's recording is dropped from the cache", async () => {
		await page.goto(`/attempt/${attemptId}`);
		for (;;) {
			const next = page.getByRole("button", { name: "Next", exact: true });
			if (!(await next.isVisible())) break;
			await next.click();
		}
		await page.getByRole("button", { name: "Finish Test" }).click();
		await page.getByRole("button", { name: /^(Finish|Submit anyway)$/ }).click();
		await expect(page).toHaveURL(/\/results\//, { timeout: 30_000 });
		expect(await cachedAudioKeys(page)).toEqual([]);
	});

	test("V14 — the next student on this browser inherits no audio", async () => {
		// Put a copy back as A, then hand the machine to B.
		await page.goto(`/tests/${encodeURIComponent(env.ref!)}/start`);
		await page.waitForTimeout(500);
		await signOut(page);
		expect(await cachedAudioKeys(page), "Log out purges").toEqual([]);

		await signIn(page, env.bEmail!, env.bPassword!);
		expect(await cachedAudioKeys(page), "B starts with nothing of A's").toEqual([]);
		await signOut(page);
	});
});

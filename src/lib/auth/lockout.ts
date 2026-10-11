import "server-only";

import {
	ACCOUNT_LIMIT,
	IP_LIMIT,
	WINDOW_SECONDS,
	accountKey,
	ipKey,
	windowEndOf,
	windowStartAt,
} from "@/lib/auth/lockout-rules";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Sign-in lockout and rate limiting (M1-09).
 *
 * Two independent counters, and **both** must be clear to let an attempt
 * through:
 *
 * - **By account.** Five wrong passwords and that email is locked, so guessing
 *   one student's password from a thousand addresses gets nowhere.
 * - **By IP.** A wider allowance, so that one machine cannot work through a
 *   list of accounts. This is the counter a lab of 200 students behind one
 *   router brushes against, which is why its limit is generous and why
 *   Supabase's own per-IP limit has to be raised alongside it (`MVP-1.md` §4).
 *
 * The lock is the remainder of the current window, so the screen can always say
 * *until when* — "try again later" sends people to the front desk, which is the
 * thing this product is trying not to do.
 *
 * **Storage.** BUILD-STEPS step 39 specifies a Durable Object keeping counts in
 * memory and writing storage only when a lock is set. That is the right end
 * state and this module is shaped for it — the interface is
 * `checkSignInAllowed` / `recordFailedSignIn` / `clearSignInFailures` and says
 * nothing about where counts live. It is backed for now by `public.rate_limits`,
 * which M0-10 created for this purpose, because exporting a custom Durable
 * Object means repointing the Worker's entrypoint at a wrapper around
 * OpenNext's generated one, and that is a build change that deserves its own
 * review rather than riding along with auth.
 */

/** What the login screen is allowed to do next. */
export type SignInVerdict =
	| { allowed: true; triesLeft: number }
	| { allowed: false; lockedUntil: Date; scope: "account" | "ip" };

type LimitRow = { attempts: number; window_start: string; locked: boolean };

const windowEnd = (row: LimitRow) => windowEndOf(row.window_start);

/**
 * Whether this attempt may proceed — **without** spending one.
 *
 * Called before the password is checked, so a locked account never reaches
 * Supabase Auth and a lockout cannot be extended indefinitely by an attacker
 * who keeps trying.
 */
export async function checkSignInAllowed(email: string, ip: string | null): Promise<SignInVerdict> {
	const db = createAdminClient();

	const { data: account } = await db.rpc("peek_rate_limit", {
		p_key: accountKey(email),
		p_window_seconds: WINDOW_SECONDS,
		p_limit: ACCOUNT_LIMIT,
	});
	const accountRow = (account as LimitRow[] | null)?.[0];
	if (accountRow?.locked) {
		return { allowed: false, lockedUntil: windowEnd(accountRow), scope: "account" };
	}

	if (ip) {
		const { data: byIp } = await db.rpc("peek_rate_limit", {
			p_key: ipKey(ip),
			p_window_seconds: WINDOW_SECONDS,
			p_limit: IP_LIMIT,
		});
		const ipRow = (byIp as LimitRow[] | null)?.[0];
		if (ipRow?.locked) {
			return { allowed: false, lockedUntil: windowEnd(ipRow), scope: "ip" };
		}
	}

	return { allowed: true, triesLeft: Math.max(0, ACCOUNT_LIMIT - (accountRow?.attempts ?? 0)) };
}

/**
 * Records one wrong password and reports what is left.
 *
 * Counted per account **and** per IP, so neither dimension can be attacked
 * from the other.
 */
export async function recordFailedSignIn(email: string, ip: string | null): Promise<SignInVerdict> {
	const db = createAdminClient();

	const { data: account } = await db.rpc("bump_rate_limit", {
		p_key: accountKey(email),
		p_window_seconds: WINDOW_SECONDS,
		p_limit: ACCOUNT_LIMIT,
	});

	if (ip) {
		await db.rpc("bump_rate_limit", {
			p_key: ipKey(ip),
			p_window_seconds: WINDOW_SECONDS,
			p_limit: IP_LIMIT,
		});
	}

	const row = (account as LimitRow[] | null)?.[0];
	if (!row) return { allowed: true, triesLeft: ACCOUNT_LIMIT - 1 };

	if (row.locked) return { allowed: false, lockedUntil: windowEnd(row), scope: "account" };
	return { allowed: true, triesLeft: Math.max(0, ACCOUNT_LIMIT - row.attempts) };
}

/**
 * Forgets an account's failures after a correct password.
 *
 * The IP counter is deliberately **not** cleared: in a lab, one student signing
 * in successfully should not reset the allowance for a machine that is working
 * through other people's accounts.
 */
export async function clearSignInFailures(email: string): Promise<void> {
	await createAdminClient().rpc("clear_rate_limit", { p_key: accountKey(email) });
}

/**
 * Which of these accounts are locked out right now, and until when — for the
 * staff screens that offer "Unlock sign-in".
 *
 * One query for a whole roster rather than a peek per student. Keyed by the
 * lower-cased email; an account that isn't locked is simply absent.
 */
export async function lockedAccounts(emails: readonly string[]): Promise<Map<string, Date>> {
	const locked = new Map<string, Date>();
	if (emails.length === 0) return locked;

	const byKey = new Map(emails.map((email) => [accountKey(email), email.trim().toLowerCase()]));
	const { data, error } = await createAdminClient()
		.from("rate_limits")
		.select("key, window_start, count")
		.in("key", [...byKey.keys()])
		.eq("window_start", windowStartAt(new Date()).toISOString())
		.gte("count", ACCOUNT_LIMIT);
	if (error) {
		// Not knowing who is locked must not break the roster around it.
		console.error("lockedAccounts failed:", error.message);
		return locked;
	}

	for (const row of data ?? []) {
		const email = byKey.get(row.key);
		if (email) locked.set(email, windowEndOf(row.window_start));
	}
	return locked;
}

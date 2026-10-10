import "server-only";

/**
 * Optional query timing for local profiling.
 *
 * With `PERF_LOG=1` in the environment, every Supabase request prints one line
 * — duration, method and table — so a page's round trips can be counted:
 *
 *     [db]  231 ms  GET users
 *
 * Off by default, and the production Worker never sets it.
 *
 * @returns A `fetch` for the Supabase client's `global.fetch`, or `undefined`
 *   to keep the default.
 */
export function timedFetch(): typeof fetch | undefined {
	if (process.env.PERF_LOG !== "1") return undefined;
	return async (input, init) => {
		const started = performance.now();
		try {
			return await fetch(input, init);
		} finally {
			const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
			const target = url.pathname.replace(/^\/(rest|auth)\/v1\//, "");
			const ms = Math.round(performance.now() - started);
			console.log(`[db] ${String(ms).padStart(4)} ms  ${init?.method ?? "GET"} ${target}`);
		}
	};
}

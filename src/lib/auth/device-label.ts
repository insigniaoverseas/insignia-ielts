/**
 * A device's name as a student reads it on Profile — "Chrome on Android", not
 * the first four words of a user-agent string ("Mozilla/5.0 (Linux; Android").
 *
 * **Pure** and approximate on purpose. It only has to let someone recognise
 * their own phone or the lab computer; it is never used to decide anything.
 * Order matters in both lists: Edge and Opera also say "Chrome", Chrome also
 * says "Safari", and Android also says "Linux".
 */

const BROWSERS: readonly [RegExp, string][] = [
	[/Edg(e|A|iOS)?\//, "Edge"],
	[/OPR\/|Opera/, "Opera"],
	[/SamsungBrowser\//, "Samsung Internet"],
	[/Firefox\/|FxiOS\//, "Firefox"],
	[/Chrome\/|CriOS\//, "Chrome"],
	[/Safari\//, "Safari"],
];

const SYSTEMS: readonly [RegExp, string][] = [
	[/iPhone/, "iPhone"],
	[/iPad/, "iPad"],
	[/Android/, "Android"],
	[/Windows/, "Windows"],
	[/Mac OS X|Macintosh/, "Mac"],
	[/CrOS/, "Chromebook"],
	[/Linux/, "Linux"],
];

const first = (list: readonly [RegExp, string][], ua: string) => list.find(([pattern]) => pattern.test(ua))?.[1];

/**
 * @param userAgent The `User-Agent` recorded when the session started, or `null`.
 * @returns "Browser on System", whichever half is known, or "Unknown device".
 */
export function deviceLabel(userAgent: string | null): string {
	if (!userAgent) return "Unknown device";
	const browser = first(BROWSERS, userAgent);
	const system = first(SYSTEMS, userAgent);
	if (browser && system) return `${browser} on ${system}`;
	return browser ?? system ?? "Unknown device";
}

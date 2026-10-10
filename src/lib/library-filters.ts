/**
 * The test library's filters (M10-02) — **pure**, so they are tested without a
 * browser. The page loads every test once; these narrow the list in memory,
 * and their state lives in the URL query so a filtered view can be reloaded or
 * shared.
 */

export type LibraryFilters = {
	q: string;
	skill: "" | "listening" | "reading";
	variant: "" | "academic" | "general" | "n_a";
	difficulty: "" | "easy" | "medium" | "hard";
	kind: "" | "mock" | "class" | "practice";
	status: "" | "draft" | "published" | "archived";
};

export const NO_FILTERS: LibraryFilters = { q: "", skill: "", variant: "", difficulty: "", kind: "", status: "" };

const ALLOWED: { [K in Exclude<keyof LibraryFilters, "q">]: readonly LibraryFilters[K][] } = {
	skill: ["listening", "reading"],
	variant: ["academic", "general", "n_a"],
	difficulty: ["easy", "medium", "hard"],
	kind: ["mock", "class", "practice"],
	status: ["draft", "published", "archived"],
};

/** Reads filters from a URL query, dropping anything unknown. */
export function filtersFromQuery(query: URLSearchParams | Record<string, string | undefined>): LibraryFilters {
	const get = (k: string) => (query instanceof URLSearchParams ? query.get(k) : query[k]) ?? "";
	const pick = <K extends Exclude<keyof LibraryFilters, "q">>(k: K): LibraryFilters[K] =>
		(ALLOWED[k] as readonly string[]).includes(get(k)) ? (get(k) as LibraryFilters[K]) : ("" as LibraryFilters[K]);
	return {
		q: get("q").slice(0, 100),
		skill: pick("skill"),
		variant: pick("variant"),
		difficulty: pick("difficulty"),
		kind: pick("kind"),
		status: pick("status"),
	};
}

/** The query string for a set of filters — only the ones that are set. */
export function filtersToQuery(filters: LibraryFilters): string {
	const params = new URLSearchParams();
	for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
	const text = params.toString();
	return text ? `?${text}` : "";
}

/** Rows that match every set filter. The search matches title and tags, ignoring case. */
export function filterTests<T extends { title: string; tags: string[]; skill: string; variant: string; difficulty: string; kind: string; status: string }>(
	rows: readonly T[],
	f: LibraryFilters,
): T[] {
	const q = f.q.trim().toLowerCase();
	return rows.filter(
		(r) =>
			(!q || r.title.toLowerCase().includes(q) || r.tags.some((t) => t.toLowerCase().includes(q))) &&
			(!f.skill || r.skill === f.skill) &&
			(!f.variant || r.variant === f.variant) &&
			(!f.difficulty || r.difficulty === f.difficulty) &&
			(!f.kind || r.kind === f.kind) &&
			(!f.status || r.status === f.status),
	);
}

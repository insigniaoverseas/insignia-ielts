/**
 * Test filters for the Test library (M10-02) and the Assign page (M10-17) —
 * **pure**, so they are tested without a browser. A page loads its tests once;
 * these narrow the list in memory, and their state lives in the URL query so a
 * filtered view can be reloaded or shared.
 *
 * Every filter but the search holds **several** values, so "Easy and Medium"
 * is one view (M10-17). An empty list means "any".
 */

export type LibraryFilters = {
	q: string;
	skill: ("listening" | "reading")[];
	variant: ("academic" | "general" | "n_a")[];
	difficulty: ("easy" | "medium" | "hard")[];
	kind: ("mock" | "class" | "practice")[];
	status: ("draft" | "published" | "archived")[];
};

/** The filters that hold a list of values. */
export type ListFilter = Exclude<keyof LibraryFilters, "q">;

export const NO_FILTERS: LibraryFilters = { q: "", skill: [], variant: [], difficulty: [], kind: [], status: [] };

/** Every value each filter accepts, in the order the chips show them. */
export const FILTER_VALUES: { [K in ListFilter]: readonly LibraryFilters[K][number][] } = {
	skill: ["listening", "reading"],
	variant: ["academic", "general", "n_a"],
	difficulty: ["easy", "medium", "hard"],
	kind: ["mock", "class", "practice"],
	status: ["published", "draft", "archived"],
};

const LIST_KEYS = Object.keys(FILTER_VALUES) as ListFilter[];

/**
 * Reads filters from a URL query, dropping anything unknown. A list is
 * comma-separated (`difficulty=easy,medium`); a single value, as older links
 * have, reads the same way.
 */
export function filtersFromQuery(query: URLSearchParams | Record<string, string | undefined>): LibraryFilters {
	const get = (k: string) => (query instanceof URLSearchParams ? query.get(k) : query[k]) ?? "";
	const filters: LibraryFilters = { ...NO_FILTERS, q: get("q").slice(0, 100) };
	for (const key of LIST_KEYS) {
		const asked = new Set(get(key).split(","));
		// Kept in the chips' order, so a filter always reads the same way.
		(filters[key] as string[]) = (FILTER_VALUES[key] as readonly string[]).filter((value) => asked.has(value));
	}
	return filters;
}

/** The query string for a set of filters — only the ones that are set. */
export function filtersToQuery(filters: LibraryFilters): string {
	const params = new URLSearchParams();
	if (filters.q) params.set("q", filters.q);
	for (const key of LIST_KEYS) if (filters[key].length > 0) params.set(key, filters[key].join(","));
	const text = params.toString().replaceAll("%2C", ",");
	return text ? `?${text}` : "";
}

/** True when any filter, or the search, is set. */
export function hasFilters(filters: LibraryFilters): boolean {
	return filters.q.trim() !== "" || LIST_KEYS.some((key) => filters[key].length > 0);
}

/** The filters with one value switched on or off. */
export function toggleFilter<K extends ListFilter>(filters: LibraryFilters, key: K, value: LibraryFilters[K][number]): LibraryFilters {
	const current = filters[key] as string[];
	const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
	return { ...filters, [key]: (FILTER_VALUES[key] as readonly string[]).filter((v) => next.includes(v)) };
}

/**
 * Rows that match every set filter: within one filter any ticked value matches
 * ("Easy or Medium"), across filters all must ("Reading and Easy"). The search
 * matches title and tags, ignoring case. A row without tags or a status (the
 * Assign page's tests are all published) is matched on what it has.
 */
export function filterTests<
	T extends { title: string; tags?: readonly string[]; skill: string; variant: string; difficulty: string; kind: string; status?: string },
>(rows: readonly T[], f: LibraryFilters): T[] {
	const q = f.q.trim().toLowerCase();
	const ok = (values: readonly string[], value: string) => values.length === 0 || values.includes(value);
	return rows.filter(
		(r) =>
			(!q || r.title.toLowerCase().includes(q) || (r.tags ?? []).some((t) => t.toLowerCase().includes(q))) &&
			ok(f.skill, r.skill) &&
			ok(f.variant, r.variant) &&
			ok(f.difficulty, r.difficulty) &&
			ok(f.kind, r.kind) &&
			ok(f.status, r.status ?? "published"),
	);
}

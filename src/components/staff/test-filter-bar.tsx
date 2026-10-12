"use client";

import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { Input } from "@/components/ui/input";
import { FILTER_VALUES, NO_FILTERS, hasFilters, toggleFilter, type LibraryFilters, type ListFilter } from "@/lib/library-filters";

/** Tighter than a toolbar chip, so more groups fit on a line. */
const CHIP = "gap-1.5 px-2.5 py-1";

const GROUP_LABEL: Record<ListFilter, string> = {
	skill: "Skill",
	variant: "Variant",
	difficulty: "Difficulty",
	kind: "Type",
	status: "Status",
};

const VALUE_LABEL: Record<string, string> = {
	listening: "Listening",
	reading: "Reading",
	academic: "Academic",
	general: "General Training",
	n_a: "Listening (no variant)",
	easy: "Easy",
	medium: "Medium",
	hard: "Hard",
	mock: "Mock",
	class: "Class",
	practice: "Practice",
	published: "Published",
	draft: "Draft",
	archived: "Archived",
};

/**
 * The search box and chip filters over a list of tests — the Test library and
 * the Assign page share it (M10-17).
 *
 * Each boxed group of chips is one filter; the groups sit side by side and
 * wrap onto the next line. Chips in a group can be ticked together ("Easy"
 * and "Medium"); **Any** clears that group. Every chip is a pressed /
 * not-pressed button, so the state is announced, not only tinted.
 *
 * @param groups - Which filters to offer, in order.
 * @param counts - Optional count per value ("Easy 18"), from the unfiltered list.
 * @param summary - The live line under the chips, e.g. "8 of 50 tests".
 */
export function TestFilterBar({
	filters,
	onChange,
	groups,
	counts,
	summary,
	searchLabel = "Search tests by title or tag",
}: {
	filters: LibraryFilters;
	onChange: (next: LibraryFilters) => void;
	groups: ListFilter[];
	counts?: Partial<Record<string, number>>;
	summary: string;
	searchLabel?: string;
}) {
	return (
		<div className="flex w-full flex-col gap-3">
			<div className="flex flex-wrap items-center gap-3">
				<Input
					size="admin"
					className="min-w-[220px] flex-1"
					value={filters.q}
					onChange={(e) => onChange({ ...filters, q: e.target.value })}
					placeholder="Search by title or tag"
					aria-label={searchLabel}
				/>
				{hasFilters(filters) && (
					<Button variant="secondary" onClick={() => onChange(NO_FILTERS)}>
						Clear filters
					</Button>
				)}
			</div>
			{/* Groups sit side by side and wrap as a whole; each keeps its chips together. */}
			<div className="flex flex-wrap items-center gap-x-3 gap-y-2">
				{groups.map((key) => (
					<div
						key={key}
						role="group"
						aria-label={GROUP_LABEL[key]}
						className="inline-flex flex-wrap items-center gap-1 rounded-control border border-line bg-bg py-1 pr-1 pl-2.5"
					>
						<span className="mr-1 text-small font-semibold text-ink-2">{GROUP_LABEL[key]}</span>
						<FilterChip className={CHIP} pressed={filters[key].length === 0} onClick={() => onChange({ ...filters, [key]: [] })}>
							Any
						</FilterChip>
						{(FILTER_VALUES[key] as readonly string[]).map((value) => (
							<FilterChip
								key={value}
								className={CHIP}
								pressed={(filters[key] as string[]).includes(value)}
								onClick={() => onChange(toggleFilter(filters, key, value as never))}
							>
								{VALUE_LABEL[value] ?? value}
								{counts?.[`${key}:${value}`] !== undefined && (
									<span className="font-mono font-medium opacity-70">{counts[`${key}:${value}`]}</span>
								)}
							</FilterChip>
						))}
					</div>
				))}
			</div>
			<span className="text-small text-ink-2" aria-live="polite">
				{summary}
			</span>
		</div>
	);
}

/**
 * How many rows hold each value of each filter, keyed `"difficulty:easy"` —
 * the numbers on the chips.
 */
export function countByValue(rows: readonly Record<string, unknown>[], groups: readonly ListFilter[]): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const row of rows) {
		for (const key of groups) {
			const value = key === "status" ? (row.status ?? "published") : row[key];
			const slot = `${key}:${String(value)}`;
			counts[slot] = (counts[slot] ?? 0) + 1;
		}
	}
	return counts;
}

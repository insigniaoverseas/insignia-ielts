"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { SKILL_LABEL } from "@/components/student/labels";
import { Button } from "@/components/ui/button";
import { DifficultyBadge } from "@/components/ui/difficulty-badge";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import { Table, TableBody, TableCard, TableCell, TableHead, TableHeader, TableRow, TableToolbar } from "@/components/ui/table";
import { NO_FILTERS, filterTests, filtersToQuery, type LibraryFilters } from "@/lib/library-filters";
import type { TestLibraryRow } from "@/lib/view-models/admin";
import { Icon } from "@/components/ui/icon";

const VARIANT_LABEL = { academic: "Academic", general: "General Training", n_a: "—" } as const;
const KIND_LABEL = { mock: "Mock", class: "Class", practice: "Practice" } as const;

/** The dropdowns, in reading order. "Any" is always first. */
const SELECTS: { key: Exclude<keyof LibraryFilters, "q">; label: string; options: [string, string][] }[] = [
	{ key: "skill", label: "Skill", options: [["listening", "Listening"], ["reading", "Reading"]] },
	{ key: "variant", label: "Variant", options: [["academic", "Academic"], ["general", "General Training"], ["n_a", "Listening (no variant)"]] },
	{ key: "difficulty", label: "Difficulty", options: [["easy", "Easy"], ["medium", "Medium"], ["hard", "Hard"]] },
	{ key: "kind", label: "Type", options: [["mock", "Mock"], ["class", "Class"], ["practice", "Practice"]] },
	{ key: "status", label: "Status", options: [["published", "Published"], ["draft", "Draft"], ["archived", "Archived"]] },
];

/**
 * Screen 26's list with its filters (M10-02).
 *
 * Every test arrives **once**, from the server; the filters narrow it here, in
 * memory — no request per click. Their state is mirrored into the URL with
 * `replaceState`, so a filtered view survives a reload and can be shared,
 * without a navigation.
 */
export function LibraryBrowser({ rows, initial }: { rows: TestLibraryRow[]; initial: LibraryFilters }) {
	const [filters, setFilters] = useState(initial);
	const shown = useMemo(() => filterTests(rows, filters), [rows, filters]);
	const active = Object.values(filters).some(Boolean);

	function set(next: LibraryFilters) {
		setFilters(next);
		window.history.replaceState(null, "", `${window.location.pathname}${filtersToQuery(next)}`);
	}

	return (
		<TableCard>
			<TableToolbar>
				<div className="flex w-full flex-col gap-3">
					<div className="flex flex-wrap items-end gap-3">
						<label className="flex min-w-[220px] flex-1 flex-col gap-1">
							<span className="text-small font-semibold">Search</span>
							<Input
								size="admin"
								value={filters.q}
								onChange={(e) => set({ ...filters, q: e.target.value })}
								placeholder="Title or tag"
								aria-label="Search tests by title or tag"
							/>
						</label>
						{SELECTS.map((s) => (
							<label key={s.key} className="flex flex-col gap-1">
								<span className="text-small font-semibold">{s.label}</span>
								<select
									value={filters[s.key]}
									onChange={(e) => set({ ...filters, [s.key]: e.target.value } as LibraryFilters)}
									className="h-10 rounded-control border border-line bg-surface px-3 text-body"
								>
									<option value="">Any</option>
									{s.options.map(([value, label]) => (
										<option key={value} value={value}>
											{label}
										</option>
									))}
								</select>
							</label>
						))}
						{active && (
							<Button variant="secondary" onClick={() => set(NO_FILTERS)}>
								Clear filters
							</Button>
						)}
					</div>
					<span className="text-small text-ink-2" aria-live="polite">
						{active ? `${shown.length} of ${rows.length} tests` : `${rows.length} ${rows.length === 1 ? "test" : "tests"}`}
					</span>
				</div>
			</TableToolbar>

			<Table>
				<TableHeader sticky>
					<TableRow>
						<TableHead>Test</TableHead>
						<TableHead>Skill</TableHead>
						<TableHead>Variant</TableHead>
						<TableHead>Difficulty</TableHead>
						<TableHead>Type</TableHead>
						<TableHead className="text-right">Questions</TableHead>
						<TableHead>Status</TableHead>
						<TableHead className="text-right">Updated</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{shown.length === 0 ? (
						<TableRow>
							<TableCell colSpan={8} className="py-8 text-center text-ink-2">
								No tests match these filters.
							</TableCell>
						</TableRow>
					) : (
						shown.map((t) => (
							<TableRow key={t.id}>
								<TableCell>
									<Link href={`/admin/library/${t.id}/answer-key`} className="font-semibold">
										{t.title}
									</Link>
									{t.tags.length > 0 && <div className="text-small text-ink-2">{t.tags.join(" · ")}</div>}
									<Link href={`/admin/library/${t.id}/preview`} className="block text-small font-semibold">
										Preview as a student <Icon name="arrow-right" />
									</Link>
									<Link href={`/admin/library/${t.id}/answer-key`} className="block text-small font-semibold">
										{t.status === "draft" ? "Review and publish" : "Answer key"} <Icon name="arrow-right" />
									</Link>
								</TableCell>
								<TableCell className="text-ink-2">{SKILL_LABEL[t.skill]}</TableCell>
								<TableCell className="text-ink-2">{VARIANT_LABEL[t.variant]}</TableCell>
								<TableCell>
									<DifficultyBadge level={t.difficulty} />
								</TableCell>
								<TableCell className="text-ink-2">{KIND_LABEL[t.kind]}</TableCell>
								<TableCell className="text-right font-mono">{t.questionCount}</TableCell>
								<TableCell>
									<StatusPill
										status={t.status === "published" ? "active" : t.status === "draft" ? "not_started" : "locked"}
										size="sm"
										label={t.status === "published" ? "Published" : t.status === "draft" ? "Draft" : "Archived"}
									/>
								</TableCell>
								<TableCell className="text-right text-small text-ink-2">{t.updatedLabel}</TableCell>
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
		</TableCard>
	);
}

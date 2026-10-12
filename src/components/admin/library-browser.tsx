"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { SKILL_LABEL } from "@/components/student/labels";
import { TestFilterBar, countByValue } from "@/components/staff/test-filter-bar";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/dialog";
import { DifficultyBadge } from "@/components/ui/difficulty-badge";
import { Icon } from "@/components/ui/icon";
import { KindBadge } from "@/components/ui/kind-badge";
import { StatusPill } from "@/components/ui/status-pill";
import {
	Table,
	TableBody,
	TableBulkActions,
	TableCard,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	TableToolbar,
} from "@/components/ui/table";
import { changeTestDetailsAction } from "@/lib/actions/test-details";
import type { FormState } from "@/lib/actions/types";
import { filterTests, filtersToQuery, hasFilters, type LibraryFilters, type ListFilter } from "@/lib/library-filters";
import {
	DIFFICULTIES,
	DIFFICULTY_LABEL,
	KIND_HINT,
	KIND_LABEL,
	TEST_KINDS,
	detailsWarning,
	drillsKept,
	type DetailsChange,
} from "@/lib/test-details";
import { QUESTION_TYPES, isQuestionType } from "@/lib/question-types";
import type { TestLibraryRow } from "@/lib/view-models/admin";

const VARIANT_LABEL = { academic: "Academic", general: "General Training", n_a: "—" } as const;

/** "Matching headings" for a question-type practice set, or null. */
function drillName(drill: string | null): string | null {
	return drill && isQuestionType(drill) ? QUESTION_TYPES[drill].officialName : null;
}
const GROUPS: ListFilter[] = ["skill", "difficulty", "kind", "status", "variant"];

/**
 * Screen 26's list: chip filters (M10-02, several values at once since
 * M10-17), and ticking tests to change their **type** or **difficulty**
 * together (M10-17).
 *
 * Every test arrives **once**, from the server; the filters narrow it here, in
 * memory — no request per click. Their state is mirrored into the URL with
 * `replaceState`, so a filtered view survives a reload and can be shared.
 *
 * A change always goes through a confirm box that names how many tests it
 * touches, and warns when a used paper would become Practice. The server
 * re-checks the permission and every value.
 */
export function LibraryBrowser({ rows, initial }: { rows: TestLibraryRow[]; initial: LibraryFilters }) {
	const [filters, setFilters] = useState(initial);
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [asking, setAsking] = useState<DetailsChange | null>(null);
	const [result, setResult] = useState<FormState>(null);
	const [pending, startTransition] = useTransition();

	const shown = useMemo(() => filterTests(rows, filters), [rows, filters]);
	const counts = useMemo(() => countByValue(rows, GROUPS), [rows]);
	const picked = rows.filter((r) => selected.has(r.id));
	const shownPicked = shown.filter((r) => selected.has(r.id)).length;

	function setFilter(next: LibraryFilters) {
		setFilters(next);
		window.history.replaceState(null, "", `${window.location.pathname}${filtersToQuery(next)}`);
	}

	function toggle(id: string) {
		const next = new Set(selected);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		setSelected(next);
	}

	function toggleShown() {
		const next = new Set(selected);
		if (shownPicked === shown.length) for (const r of shown) next.delete(r.id);
		else for (const r of shown) next.add(r.id);
		setSelected(next);
	}

	function apply() {
		if (!asking) return;
		startTransition(async () => {
			const outcome = await changeTestDetailsAction([...selected], asking);
			setResult(outcome);
			setAsking(null);
			if (outcome?.ok) setSelected(new Set());
		});
	}

	const noun = picked.length === 1 ? "test" : "tests";
	const target = asking?.kind ? KIND_LABEL[asking.kind] : asking?.difficulty ? DIFFICULTY_LABEL[asking.difficulty] : "";
	const warning = asking ? detailsWarning(picked, asking) : null;
	const kept = asking ? drillsKept(picked, asking) : 0;

	return (
		<div className="flex flex-col gap-4">
			{result && <Banner tone={result.ok ? "info" : "warning"}>{result.message}</Banner>}
			<TableCard>
				<TableToolbar>
					<TestFilterBar
						filters={filters}
						onChange={setFilter}
						groups={GROUPS}
						counts={counts}
						summary={hasFilters(filters) ? `${shown.length} of ${rows.length} tests` : `${rows.length} ${rows.length === 1 ? "test" : "tests"}`}
					/>
				</TableToolbar>

				<Table>
					<TableHeader sticky>
						<TableRow>
							<TableHead className="w-10">
								<Checkbox
									checked={shown.length > 0 && shownPicked === shown.length ? true : shownPicked > 0 ? "indeterminate" : false}
									onCheckedChange={toggleShown}
									disabled={shown.length === 0}
									aria-label={`Select all ${shown.length} tests shown`}
								/>
							</TableHead>
							<TableHead>Test</TableHead>
							<TableHead>Skill</TableHead>
							<TableHead>Difficulty</TableHead>
							<TableHead>Type</TableHead>
							<TableHead>Variant</TableHead>
							<TableHead className="text-right">Questions</TableHead>
							<TableHead>Status</TableHead>
							<TableHead className="text-right">Updated</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{shown.length === 0 ? (
							<TableRow>
								<TableCell colSpan={9} className="py-8 text-center text-ink-2">
									No tests match these filters.
								</TableCell>
							</TableRow>
						) : (
							shown.map((t) => (
								<TableRow key={t.id} selected={selected.has(t.id)}>
									<TableCell>
										<Checkbox checked={selected.has(t.id)} onCheckedChange={() => toggle(t.id)} aria-label={`Select ${t.title}`} />
									</TableCell>
									<TableCell>
										<Link href={`/admin/library/${t.id}/answer-key`} className="font-semibold">
											{t.title}
										</Link>
										{t.tags.length > 0 && <div className="text-small text-ink-2">{t.tags.join(" · ")}</div>}
										<div className="flex flex-wrap gap-x-4">
											<Link href={`/admin/library/${t.id}/preview`} className="text-small font-semibold">
												Preview as a student <Icon name="arrow-right" />
											</Link>
											<Link href={`/admin/library/${t.id}/answer-key`} className="text-small font-semibold">
												{t.status === "draft" ? "Review and publish" : "Answer key"} <Icon name="arrow-right" />
											</Link>
										</div>
									</TableCell>
									<TableCell className="text-ink-2">{SKILL_LABEL[t.skill]}</TableCell>
									<TableCell>
										<DifficultyBadge level={t.difficulty} />
									</TableCell>
									<TableCell>
										<KindBadge kind={t.kind} />
										{drillName(t.drill) && <div className="mt-1 text-small text-ink-2">{drillName(t.drill)} only</div>}
									</TableCell>
									<TableCell className="text-ink-2">{VARIANT_LABEL[t.variant]}</TableCell>
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

				{picked.length > 0 && (
					<TableBulkActions>
						<span className="font-semibold">
							{picked.length} {noun} selected
							{picked.length > shownPicked && <span className="font-normal opacity-80"> ({picked.length - shownPicked} hidden by the filters)</span>}
						</span>
						<div className="flex flex-wrap items-center gap-2">
							<span className="text-small opacity-80">Make them</span>
							{TEST_KINDS.map((kind) => (
								<Button key={kind} variant="inverse-secondary" onClick={() => setAsking({ kind })}>
									{KIND_LABEL[kind]}
								</Button>
							))}
							<span className="ml-2 text-small opacity-80">Difficulty</span>
							{DIFFICULTIES.map((difficulty) => (
								<Button key={difficulty} variant="inverse-secondary" onClick={() => setAsking({ difficulty })}>
									{DIFFICULTY_LABEL[difficulty]}
								</Button>
							))}
							<Button variant="ghost" className="text-white" onClick={() => setSelected(new Set())}>
								Clear selection
							</Button>
						</div>
					</TableBulkActions>
				)}
			</TableCard>

			<ConfirmDialog
				open={asking !== null}
				onOpenChange={(open) => !open && !pending && setAsking(null)}
				title={`Make ${picked.length === 1 ? "this test" : `these ${picked.length} tests`} ${target}?`}
				description={
					<span className="flex flex-col gap-2">
						{asking?.kind && <span>{KIND_HINT[asking.kind]}</span>}
						{warning && <span className="font-semibold text-warning">{warning}</span>}
						{kept > 0 && (
							<span>
								{kept === 1 ? "1 of them is a question-type practice set" : `${kept} of them are question-type practice sets`}, so{" "}
								{kept === 1 ? "it stays" : "they stay"} Practice.
							</span>
						)}
						<span>Results students already have keep the type they were taken under.</span>
					</span>
				}
				confirmLabel={pending ? "Saving…" : `Yes, make ${picked.length === 1 ? "it" : "them"} ${target}`}
				cancelLabel="Not now"
				loading={pending}
				onConfirm={apply}
			/>
		</div>
	);
}

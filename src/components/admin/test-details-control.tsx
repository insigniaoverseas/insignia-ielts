"use client";

import { useState, useTransition } from "react";

import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { changeTestDetailsAction } from "@/lib/actions/test-details";
import type { FormState } from "@/lib/actions/types";
import {
	DIFFICULTIES,
	DIFFICULTY_LABEL,
	KIND_HINT,
	isDrill,
	KIND_LABEL,
	TEST_KINDS,
	detailsWarning,
	type Difficulty,
	type TestKind,
} from "@/lib/test-details";

/**
 * One test's **type** and **difficulty**, changed in place (M10-17).
 *
 * Pick the new values as chips, read what will happen, then save — two steps,
 * like publishing. Making a published, already-used paper Practice shows the
 * warning in the same words as the library's bulk change.
 */
export function TestDetailsControl({
	test,
	drillName = null,
}: {
	test: { id: string; title: string; kind: TestKind; difficulty: Difficulty; status: string; assigned: boolean; drill: string | null };
	/** "Matching headings" when the test is a question-type practice set. */
	drillName?: string | null;
}) {
	const locked = isDrill(test);
	const [kind, setKind] = useState<TestKind>(test.kind);
	const [difficulty, setDifficulty] = useState<Difficulty>(test.difficulty);
	const [result, setResult] = useState<FormState>(null);
	const [pending, startTransition] = useTransition();
	const dirty = kind !== test.kind || difficulty !== test.difficulty;
	const change = { ...(kind !== test.kind ? { kind } : {}), ...(difficulty !== test.difficulty ? { difficulty } : {}) };
	const warning = dirty ? detailsWarning([test], change) : null;

	function save() {
		startTransition(async () => {
			setResult(await changeTestDetailsAction([test.id], change));
		});
	}

	return (
		<div className="flex flex-col gap-4">
			<div role="group" aria-label="Type" className="flex flex-wrap items-center gap-2">
				<span className="w-[84px] flex-none font-semibold">Type</span>
				{TEST_KINDS.map((k) => (
					<FilterChip key={k} pressed={kind === k} disabled={locked && k !== kind} onClick={() => setKind(k)} className="disabled:cursor-not-allowed disabled:opacity-50">
						{KIND_LABEL[k]}
					</FilterChip>
				))}
			</div>
			<p className="m-0 pl-[92px] text-small text-ink-2">
				{locked
					? `A practice set that drills ${drillName ?? "one question type"} only. It stays Practice; you can change its difficulty.`
					: KIND_HINT[kind]}
			</p>
			<div role="group" aria-label="Difficulty" className="flex flex-wrap items-center gap-2">
				<span className="w-[84px] flex-none font-semibold">Difficulty</span>
				{DIFFICULTIES.map((d) => (
					<FilterChip key={d} pressed={difficulty === d} onClick={() => setDifficulty(d)}>
						{DIFFICULTY_LABEL[d]}
					</FilterChip>
				))}
			</div>
			{warning && <Banner tone="warning">{warning}</Banner>}
			{dirty && (
				<div className="flex flex-wrap items-center gap-3">
					<Button onClick={save} loading={pending}>
						{pending ? "Saving…" : "Save type and difficulty"}
					</Button>
					<Button
						variant="secondary"
						disabled={pending}
						onClick={() => {
							setKind(test.kind);
							setDifficulty(test.difficulty);
						}}
					>
						Undo
					</Button>
					<span className="text-small text-ink-2">Results students already have keep the type they were taken under.</span>
				</div>
			)}
			{result && <Banner tone={result.ok ? "info" : "warning"}>{result.message}</Banner>}
		</div>
	);
}

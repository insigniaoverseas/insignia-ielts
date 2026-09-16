"use client";

import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import type { AssignmentResults, OverridableAnswer } from "@/lib/view-models/teacher";

/**
 * The expanded row: re-mark one answer by hand (M6-05).
 *
 * Every override takes a note, and the note is required rather than optional.
 * The next person to look at this attempt — a teacher fielding a complaint, or
 * an admin auditing a band — needs to know *why* a mark was changed by hand,
 * and "I'll remember" is not true a month later.
 */
function OverrideRows({ answers }: { answers: OverridableAnswer[] }) {
	const [notes, setNotes] = useState<Record<number, string>>({});

	return (
		<div className="flex flex-col gap-3 border-l-2 border-brand bg-bg px-5 py-4">
			<p className="m-0 text-small font-semibold">
				Answers marked wrong. Give a mark back only if the student was right.
			</p>
			{answers.map((a) => (
				<div key={a.questionNumber} className="flex flex-wrap items-center gap-3">
					<span className="w-8 flex-none font-mono text-ink-2">{a.questionNumber}</span>
					<span className="flex min-w-[220px] flex-1 flex-wrap items-center gap-x-4 gap-y-1">
						<span className="text-danger">
							<span aria-hidden="true">✕</span> They wrote{" "}
							<strong className="font-semibold">{a.givenAnswer ?? "nothing"}</strong>
						</span>
						<span className="text-success">
							<span aria-hidden="true">✓</span> Key says{" "}
							<strong className="font-semibold">{a.correctAnswer}</strong>
						</span>
					</span>
					<Input
						size="admin"
						className="min-w-[200px] flex-1"
						value={notes[a.questionNumber] ?? ""}
						onChange={(e) => setNotes((n) => ({ ...n, [a.questionNumber]: e.target.value }))}
						placeholder="Why you're changing this"
						aria-label={`Why question ${a.questionNumber} is being re-marked`}
					/>
					<Button variant="secondary" disabled={!(notes[a.questionNumber] ?? "").trim()}>
						Give the mark
					</Button>
				</div>
			))}
		</div>
	);
}

/**
 * Screen 18 — Results & release (M6-04).
 *
 * Releasing is the moment a band becomes real to a student, so it is a
 * deliberate, multi-select, confirmed action rather than a per-row toggle that
 * can be hit by accident.
 *
 * Flags are shown but never act on their own (`MVP-1.md` M9-01: flags, not
 * blocks). "Left the tab 11 times" might be cheating or might be a browser
 * notification — the teacher is the one who knows which.
 */
export function ResultsTable({ data }: { data: AssignmentResults }) {
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [expanded, setExpanded] = useState<string | null>(null);
	const [confirming, setConfirming] = useState(false);

	const releasable = data.rows.filter((r) => !r.released);
	const allOn = selected.size === releasable.length && releasable.length > 0;
	const someOn = selected.size > 0 && !allOn;

	return (
		<TableCard>
			<TableToolbar>
				<div className="flex flex-col gap-1">
					<span className="text-small text-ink-2">
						{data.rows.length} submitted · {data.notStarted} never started ·{" "}
						{data.rows.filter((r) => r.released).length} released
					</span>
				</div>
			</TableToolbar>

			<Table>
				<TableHeader sticky>
					<TableRow>
						<TableHead className="w-12">
							<Checkbox
								checked={allOn ? true : someOn ? "indeterminate" : false}
								onCheckedChange={() =>
									setSelected(allOn ? new Set() : new Set(releasable.map((r) => r.attemptId)))
								}
								aria-label="Select every unreleased result"
							/>
						</TableHead>
						<TableHead>Student</TableHead>
						<TableHead className="text-right">Score</TableHead>
						<TableHead className="text-right">Band</TableHead>
						<TableHead>Time</TableHead>
						<TableHead>Flags</TableHead>
						<TableHead>Result</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{data.rows.map((r) => (
						<Fragment key={r.attemptId}>
							<TableRow selected={selected.has(r.attemptId)}>
								<TableCell>
									{!r.released && (
										<Checkbox
											checked={selected.has(r.attemptId)}
											onCheckedChange={() =>
												setSelected((prev) => {
													const next = new Set(prev);
													if (next.has(r.attemptId)) next.delete(r.attemptId);
													else next.add(r.attemptId);
													return next;
												})
											}
											aria-label={`Select ${r.studentName}'s result`}
										/>
									)}
								</TableCell>
								<TableCell>
									<span className="font-semibold">{r.studentName}</span>
									{r.answers && (
										<button
											type="button"
											onClick={() => setExpanded(expanded === r.attemptId ? null : r.attemptId)}
											aria-expanded={expanded === r.attemptId}
											className="block cursor-pointer text-small font-semibold text-brand"
										>
											{expanded === r.attemptId ? "Hide the answers" : `Re-mark ${r.answers.length} answers`}
										</button>
									)}
								</TableCell>
								<TableCell className="text-right font-mono">
									{r.rawScore === null ? <span className="text-ink-3">—</span> : `${r.rawScore} / 40`}
								</TableCell>
								<TableCell className="text-right font-mono font-medium">{r.bandLabel}</TableCell>
								<TableCell className="text-small text-ink-2">{r.timeTakenLabel}</TableCell>
								<TableCell>
									{r.flags.length === 0 ? (
										<span className="text-ink-3">—</span>
									) : (
										// Shown to a human, never acted on automatically.
										<span className="flex flex-col gap-0.5 text-small font-semibold text-warning">
											{r.flags.map((f) => (
												<span key={f}>! {f}</span>
											))}
										</span>
									)}
								</TableCell>
								<TableCell>
									{r.released ? (
										<StatusPill status="submitted" size="sm" label="Released" />
									) : r.stateLabel === "Expired" ? (
										<StatusPill status="expired" size="sm" label="Ran out of time" />
									) : (
										<StatusPill status="not_started" size="sm" label="Held" />
									)}
								</TableCell>
							</TableRow>
							{expanded === r.attemptId && r.answers && (
								<TableRow>
									<TableCell colSpan={7} className="p-0">
										<OverrideRows answers={r.answers} />
									</TableCell>
								</TableRow>
							)}
						</Fragment>
					))}
				</TableBody>
			</Table>

			{selected.size > 0 && (
				<TableBulkActions>
					<span className="font-semibold text-white">
						{selected.size} {selected.size === 1 ? "result" : "results"} selected
					</span>
					<Button variant="inverse" onClick={() => setConfirming(true)}>
						Release results
					</Button>
				</TableBulkActions>
			)}

			<ConfirmDialog
				open={confirming}
				onOpenChange={setConfirming}
				title={`Release ${selected.size} ${selected.size === 1 ? "result" : "results"}?`}
				description="Those students will see their band and their mistakes straight away. You can't un-release a result."
				confirmLabel="Release them"
				cancelLabel="Not yet"
				onConfirm={() => setConfirming(false)}
			/>
		</TableCard>
	);
}

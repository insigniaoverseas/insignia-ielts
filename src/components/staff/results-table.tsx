"use client";

import { Fragment, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import {
	Table,
	TableBody,
	TableCard,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	TableToolbar,
} from "@/components/ui/table";
import { giveMarkAction } from "@/lib/actions/marks";
import type { AssignmentResults, OverridableAnswer } from "@/lib/view-models/teacher";

/**
 * The expanded row: re-mark one answer by hand (M6-05).
 *
 * Every override takes a note, and the note is required rather than optional.
 * The next person to look at this attempt — a teacher fielding a complaint, or
 * an admin auditing a band — needs to know *why* a mark was changed by hand,
 * and "I'll remember" is not true a month later.
 */
function OverrideRows({
	answers,
	attemptId,
	assignmentId,
}: {
	answers: OverridableAnswer[];
	attemptId: string;
	assignmentId: string;
}) {
	const [notes, setNotes] = useState<Record<number, string>>({});
	const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
	const [busy, setBusy] = useState<number | null>(null);
	const [, startTransition] = useTransition();

	function give(questionNumber: number) {
		setBusy(questionNumber);
		startTransition(async () => {
			const result = await giveMarkAction({ attemptId, assignmentId, qNumber: questionNumber, note: notes[questionNumber] ?? "" });
			setBusy(null);
			setMessage(result ? { ok: result.ok, text: result.message } : null);
		});
	}

	return (
		<div className="flex flex-col gap-3 border-l-2 border-brand bg-bg px-5 py-4">
			<p className="m-0 text-small font-semibold">
				Answers marked wrong. Give a mark back only if the student was right.
			</p>
			{message && (
				<p className={`m-0 text-small font-semibold ${message.ok ? "text-success" : "text-danger"}`} role="status">
					{message.text}
				</p>
			)}
			{answers.map((a) => (
				<div key={a.questionNumber} className="flex flex-wrap items-center gap-3">
					<span className="w-8 flex-none font-mono text-ink-2">{a.questionNumber}</span>
					<span className="flex min-w-[220px] flex-1 flex-wrap items-center gap-x-4 gap-y-1">
						<span className={a.overridden ? "text-success" : "text-danger"}>
							<span aria-hidden="true">{a.overridden ? "✓" : "✕"}</span> They wrote{" "}
							<strong className="font-semibold">{a.givenAnswer ?? "nothing"}</strong>
						</span>
						<span className="text-success">
							<span aria-hidden="true">✓</span> Key says{" "}
							<strong className="font-semibold">{a.correctAnswer}</strong>
						</span>
					</span>
					{a.overridden ? (
						<span className="min-w-[200px] flex-1 text-small text-ink-2">
							Mark given by hand — <em>{a.overrideNote}</em>
						</span>
					) : (
						<>
							<Input
								size="admin"
								className="min-w-[200px] flex-1"
								value={notes[a.questionNumber] ?? ""}
								onChange={(e) => setNotes((n) => ({ ...n, [a.questionNumber]: e.target.value }))}
								placeholder="Why you're changing this"
								aria-label={`Why question ${a.questionNumber} is being re-marked`}
							/>
							<Button
								variant="secondary"
								disabled={!(notes[a.questionNumber] ?? "").trim() || (busy !== null && busy !== a.questionNumber)}
								loading={busy === a.questionNumber}
								onClick={() => give(a.questionNumber)}
							>
								{busy === a.questionNumber ? "Saving…" : "Give the mark"}
							</Button>
						</>
					)}
				</div>
			))}
		</div>
	);
}

/**
 * Screen 18 — Results (M6-04). Releasing them is `ReleasePanel`, above this
 * table: the database's release gate is per assignment, so it is one action
 * for everyone rather than a per-row choice the gate could not honour.
 *
 * Flags are shown but never act on their own (`MVP-1.md` M9-01: flags, not
 * blocks). "Left the tab 11 times" might be cheating or might be a browser
 * notification — the teacher is the one who knows which.
 */
export function ResultsTable({ data }: { data: AssignmentResults }) {
	const [expanded, setExpanded] = useState<string | null>(null);

	return (
		<TableCard>
			<TableToolbar>
				<div className="flex flex-col gap-1">
					<span className="text-small text-ink-2">
						{data.rows.length} submitted · {data.notStarted} never started
					</span>
				</div>
			</TableToolbar>

			<Table>
				<TableHeader sticky>
					<TableRow>
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
							<TableRow>
								<TableCell>
									<span className="font-semibold">{r.studentName}</span>
									{r.answers && r.answers.length > 0 && (
										<button
											type="button"
											onClick={() => setExpanded(expanded === r.attemptId ? null : r.attemptId)}
											aria-expanded={expanded === r.attemptId}
											className="block cursor-pointer text-small font-semibold text-brand"
										>
											{expanded === r.attemptId
												? "Hide the answers"
												: `Re-mark ${r.answers.filter((x) => !x.overridden).length} answers`}
										</button>
									)}
								</TableCell>
								<TableCell className="text-right font-mono">
									{r.rawScore === null ? <span className="text-ink-3">—</span> : `${r.rawScore} / ${data.maxScore}`}
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
									{/* "Ran out of time" is already in the Time column. */}
									{r.released ? (
										<StatusPill status="submitted" size="sm" label="Released" />
									) : (
										<StatusPill status="not_started" size="sm" label="Held" />
									)}
								</TableCell>
							</TableRow>
							{expanded === r.attemptId && r.answers && r.answers.length > 0 && (
								<TableRow>
									<TableCell colSpan={6} className="p-0">
										<OverrideRows answers={r.answers} attemptId={r.attemptId} assignmentId={data.assignmentId} />
									</TableCell>
								</TableRow>
							)}
						</Fragment>
					))}
				</TableBody>
			</Table>
		</TableCard>
	);
}

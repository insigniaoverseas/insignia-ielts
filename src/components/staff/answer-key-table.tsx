"use client";

import { useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
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
import type { AnswerKeyRow } from "@/lib/view-models/admin";

/**
 * Screen 27 — the answer key editor's table (M5-09).
 *
 * **Optimised for speed, not beauty.** This screen is used for forty rows per
 * test, many times a week, by someone copying from a book. So:
 *
 * - Enter moves to the next answer field, which is how a numeric keypad user
 *   expects a form to behave. Tab does the same but also visits the variants.
 * - Accepted variants are a comma-separated text field, not chips with an add
 *   button — typing `20, twenty` is two keystrokes more than the answer itself,
 *   whereas chips cost a mouse trip per variant.
 * - Progress is always on screen, because "did I finish?" is the question that
 *   sends people back through all forty rows.
 *
 * ⚠️ This is the only screen in the product that holds correct answers in a
 * browser, and only for staff who can publish tests. It must never share a
 * component or a view-model with anything a student can reach.
 */
export function AnswerKeyTable({ initialRows }: { initialRows: AnswerKeyRow[] }) {
	const [rows, setRows] = useState(initialRows);
	const answerRefs = useRef<(HTMLInputElement | null)[]>([]);

	const entered = useMemo(() => rows.filter((r) => r.answer.trim() !== "").length, [rows]);
	const pct = rows.length === 0 ? 0 : Math.round((entered / rows.length) * 100);

	function setRow(i: number, patch: Partial<AnswerKeyRow>) {
		setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
	}

	return (
		<TableCard>
			<TableToolbar>
				<div className="flex min-w-[240px] flex-1 flex-col gap-2">
					<span className="font-semibold">
						{entered} of {rows.length} keys entered
					</span>
					<div
						className="h-2 overflow-hidden rounded-full bg-bg"
						role="progressbar"
						aria-label="Answer keys entered"
						aria-valuenow={entered}
						aria-valuemin={0}
						aria-valuemax={rows.length}
					>
						<div
							className={`h-full rounded-full ${pct === 100 ? "bg-success" : "bg-brand"}`}
							style={{ width: `${pct}%` }}
						/>
					</div>
				</div>
				{/* Said once, here — a placeholder repeated down forty rows is noise. */}
				<span className="max-w-[34ch] text-small text-ink-2">
					Press <kbd className="rounded border border-line bg-bg px-1.5 font-mono">Enter</kbd> to drop to the
					next answer. Separate other accepted spellings with commas — <em>20, twenty</em>.
				</span>
			</TableToolbar>

			<Table>
				<TableHeader sticky>
					<TableRow>
						<TableHead className="w-16 text-right">#</TableHead>
						<TableHead className="w-[180px]">Type</TableHead>
						<TableHead>Correct answer</TableHead>
						<TableHead>Also accept</TableHead>
						<TableHead className="w-20 text-right">Marks</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{rows.map((row, i) => {
						const missing = row.answer.trim() === "";
						return (
							<TableRow key={row.number}>
								<TableCell className="text-right font-mono text-ink-2">{row.number}</TableCell>
								<TableCell className="text-small text-ink-2">{row.questionTypeLabel}</TableCell>
								<TableCell>
									<Input
										size="admin"
										ref={(el) => {
											answerRefs.current[i] = el;
										}}
										value={row.answer}
										aria-label={`Correct answer for question ${row.number}`}
										aria-invalid={missing || undefined}
										onChange={(e) => setRow(i, { answer: e.target.value })}
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												answerRefs.current[i + 1]?.focus();
											}
										}}
										autoComplete="off"
										spellCheck={false}
									/>
								</TableCell>
								<TableCell>
									<Input
										size="admin"
										value={row.acceptedVariants.join(", ")}
										aria-label={`Other accepted answers for question ${row.number}`}
										onChange={(e) =>
											setRow(i, {
												acceptedVariants: e.target.value
													.split(",")
													.map((v) => v.trim())
													.filter(Boolean),
											})
										}
										autoComplete="off"
										spellCheck={false}
									/>
								</TableCell>
								<TableCell className="text-right font-mono text-ink-2">{row.marks}</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</TableCard>
	);
}

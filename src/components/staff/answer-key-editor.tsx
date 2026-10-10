"use client";

import { useMemo, useRef, useState, useTransition } from "react";

import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCard, TableCell, TableHead, TableHeader, TableRow, TableToolbar } from "@/components/ui/table";
import { saveAnswerKeyAction } from "@/lib/actions/answer-key";
import type { AnswerKeyRow } from "@/lib/queries/answer-key";

const split = (text: string) => text.split(",").map((v) => v.trim()).filter(Boolean);
const join = (values: readonly string[]) => values.join(", ");

/**
 * Screen 27 — the answer key, editable (M5-09).
 *
 * ⚠️ **The only screen that carries correct answers to a browser**, and only
 * for `test:author`, behind the proxy, the admin layout and RLS. Nothing here
 * may be reused by anything a student can reach.
 *
 * Built for someone copying from a book: Enter drops to the next answer,
 * alternatives are comma-separated text (`20, twenty`), and changed rows are
 * marked so a save never surprises. Saving asks first, because it re-marks
 * every finished attempt on this test — teacher-given marks are kept.
 */
export function AnswerKeyEditor({
	testId,
	rows,
	part,
}: {
	testId: string;
	rows: AnswerKeyRow[];
	part: "Section" | "Passage";
}) {
	const original = useMemo(() => new Map(rows.map((r) => [r.n, { answer: join(r.answer), also: join(r.acceptedVariants) }])), [rows]);
	const [values, setValues] = useState(() => new Map(original));
	const [confirming, setConfirming] = useState(false);
	const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
	const [pending, startTransition] = useTransition();
	const answerRefs = useRef<(HTMLInputElement | null)[]>([]);

	const changed = rows.filter((r) => {
		const now = values.get(r.n)!;
		const was = original.get(r.n)!;
		return now.answer.trim() !== was.answer.trim() || now.also.trim() !== was.also.trim();
	});
	const empty = rows.filter((r) => split(values.get(r.n)!.answer).length === 0);

	function set(n: number, field: "answer" | "also", text: string) {
		setValues((prev) => new Map(prev).set(n, { ...prev.get(n)!, [field]: text }));
		setMessage(null);
	}

	function save() {
		startTransition(async () => {
			const result = await saveAnswerKeyAction(
				testId,
				changed.map((r) => ({ n: r.n, answer: split(values.get(r.n)!.answer), acceptedVariants: split(values.get(r.n)!.also) })),
			);
			setConfirming(false);
			setMessage(result ? { ok: result.ok, text: result.message } : null);
		});
	}

	return (
		<div className="flex flex-col gap-4">
			{message && <Banner tone={message.ok ? "info" : "warning"}>{message.text}</Banner>}

			<TableCard>
				<TableToolbar>
					<span className="text-small text-ink-2">
						Press <kbd className="rounded border border-line bg-bg px-1.5 font-mono">Enter</kbd> for the next answer.
						Separate other accepted answers with commas — <em>20, twenty</em>.
					</span>
					<Button disabled={changed.length === 0 || empty.length > 0 || pending} onClick={() => setConfirming(true)}>
						{changed.length === 0 ? "No changes" : `Save ${changed.length} ${changed.length === 1 ? "change" : "changes"}`}
					</Button>
				</TableToolbar>
				<Table>
					<TableHeader sticky>
						<TableRow>
							<TableHead className="w-16">Q</TableHead>
							<TableHead>Question</TableHead>
							<TableHead className="w-[260px]">Answer</TableHead>
							<TableHead className="w-[260px]">Also accepted</TableHead>
							<TableHead className="text-right">Marks</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map((row, i) => {
							const value = values.get(row.n)!;
							const isChanged = changed.includes(row);
							return (
								<TableRow key={row.n} className={isChanged ? "bg-brand-soft" : undefined}>
									<TableCell className="font-mono font-semibold">{row.label}</TableCell>
									<TableCell>
										<div>{row.prompt}</div>
										<div className="text-small text-ink-2">
											{part} {row.section} · {row.typeName}
											{row.wordLimit !== null && ` · max ${row.wordLimit} ${row.wordLimit === 1 ? "word" : "words"}`}
										</div>
										{row.options && (
											<div className="text-small text-ink-2">Choices: {row.options.join(" · ")}</div>
										)}
									</TableCell>
									<TableCell>
										<Input
											size="admin"
											ref={(el) => {
												answerRefs.current[i] = el;
											}}
											value={value.answer}
											onChange={(e) => set(row.n, "answer", e.target.value)}
											onKeyDown={(e) => {
												if (e.key === "Enter") {
													e.preventDefault();
													answerRefs.current[i + 1]?.focus();
												}
											}}
											aria-label={`Answer for question ${row.label}`}
											aria-invalid={split(value.answer).length === 0 || undefined}
										/>
									</TableCell>
									<TableCell>
										{/* A choice is right or wrong — the key rejects spellings for one. */}
										{!row.textEntry ? (
											<span className="text-small text-ink-3">Not for choice questions</span>
										) : (
											<Input
												size="admin"
												value={value.also}
												onChange={(e) => set(row.n, "also", e.target.value)}
												aria-label={`Also accepted for question ${row.label}`}
											/>
										)}
									</TableCell>
									<TableCell className="text-right font-mono">{row.marks}</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</TableCard>

			{empty.length > 0 && (
				<p className="m-0 font-semibold text-danger" role="alert">
					Every question needs an answer — {empty.map((r) => r.label).join(", ")} {empty.length === 1 ? "is" : "are"} empty.
				</p>
			)}

			<ConfirmDialog
				open={confirming}
				onOpenChange={setConfirming}
				loading={pending}
				title={`Save ${changed.length} ${changed.length === 1 ? "change" : "changes"} to the answer key?`}
				description="Everyone who has already finished this test is marked again with the new answers, so some scores and bands may change. Marks a teacher gave by hand are kept. Students taking it now are marked with the new answers when they finish."
				confirmLabel="Save and re-mark"
				cancelLabel="Keep editing"
				onConfirm={save}
			/>
		</div>
	);
}

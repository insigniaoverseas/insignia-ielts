"use client";

import { useActionState, useMemo, useState } from "react";
import { assignTestAction } from "@/lib/actions/assignments";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DifficultyBadge } from "@/components/ui/difficulty-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SKILL_LABEL } from "@/components/student/labels";
import type { AssignOptions } from "@/lib/view-models/teacher";

/** One numbered step, so the page reads as a sequence rather than a wall of form. */
function Step({
	n,
	title,
	hint,
	children,
}: {
	n: number;
	title: string;
	hint?: string;
	children: React.ReactNode;
}) {
	return (
		<section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
			<div className="flex items-start gap-3">
				<span
					className="grid size-8 flex-none place-items-center rounded-full bg-brand font-mono font-medium text-white"
					aria-hidden="true"
				>
					{n}
				</span>
				<div className="flex flex-col gap-1">
					<h2 className="m-0 text-h3">{title}</h2>
					{hint && <p className="m-0 text-small text-ink-2">{hint}</p>}
				</div>
			</div>
			{children}
		</section>
	);
}

/**
 * Screen 16 — Assign a test (M6-03).
 *
 * Three steps on one page, not a wizard: a teacher assigning their fourth test
 * of the week knows all three answers before they arrive, and a wizard makes
 * them click through screens they have nothing to change on.
 *
 * The screen's real job is the **summary sentence** before the button. Getting
 * an assignment wrong is expensive — the wrong batch sits a mock they haven't
 * prepared for — and a sentence in English is checkable in a way that five
 * separate fields are not.
 */
export function AssignFlow({ options, initialBatch }: { options: AssignOptions; initialBatch?: string }) {
	const [testIds, setTestIds] = useState<Set<string>>(new Set());
	const [search, setSearch] = useState("");
	const [batchIds, setBatchIds] = useState<Set<string>>(new Set(initialBatch ? [initialBatch] : []));
	const [studentIds, setStudentIds] = useState<Set<string>>(new Set());
	const [opensAt, setOpensAt] = useState("");
	const [dueBy, setDueBy] = useState("");
	const [attempts, setAttempts] = useState(1);
	const [allowReview, setAllowReview] = useState(true);
	// Held by default (Q2, 2026-09-15): a band is the teacher's to hand out.
	const [release, setRelease] = useState<"manual" | "immediate" | "scheduled">("manual");
	const [releaseAt, setReleaseAt] = useState("");

	/** Back to an empty form after a successful assign, so the next one starts clean. */
	function reset() {
		setTestIds(new Set());
		setSearch("");
		setBatchIds(new Set());
		setStudentIds(new Set());
		setOpensAt("");
		setDueBy("");
		setAttempts(1);
		setAllowReview(true);
		setRelease("manual");
		setReleaseAt("");
	}

	// The reset happens here, once the server has said yes — never on a refusal,
	// where the teacher needs their choices to fix and try again.
	const [state, formAction, pending] = useActionState(
		async (previous: Awaited<ReturnType<typeof assignTestAction>>, formData: FormData) => {
			const result = await assignTestAction(previous, formData);
			if (result?.ok) reset();
			return result;
		},
		null,
	);

	const picked = options.tests.filter((t) => testIds.has(t.id));
	const pickedTitles =
		picked.length <= 1
			? (picked[0]?.title ?? "")
			: `these ${picked.length} tests: ${picked.slice(0, -1).map((t) => t.title).join(", ")} and ${picked.at(-1)!.title}`;

	const visibleTests = useMemo(() => {
		const q = search.trim().toLowerCase();
		return q === "" ? options.tests : options.tests.filter((t) => t.title.toLowerCase().includes(q));
	}, [options.tests, search]);

	/**
	 * Students reached. Batch members and individually-picked students can
	 * overlap, so this is a count of *people*, not a sum — "24 + 3" would
	 * overstate it whenever a teacher adds someone already in the batch.
	 */
	const reached = useMemo(() => {
		const fromBatches = options.batches
			.filter((b) => batchIds.has(b.id))
			.reduce((n, b) => n + b.studentCount, 0);
		const extra = options.students.filter(
			(s) => studentIds.has(s.id) && !options.batches.some((b) => batchIds.has(b.id) && b.id === s.batchId),
		).length;
		return fromBatches + extra;
	}, [options, batchIds, studentIds]);

	function toggle(set: Set<string>, id: string, apply: (s: Set<string>) => void) {
		const next = new Set(set);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		apply(next);
	}

	const ready = picked.length > 0 && reached > 0 && (release !== "scheduled" || releaseAt !== "");

	const summary = !ready
		? null
		: `${reached} ${reached === 1 ? "student" : "students"} will take ${pickedTitles}, ${opensAt ? `from ${opensAt}` : "starting as soon as you assign it"}${
				dueBy ? ` until ${dueBy}` : ", with no closing date"
			}. They get ${attempts === 1 ? "one attempt" : `${attempts} attempts`}, and ${
				allowReview ? "can review their mistakes afterwards" : "cannot review their answers afterwards"
			}. ${
				release === "immediate"
					? "They see their band as soon as they finish."
					: release === "scheduled"
						? `They see their band from ${releaseAt.replace("T", " at ")}.`
						: "They see their band when you release the results."
			}`;

	return (
		<form action={formAction} className="flex flex-col gap-6">
			{[...testIds].map((id) => <input key={id} type="hidden" name="tests" value={id} />)}
			{[...batchIds].map((id) => <input key={id} type="hidden" name="batches" value={id} />)}
			{[...studentIds].map((id) => <input key={id} type="hidden" name="students" value={id} />)}
			<Step n={1} title="Pick tests" hint="Tick one or more — each becomes its own assignment with the same students and rules.">
				<Input
					size="admin"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Search tests"
					aria-label="Search tests"
				/>
				<ul className="m-0 flex max-h-[320px] list-none flex-col gap-2 overflow-y-auto p-0">
					{visibleTests.map((t) => {
						const on = testIds.has(t.id);
						return (
							<li key={t.id}>
								<button
									type="button"
									onClick={() => toggle(testIds, t.id, setTestIds)}
									aria-pressed={on}
									className={`flex w-full cursor-pointer flex-wrap items-center gap-3 rounded-control border px-4 py-3 text-left ${
										on ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-ink-3"
									}`}
								>
									<span
										className={`grid size-5 flex-none place-items-center rounded border text-small font-bold ${
											on ? "border-brand bg-brand text-white" : "border-line bg-surface"
										}`}
										aria-hidden="true"
									>
										{on ? "✓" : ""}
									</span>
									<span className="min-w-[200px] flex-1 font-semibold">{t.title}</span>
									<span className="text-small text-ink-2">{SKILL_LABEL[t.skill]}</span>
									<DifficultyBadge level={t.difficulty} />
									<span className="font-mono text-small text-ink-2">
										{t.questionCount}q · {t.durationMinutes}m
									</span>
								</button>
							</li>
						);
					})}
				</ul>
				<p className="m-0 font-semibold" aria-live="polite">
					{picked.length === 0 ? "No test picked yet." : `${picked.length} ${picked.length === 1 ? "test" : "tests"} picked`}
				</p>
			</Step>

			<Step n={2} title="Pick who takes it" hint="Whole batches, plus anyone else you name.">
				<div className="flex flex-wrap gap-2">
					{options.batches.map((b) => {
						const on = batchIds.has(b.id);
						return (
							<button
								key={b.id}
								type="button"
								onClick={() => toggle(batchIds, b.id, setBatchIds)}
								aria-pressed={on}
								className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-4 font-semibold ${
									on ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-ink-2 hover:text-ink"
								}`}
							>
								{b.name}
								<span className="font-mono text-small">{b.studentCount}</span>
							</button>
						);
					})}
				</div>

				<details className="rounded-control border border-line bg-bg px-4 py-3">
					<summary className="cursor-pointer font-semibold text-brand">Add individual students</summary>
					<ul className="m-0 mt-3 flex max-h-[220px] list-none flex-col gap-1 overflow-y-auto p-0">
						{options.students.map((s) => (
							<li key={s.id}>
								<label className="flex min-h-10 cursor-pointer items-center gap-3">
									<Checkbox
										checked={studentIds.has(s.id)}
										onCheckedChange={() => toggle(studentIds, s.id, setStudentIds)}
									/>
									<span>{s.name}</span>
									<span className="text-small text-ink-2">{s.batchName ?? "No batch"}</span>
								</label>
							</li>
						))}
					</ul>
				</details>

				<p className="m-0 font-semibold" aria-live="polite">
					{reached === 0 ? "Nobody selected yet." : `${reached} ${reached === 1 ? "student" : "students"} selected`}
				</p>
			</Step>

			<Step n={3} title="Set the rules" hint="The test type is set when the paper is created.">

				<div className="flex flex-wrap gap-4">
					<div className="flex min-w-[180px] flex-1 flex-col gap-1.5">
						<Label htmlFor="opensAt">Available from</Label>
						<Input
							id="opensAt"
							name="opensAt"
							type="datetime-local"
							size="admin"
							value={opensAt}
							onChange={(e) => setOpensAt(e.target.value)}
						/>
					</div>
					<div className="flex min-w-[180px] flex-1 flex-col gap-1.5">
						<Label htmlFor="dueBy">Due by</Label>
						<Input
							id="dueBy"
							name="dueBy"
							type="datetime-local"
							size="admin"
							value={dueBy}
							onChange={(e) => setDueBy(e.target.value)}
						/>
					</div>
					<div className="flex min-w-[120px] flex-col gap-1.5">
						<Label htmlFor="attempts">Attempts</Label>
						<Input
							id="attempts"
							name="attempts"
							type="number"
							min={1}
							max={9}
							size="admin"
							value={attempts}
							onChange={(e) => setAttempts(Math.max(1, Number(e.target.value) || 1))}
						/>
					</div>
				</div>

				<fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
					<legend className="mb-1 font-semibold">When do students see their band?</legend>
					<input type="hidden" name="release" value={release} />
					{(
						[
							["manual", "When I release them", "You press Release on the results page."],
							["immediate", "As soon as they finish", "Good for practice-style class tests."],
							["scheduled", "On a date I choose", "Everyone's results come out together."],
						] as const
					).map(([value, label, hint]) => (
						<label key={value} className="flex min-h-touch cursor-pointer items-start gap-3">
							<input
								type="radio"
								name="releaseChoice"
								value={value}
								checked={release === value}
								onChange={() => setRelease(value)}
								className="mt-1 size-5 flex-none cursor-pointer accent-brand"
							/>
							<span className="flex flex-col">
								<span className="font-semibold">{label}</span>
								<span className="text-small text-ink-2">{hint}</span>
							</span>
						</label>
					))}
					{release === "scheduled" && (
						<div className="flex max-w-[260px] flex-col gap-1.5 pl-8">
							<Label htmlFor="releaseAt">Results come out at</Label>
							<Input
								id="releaseAt"
								name="releaseAt"
								type="datetime-local"
								size="admin"
								value={releaseAt}
								onChange={(e) => setReleaseAt(e.target.value)}
							/>
						</div>
					)}
				</fieldset>
				<label className="flex min-h-touch cursor-pointer items-center gap-3">
					<Checkbox checked={allowReview} onCheckedChange={(v) => setAllowReview(v === true)} />
					<input type="hidden" name="allowReview" value={allowReview ? "on" : ""} />
					<span>Let them see their mistakes after the result is released</span>
				</label>
			</Step>

			{/* The checkable sentence. Nothing is assigned until this reads right. */}
			<section className="flex flex-col gap-4 rounded-card border border-brand-line bg-brand-soft p-6">
				<h2 className="m-0 text-h3">Check this before you assign</h2>
				<p className="m-0 text-passage">
					{summary ?? "Pick a test and at least one student, and this will say exactly what happens."}
				</p>
				<div>
					<Button type="submit" disabled={!ready || pending}>{pending ? "Assigning…" : "Assign"}</Button>
				</div>
				{state && <p className={state.ok ? "m-0 text-small text-success" : "m-0 text-small text-danger"} role="status">{state.message}</p>}
			</section>
		</form>
	);
}

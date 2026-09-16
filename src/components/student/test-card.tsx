import Link from "next/link";
import { DifficultyBadge } from "@/components/ui/difficulty-badge";
import { StatusPill } from "@/components/ui/status-pill";
import { formatBand } from "@/components/ui/band-score";
import { MODE_LABEL, SKILL_LABEL } from "@/components/student/labels";
import type { AssignedTest, CompletedAttempt } from "@/lib/view-models/student";

/*
 * The row cards on My Tests (04) and Practice at home (12).
 *
 * The rule these encode: a card a student cannot act on is dimmed but still
 * fully readable, and it always prints the reason underneath the dead button.
 * "Locked" on its own is not an acceptable state (`DESIGN-PROMPT.md` C1.4).
 */

/** The chip row every card starts with: skill, mode, difficulty. */
function Chips({ test, mode }: { test: AssignedTest["test"]; mode: AssignedTest["mode"] }) {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<span className="rounded-full bg-brand-soft px-3 py-1 text-small font-semibold text-brand">
				{SKILL_LABEL[test.skill]}
			</span>
			<span className="rounded-full border border-line bg-bg px-3 py-1 text-small font-semibold text-ink-2">
				{MODE_LABEL[mode]}
			</span>
			<DifficultyBadge level={test.difficulty} />
		</div>
	);
}

/** The 56px action column, right on desktop and full-width below the text on a phone. */
function Action({ children }: { children: React.ReactNode }) {
	return <div className="flex w-full flex-col gap-2 md:w-[220px]">{children}</div>;
}

/**
 * One assigned or practice test.
 *
 * @param extraDetail An optional extra line, e.g. "You've done this 2 times".
 */
export function AssignedTestCard({ item, extraDetail }: { item: AssignedTest; extraDetail?: string }) {
	const { test, mode, locked, windowLabel, attemptsUsed, attemptsAllowed, resumeAttemptId } = item;
	const meta = [
		`${test.questionCount} questions`,
		`${test.durationMinutes} minutes`,
		// Only worth saying once an attempt has actually been spent — "0 of 1
		// attempts used" is noise on a test nobody has opened yet.
		mode !== "practice" && attemptsAllowed < 90 && attemptsUsed > 0
			? `${attemptsUsed} of ${attemptsAllowed} attempts used`
			: null,
	]
		.filter(Boolean)
		.join(" · ");

	return (
		<article
			className={`flex flex-wrap items-center gap-6 rounded-card border border-line bg-surface p-6 ${
				locked ? "opacity-70" : ""
			}`}
		>
			<div className="flex min-w-[260px] flex-1 flex-col gap-3">
				<div className="flex flex-wrap items-center gap-2">
					<Chips test={test} mode={mode} />
					{resumeAttemptId ? (
						<StatusPill status="in_progress" size="sm" />
					) : locked ? (
						<StatusPill status="locked" size="sm" />
					) : (
						<StatusPill status="not_started" size="sm" />
					)}
				</div>
				<h2 className="m-0 text-h2">{test.title}</h2>
				<span className="text-ink-2">
					{meta}
					{windowLabel && !locked ? ` · ${windowLabel}` : ""}
					{extraDetail ? ` · ${extraDetail}` : ""}
				</span>
			</div>

			<Action>
				{locked ? (
					<>
						<div
							aria-disabled="true"
							className="flex h-primary items-center justify-center rounded-control border border-line bg-bg text-h3 font-semibold text-ink-3"
						>
							Start Test
						</div>
						{/* The whole point of the locked branch. */}
						<span className="text-ink-2">{locked.message}</span>
					</>
				) : (
					<Link
						href={`/tests/${item.assignmentId}/start`}
						className="flex h-primary items-center justify-center gap-2.5 rounded-control bg-brand text-h3 font-semibold text-white no-underline hover:bg-brand-hover hover:no-underline"
					>
						{resumeAttemptId ? "Carry on" : "Start Test"}
						<span aria-hidden="true">→</span>
					</Link>
				)}
			</Action>
		</article>
	);
}

/** One finished attempt in the "Done" tab. */
export function CompletedAttemptCard({ item }: { item: CompletedAttempt }) {
	const { test, mode, result, submittedAtLabel } = item;
	return (
		<article className="flex flex-wrap items-center gap-6 rounded-card border border-line bg-surface p-6">
			<div className="flex min-w-[260px] flex-1 flex-col gap-3">
				<div className="flex flex-wrap items-center gap-2">
					<Chips test={test} mode={mode} />
					<StatusPill status="submitted" size="sm" />
				</div>
				<h2 className="m-0 text-h2">{test.title}</h2>
				<span className="text-ink-2">
					Finished on {submittedAtLabel}
					{result
						? ` · Band ${result.band === null ? result.belowBand : formatBand(result.band)} · ${
								result.rawScore
							} out of ${result.maxScore}`
						: ""}
				</span>
			</div>

			<Action>
				{result ? (
					<Link
						href={`/results/${item.attemptId}`}
						className="flex h-primary items-center justify-center rounded-control border border-line bg-surface text-h3 font-semibold text-ink no-underline hover:border-ink-3 hover:no-underline"
					>
						See my result
					</Link>
				) : (
					<>
						<div
							aria-disabled="true"
							className="flex h-primary items-center justify-center rounded-control border border-line bg-bg text-h3 font-semibold text-ink-3"
						>
							See my result
						</div>
						<span className="text-ink-2">
							Your teacher will release this. You&rsquo;ll see it here when they do.
						</span>
					</>
				)}
			</Action>
		</article>
	);
}

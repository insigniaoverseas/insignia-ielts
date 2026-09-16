import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BandScore } from "@/components/ui/band-score";
import { EmptyState } from "@/components/ui/empty-state";
import { MODE_LABEL, SKILL_LABEL } from "@/components/student/labels";
import { getAttemptResult } from "@/lib/mock/student";

export const metadata: Metadata = { title: "Your result" };

/** One section's score as a labelled bar. Never colour alone — the numbers are right there. */
function SectionBar({ label, correct, total }: { label: string; correct: number; total: number }) {
	const pct = total === 0 ? 0 : Math.round((correct / total) * 100);
	return (
		<li className="flex flex-col gap-1">
			<div className="flex justify-between gap-4">
				<span>{label}</span>
				<span className="font-mono font-medium">
					{correct} / {total}
				</span>
			</div>
			<div
				className="h-3 overflow-hidden rounded-full bg-bg"
				role="progressbar"
				aria-label={`${label}: ${correct} out of ${total}`}
				aria-valuenow={correct}
				aria-valuemin={0}
				aria-valuemax={total}
			>
				<div
					className={`h-full rounded-full ${pct < 50 ? "bg-danger" : pct < 70 ? "bg-warning" : "bg-success"}`}
					style={{ width: `${pct}%` }}
				/>
			</div>
		</li>
	);
}

/**
 * Screen 09 — Result (M2-18).
 *
 * The band is the hero and everything else is support. Two clear actions and
 * no third: "See my mistakes" (the reason the screen exists) and "Back to
 * home".
 *
 * Two states worth naming:
 * - **Held.** The teacher has not released the result. The student sees a
 *   sentence explaining that, never a number and never an empty score card.
 * - **Below the scale.** The institute's charts stop at a floor, so `band` is
 *   `null` and `belowBand` carries the marker ("Below 4"). Rendering that
 *   through `BandScore` would mean inventing a number, so it gets its own card.
 */
export default async function ResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
	const { attemptId } = await params;
	const attempt = await getAttemptResult(attemptId);
	if (!attempt) notFound();

	const { test, mode, result, submittedAtLabel } = attempt;

	if (!result) {
		return (
			<div className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
				<h1 className="m-0 text-[1.75rem] leading-9 font-bold md:text-h1">{test.title}</h1>
				<EmptyState
					icon="⏳"
					title="Your teacher will release this result"
					action={
						<Link
							href="/home"
							className="flex h-primary items-center justify-center rounded-control bg-brand px-8 text-h3 font-semibold text-white no-underline hover:bg-brand-hover hover:no-underline"
						>
							Back to Home
						</Link>
					}
				>
					You finished this on {submittedAtLabel}. Your answers are saved — you&rsquo;ll see your band here as
					soon as it&rsquo;s released.
				</EmptyState>
			</div>
		);
	}

	return (
		<div className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
			<div className="flex flex-col gap-2">
				<span className="text-ink-2">
					{SKILL_LABEL[test.skill]} · {MODE_LABEL[mode]} · {submittedAtLabel}
				</span>
				<h1 className="m-0 text-[1.75rem] leading-9 font-bold md:text-h1">{test.title}</h1>
			</div>

			{result.band !== null ? (
				<BandScore band={result.band} descriptor={result.descriptor} />
			) : (
				<div className="flex flex-col items-center gap-2 rounded-card bg-brand-soft px-6 py-8 text-center">
					<span className="font-semibold text-brand">Your band score</span>
					<span className="text-display font-bold">{result.belowBand}</span>
					<span className="text-h2">{result.descriptor}</span>
					<p className="m-0 max-w-[40ch] text-ink-2">
						Keep going — the next band is closer than it looks. Start with your mistakes below.
					</p>
				</div>
			)}

			<section className="flex flex-wrap gap-8 rounded-card border border-line bg-surface p-6">
				<div className="flex flex-col gap-0.5">
					<span className="font-mono text-h1 font-medium">
						{result.rawScore} / {result.maxScore}
					</span>
					<span className="text-small text-ink-2">correct answers</span>
				</div>
				<div className="flex flex-col gap-0.5">
					<span className="font-mono text-h1 font-medium">{result.timeTakenLabel}</span>
					<span className="text-small text-ink-2">time taken</span>
				</div>
				<div className="flex flex-col gap-0.5">
					<span className="font-mono text-h1 font-medium">{result.wrongCount}</span>
					<span className="text-small text-ink-2">to look at</span>
				</div>
			</section>

			<section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
				<h2 className="m-0 text-h3">How you did in each part</h2>
				<ul className="m-0 flex list-none flex-col gap-3 p-0">
					{result.sections.map((s) => (
						<SectionBar key={s.number} label={s.label} correct={s.correct} total={s.total} />
					))}
				</ul>
			</section>

			<div className="flex flex-col gap-3">
				<Link
					href={`/review/${attempt.attemptId}`}
					className="flex h-primary items-center justify-center gap-2.5 rounded-control bg-brand text-h3 font-semibold text-white no-underline hover:bg-brand-hover hover:no-underline"
				>
					See my mistakes
					<span aria-hidden="true">→</span>
				</Link>
				<Link
					href="/home"
					className="flex h-primary items-center justify-center rounded-control border border-line bg-surface text-h3 font-semibold text-ink no-underline hover:border-ink-3 hover:no-underline"
				>
					Back to Home
				</Link>
			</div>
		</div>
	);
}

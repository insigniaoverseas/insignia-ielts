import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccuracyBars } from "@/components/ui/accuracy-bars";
import { formatBand } from "@/components/ui/band-score";
import { requirePermissionOrRedirect } from "@/lib/auth/guard";
import { getClassAnalytics } from "@/lib/queries/teacher";

export const metadata: Metadata = { title: "What to teach" };

/**
 * Screen 19 — Class analytics (M6-06).
 *
 * Titled "What to teach", not "Analytics", because that is the only question
 * it answers. Three blocks, in the order a lesson gets planned: where the
 * class sits, which skills are weakest, and which individual questions caught
 * most of them out.
 */
export default async function AnalyticsPage({ params }: { params: Promise<{ batchId: string }> }) {
	const { batchId } = await params;
	await requirePermissionOrRedirect("assignment:manage", `/teacher/batches/${batchId}/analytics`);
	const data = await getClassAnalytics(batchId);
	if (!data) notFound();

	const maxCount = Math.max(...data.bandDistribution.map((b) => b.count), 1);

	return (
		<div className="flex flex-col gap-6">
			<Link href={`/teacher/batches/${batchId}`} className="font-semibold">
				← Back to the roster
			</Link>

			<div className="flex flex-col gap-1">
				<h1 className="m-0 text-h1">What to teach</h1>
				<p className="m-0 text-ink-2">
					{data.batchName} · {data.studentCount} students · average band{" "}
					<strong className="font-mono font-medium text-ink">
						{data.averageBand === null ? "—" : formatBand(data.averageBand)}
					</strong>
				</p>
			</div>

			<section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
				<h2 className="m-0 text-h3">Where the class sits</h2>
				{/* A column per half-band. Counts are printed, so the bars don't
				    have to be read precisely. */}
				<div className="flex items-end gap-2 sm:gap-4">
					{data.bandDistribution.map((b) => (
						<div key={b.band} className="flex flex-1 flex-col items-center gap-2">
							<span className="font-mono text-small font-medium">{b.count}</span>
							<div
								className="w-full rounded-t-control bg-brand"
								style={{ height: `${Math.max(6, (b.count / maxCount) * 140)}px` }}
								role="img"
								aria-label={`Band ${formatBand(b.band)}: ${b.count} ${b.count === 1 ? "student" : "students"}`}
							/>
							<span className="font-mono text-small text-ink-2">{formatBand(b.band)}</span>
						</div>
					))}
				</div>
			</section>

			<section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
				<div className="flex flex-col gap-1">
					<h2 className="m-0 text-h3">Weakest question types</h2>
					<p className="m-0 text-small text-ink-2">Across the whole batch. Worst first.</p>
				</div>
				<AccuracyBars items={data.weakestTypes.map((t) => ({ label: t.label, percent: t.percent }))} />
				{data.weakestTypes[0] && (
					<p className="m-0 rounded-card bg-brand-soft px-5 py-4">
						Start with <strong className="font-semibold">{data.weakestTypes[0].label}</strong> — the batch is
						getting {data.weakestTypes[0].percent}% of them right across{" "}
						{data.weakestTypes[0].attempted} attempts.
					</p>
				)}
			</section>

			<section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
				<div className="flex flex-col gap-1">
					<h2 className="m-0 text-h3">Questions most of them missed</h2>
					<p className="m-0 text-small text-ink-2">Worth walking through on the board.</p>
				</div>
				<ul className="m-0 flex list-none flex-col gap-0 p-0">
					{data.mostMissed.map((q) => (
						<li
							key={`${q.testTitle}-${q.questionNumber}`}
							className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line py-3 last:border-b-0"
						>
							<span
								className="grid size-8 flex-none place-items-center rounded-full bg-danger-soft font-mono font-medium text-danger"
								aria-hidden="true"
							>
								{q.questionNumber}
							</span>
							<span className="min-w-[200px] flex-1">{q.testTitle}</span>
							<span className="font-mono text-ink-2">
								{q.wrongCount} of {q.total} got it wrong
							</span>
						</li>
					))}
				</ul>
			</section>
		</div>
	);
}

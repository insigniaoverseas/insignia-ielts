import type { Metadata } from "next";
import Link from "next/link";
import { AccuracyBars } from "@/components/ui/accuracy-bars";
import { BandTrendChart, type BandSeries } from "@/components/ui/band-trend-chart";
import { EmptyState } from "@/components/ui/empty-state";
import { formatBand } from "@/components/ui/band-score";
import { SKILL_LABEL } from "@/components/student/labels";
import { getMyProgress, type Scenario } from "@/lib/mock/student";

export const metadata: Metadata = { title: "My Progress" };

/**
 * Screen 11 — My Progress (M4-03).
 *
 * One screen, no filters and no date pickers: a line per skill, then the
 * "what to practise" bars worst-first, then one sentence of advice. A student
 * should be able to answer "am I getting better, and what do I fix?" without
 * making a single choice (`DESIGN-PROMPT.md` C1.11).
 */
export default async function ProgressPage({
	searchParams,
}: {
	searchParams: Promise<{ state?: string }>;
}) {
	const { state } = await searchParams;
	const data = await getMyProgress((state as Scenario) ?? "default");

	if (data.testsTaken === 0) {
		return (
			<div className="flex flex-col gap-6">
				<h1 className="m-0 text-[1.75rem] leading-9 font-bold md:text-h1">My Progress</h1>
				<EmptyState
					icon="📈"
					title="Nothing to show yet"
					action={
						<Link
							href="/tests"
							className="flex h-primary items-center justify-center rounded-control bg-brand px-8 text-h3 font-semibold text-white no-underline hover:bg-brand-hover hover:no-underline"
						>
							See my tests
						</Link>
					}
				>
					Finish your first test and your band will appear here.
				</EmptyState>
			</div>
		);
	}

	const series: BandSeries[] = data.trend.series.map((s) => ({
		name: SKILL_LABEL[s.skill],
		tone: s.skill === "listening" ? "brand" : "success",
		points: s.bands.map((band, i) => ({ label: data.trend.dateLabels[i] ?? "", band })),
	}));

	return (
		<div className="flex flex-col gap-6">
			<h1 className="m-0 text-[1.75rem] leading-9 font-bold md:text-h1">My Progress</h1>

			<section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
				<h2 className="m-0 text-h3">Your band over time</h2>
				{/* The chart is a 360-unit viewBox scaled to fit; past ~520px its
				    13px type scales up into headline size, so cap it. */}
				<div className="w-full max-w-[520px]">
					<BandTrendChart series={series} title="Band over time" />
				</div>
			</section>

			{/* The teaching half of the screen, and the reason a student opens it. */}
			<section id="mistakes" className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
				<div className="flex flex-col gap-1">
					<h2 className="m-0 text-h3">What to practise</h2>
					<p className="m-0 text-ink-2">Weakest question types first.</p>
				</div>
				<AccuracyBars items={data.accuracyByType.map((a) => ({ label: a.label, percent: a.percent }))} />
				<p className="m-0 rounded-card bg-brand-soft px-5 py-4">{data.advice}</p>
			</section>

			<section className="flex flex-wrap gap-4">
				<div className="flex flex-1 flex-col gap-0.5 rounded-card border border-line bg-surface p-6">
					<span className="font-mono text-display font-medium">{data.testsTaken}</span>
					<span className="text-ink-2">tests taken</span>
				</div>
				<div className="flex flex-1 flex-col gap-0.5 rounded-card border border-line bg-surface p-6">
					<span className="font-mono text-display font-medium">
						{data.averageBand === null ? "—" : formatBand(data.averageBand)}
					</span>
					<span className="text-ink-2">average band</span>
				</div>
			</section>
		</div>
	);
}

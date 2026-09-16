import type { Metadata } from "next";
import { formatBand } from "@/components/ui/band-score";
import { NextUpCard } from "@/components/student/next-up-card";
import { PlanBanner } from "@/components/student/plan-banner";
import { QuickLinks } from "@/components/student/quick-links";
import { SKILL_LABEL } from "@/components/student/labels";
import { getStudentHome } from "@/lib/queries/student";

export const metadata: Metadata = { title: "Home" };

/**
 * Screen 03 — Student Home (M2-02). The most important screen in the product.
 *
 * Its whole job is to answer one question — *what do I do now?* — so it holds
 * exactly one primary action, three quiet shortcuts and one line about the last
 * result. No charts, no stats grid, no feed (`DESIGN-PROMPT.md` C1.3).
 *
 */
export default async function HomePage() {
	const data = await getStudentHome();
	const { student, plan, counts, lastResult, progressHint } = data;

	return (
		<div className="flex flex-col gap-5 md:gap-8">
			<div className="flex flex-wrap items-baseline justify-between gap-4">
				<h1 className="m-0 text-[1.75rem] leading-9 font-bold md:text-display">
					Hi {student.firstName} <span aria-hidden="true">👋</span>
				</h1>
				<span className="hidden text-ink-2 md:inline">{data.todayLabel}</span>
			</div>

			<PlanBanner plan={plan} />

			{/* 1.55fr / 1fr on desktop, per screen 03: the action outweighs the list. */}
			<div className="grid items-stretch gap-5 md:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] md:gap-6">
				<NextUpCard test={data.nextUp} />

				<div className="flex flex-col gap-5 md:gap-6">
					<QuickLinks
						links={[
							{
								href: "/tests",
								icon: "📄",
								label: "My Tests",
								detail: `${counts.testsToDo} to do · ${counts.testsDone} done`,
							},
							{ href: "/progress", icon: "📈", label: "My Progress", detail: progressHint },
							{
								href: "/progress#mistakes",
								icon: "✓",
								label: "My Mistakes",
								detail:
									counts.mistakesToReview > 0
										? `${counts.mistakesToReview} to look at`
										: "Nothing to look at yet",
							},
						]}
					/>

					{lastResult && (
						<div className="flex items-center gap-5 rounded-card border border-line bg-surface p-6">
							<div className="flex flex-col gap-0.5">
								<span className="font-mono text-display font-medium">
									{lastResult.band === null ? lastResult.belowBand : formatBand(lastResult.band)}
								</span>
								<span className="text-small whitespace-nowrap text-ink-2">last band</span>
							</div>
							<div className="w-px self-stretch bg-line" aria-hidden="true" />
							<p className="m-0 text-ink-2">
								Your last test was{" "}
								<strong className="font-semibold text-ink">{SKILL_LABEL[lastResult.skill]}</strong>, on{" "}
								{lastResult.dateLabel}.
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

import { cn } from "@/lib/utils";

export type AccuracyItem = { label: string; percent: number };

/** Colour band for an accuracy percentage. The number is always shown too. */
function barTone(percent: number): string {
	if (percent < 50) return "bg-danger";
	if (percent < 70) return "bg-warning";
	return "bg-success";
}

/**
 * "What to practise" — accuracy by question type as horizontal bars,
 * **worst at the top** (screen 11). Labelled directly, no legend.
 *
 * Plain divs rather than a charting library: this renders on students'
 * phones, and the player bundle budget is ~200 KB gzipped (MVP-1 §4).
 */
export function AccuracyBars({ items, className }: { items: AccuracyItem[]; className?: string }) {
	const sorted = [...items].sort((a, b) => a.percent - b.percent);
	return (
		<ul className={cn("m-0 flex list-none flex-col gap-3 p-0", className)}>
			{sorted.map((item) => {
				const pct = Math.max(0, Math.min(100, Math.round(item.percent)));
				return (
					<li key={item.label} className="flex flex-col gap-1">
						<div className="flex justify-between gap-4">
							<span>{item.label}</span>
							<span className="font-mono font-medium">{pct}%</span>
						</div>
						<div
							className="h-3 rounded-full bg-bg"
							role="progressbar"
							aria-label={`${item.label} accuracy`}
							aria-valuenow={pct}
							aria-valuemin={0}
							aria-valuemax={100}
						>
							<div className={cn("h-full rounded-full", barTone(pct))} style={{ width: `${pct}%` }} />
						</div>
					</li>
				);
			})}
		</ul>
	);
}

"use client";

import { cn } from "@/lib/utils";

export type NavQuestion = { n: number; answered: boolean; flagged: boolean };

function describe(q: NavQuestion, current: boolean): string {
	const parts = [`Question ${q.n}`, q.answered ? "answered" : "not answered"];
	if (q.flagged) parts.push("marked to check later");
	if (current) parts.push("you are here");
	return parts.join(", ");
}

/**
 * Question navigator — the 1–40 grid. Four states, each distinguishable
 * without colour (DESIGN-PROMPT §A5.7):
 *
 * - not answered — white with a border
 * - answered     — filled soft brand
 * - flagged      — a small warning dot in the corner (combines with either)
 * - current      — a 2px brand ring
 *
 * The legend is always visible. Presentational: the parent owns answer and
 * flag state and receives `onSelect`.
 */
export function QuestionNavigator({
	questions,
	current,
	onSelect,
	columns = 10,
	title = "All questions",
	currentLabel = "Where you are now",
	className,
}: {
	questions: NavQuestion[];
	current?: number;
	onSelect?: (n: number) => void;
	/** 10 in the design system sheet, 5 in the player's right rail. */
	columns?: 5 | 10;
	title?: string;
	currentLabel?: string;
	className?: string;
}) {
	const answered = questions.filter((q) => q.answered).length;
	return (
		<div className={cn("flex flex-col gap-4", className)}>
			<div className="flex items-baseline justify-between gap-3">
				<h2 className="m-0 text-h3">{title}</h2>
				<span className="font-mono text-ink-2">
					{answered}/{questions.length}
				</span>
			</div>
			<div className={cn("grid gap-2", columns === 5 ? "grid-cols-5" : "grid-cols-10")}>
				{questions.map((q) => {
					const isCurrent = q.n === current;
					return (
						<button
							key={q.n}
							type="button"
							onClick={() => onSelect?.(q.n)}
							aria-label={describe(q, isCurrent)}
							aria-current={isCurrent ? "step" : undefined}
							className={cn(
								"relative grid aspect-square min-h-8 place-items-center rounded-control text-small font-semibold",
								q.answered ? "bg-brand-soft text-brand" : "border border-line bg-surface text-ink-2",
								isCurrent && "border-2 border-brand font-bold text-brand",
								"hover:border-brand",
							)}
						>
							{q.n}
							{q.flagged && (
								<span
									aria-hidden="true"
									className="absolute top-[3px] right-[3px] size-1.5 rounded-full bg-warning"
								/>
							)}
						</button>
					);
				})}
			</div>
			<ul className="m-0 flex list-none flex-col gap-2 border-t border-line p-0 pt-4">
				<li className="flex items-center gap-3">
					<span className="size-5 flex-none rounded border border-line bg-surface" aria-hidden="true" />
					Not answered
				</li>
				<li className="flex items-center gap-3">
					<span className="size-5 flex-none rounded bg-brand-soft" aria-hidden="true" />
					Answered
				</li>
				<li className="flex items-center gap-3">
					<span className="relative size-5 flex-none rounded bg-brand-soft" aria-hidden="true">
						<span className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-warning" />
					</span>
					Marked to check later
				</li>
				<li className="flex items-center gap-3">
					<span className="size-5 flex-none rounded border-2 border-brand bg-surface" aria-hidden="true" />
					{currentLabel}
				</li>
			</ul>
		</div>
	);
}

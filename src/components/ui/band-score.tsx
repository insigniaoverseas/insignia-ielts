import { cn } from "@/lib/utils";

/**
 * Format a band for display. IELTS reports bands to one decimal — "7.0", not "7".
 */
export function formatBand(band: number): string {
	return band.toFixed(1);
}

/**
 * Band score — the hero of the Result screen (09): the number at hero size,
 * "out of 9", and a plain-English descriptor such as "Good user".
 *
 * Presentational only. The band is computed server-side on submit (MVP-1 §7) —
 * this component never scores anything.
 */
export function BandScore({
	band,
	descriptor,
	caption = "Your band score",
	className,
}: {
	band: number;
	descriptor: string;
	caption?: string;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex flex-col items-center gap-2 rounded-card bg-brand-soft px-6 py-8 text-center",
				className,
			)}
		>
			<span className="font-semibold text-brand">{caption}</span>
			<div className="flex items-baseline gap-2">
				<span className="text-hero font-bold tabular-nums">{formatBand(band)}</span>
				<span className="text-h1 font-semibold text-ink-2">out of 9</span>
			</div>
			<span className="text-h2">{descriptor}</span>
		</div>
	);
}

/**
 * One line comparing an answer — used on Review my mistakes (10).
 *
 * Correct and wrong always pair colour with a mark (✓ / ✕) **and** a word,
 * because some students are colour-blind and all of them are stressed.
 */
export function AnswerLine({
	kind,
	value,
	label,
	className,
}: {
	kind: "correct" | "yours";
	value: React.ReactNode;
	/** Defaults to "Correct answer" / "Your answer". */
	label?: string;
	className?: string;
}) {
	const correct = kind === "correct";
	return (
		<div
			className={cn(
				"flex items-center gap-3 rounded-control px-4 py-3",
				correct ? "bg-success-soft" : "bg-danger-soft",
				className,
			)}
		>
			<span className={cn("font-bold", correct ? "text-success" : "text-danger")} aria-hidden="true">
				{correct ? "✓" : "✕"}
			</span>
			<span>
				<strong className="font-semibold">{label ?? (correct ? "Correct answer" : "Your answer")}</strong> — {value}
			</span>
		</div>
	);
}

import { cn } from "@/lib/utils";

type Tone = "neutral" | "good" | "attention";

const DELTA_TONE: Record<Tone, string> = {
	neutral: "text-ink-2",
	good: "text-success",
	attention: "text-warning",
};

/**
 * Stat card (admin/teacher) — big number, label, small trend line.
 *
 * @param valueTone `"attention"` colours the number itself, for counts that
 *                  need action (e.g. "Plans expiring in 7 days").
 */
export function StatCard({
	label,
	value,
	delta,
	deltaTone = "neutral",
	valueTone = "neutral",
	className,
}: {
	label: string;
	value: React.ReactNode;
	delta?: string;
	deltaTone?: Tone;
	valueTone?: Tone;
	className?: string;
}) {
	return (
		<div className={cn("flex flex-col gap-2 rounded-card border border-line bg-surface p-6", className)}>
			<span className="text-small text-ink-2">{label}</span>
			<span className={cn("text-display tabular-nums", valueTone === "attention" && "text-warning")}>{value}</span>
			{delta && <span className={cn("text-small", DELTA_TONE[deltaTone])}>{delta}</span>}
		</div>
	);
}

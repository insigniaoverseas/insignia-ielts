import { cn } from "@/lib/utils";

/** The fixed three-level scale (MVP-1 D5). Stored values — never change these. */
export type Difficulty = "easy" | "medium" | "hard";

/**
 * Display label per level. Kept separate from the stored value on purpose, so a
 * wording change never touches data. Labels settled in PROJECT-MEMORY §7 Q1
 * (2026-09-15): Easy / Medium / Hard.
 */
export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
	easy: "Easy",
	medium: "Medium",
	hard: "Hard",
};

/*
 * Colours and bar fills from "04 My Tests.dc.html":
 *   Easy   — 1 of 3 bars filled, success
 *   Medium — 2 of 3 bars filled, warning
 *   Hard   — 3 of 3 bars filled, danger
 */
const STYLE: Record<Difficulty, { pill: string; filled: string; empty: string; count: number }> = {
	easy: { pill: "bg-success-soft text-success", filled: "bg-success", empty: "bg-success-muted", count: 1 },
	medium: { pill: "bg-warning-soft text-warning", filled: "bg-warning", empty: "bg-warning-muted", count: 2 },
	hard: { pill: "bg-danger-soft text-danger", filled: "bg-danger", empty: "bg-danger-line", count: 3 },
};

const BAR_HEIGHTS = ["h-[7px]", "h-[10px]", "h-[13px]"];

/**
 * Difficulty — always the word **plus** a three-bar indicator, never colour
 * alone (`Prioritizing project scope/CLAUDE.md`).
 */
export function DifficultyBadge({ level, className }: { level: Difficulty; className?: string }) {
	const s = STYLE[level];
	return (
		<span
			className={cn(
				"inline-flex items-center gap-2 rounded-full px-3 py-1 text-small font-semibold whitespace-nowrap",
				s.pill,
				className,
			)}
		>
			<span className="inline-flex items-end gap-0.5" aria-hidden="true">
				{BAR_HEIGHTS.map((h, i) => (
					<span key={h} className={cn("w-[3px] rounded-[1px]", h, i < s.count ? s.filled : s.empty)} />
				))}
			</span>
			{DIFFICULTY_LABEL[level]}
		</span>
	);
}

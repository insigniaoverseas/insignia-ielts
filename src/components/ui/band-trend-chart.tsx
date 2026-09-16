import { formatBand } from "./band-score";

/**
 * One point on the x axis. `band` is `null` when this skill was not tested on
 * this date — a student sits Listening one week and Reading the next, so the
 * two lines almost never share their dates. A null breaks the line rather than
 * inventing a score for a test nobody took.
 */
export type BandPoint = { label: string; band: number | null };
export type BandSeries = { name: string; tone: "brand" | "success"; points: BandPoint[] };

const TONE_COLOR: Record<BandSeries["tone"], string> = {
	brand: "var(--brand)",
	success: "var(--success)",
};

// Geometry, in viewBox units (matches the design system's 360×180 sketch).
const W = 360;
const H = 180;
const LEFT = 32;
const RIGHT = 88; // room for the direct end label ("Reading 6.5")
const TOP = 20;
const BOTTOM = 150;

/**
 * Split a skill's points into runs of consecutive dates, so a gap in the middle
 * breaks the line instead of drawing a straight edge across months it skipped.
 */
function segments(points: { i: number; band: number }[]): { i: number; band: number }[][] {
	const runs: { i: number; band: number }[][] = [];
	for (const p of points) {
		const run = runs.at(-1);
		if (run && run.at(-1)!.i === p.i - 1) run.push(p);
		else runs.push([p]);
	}
	return runs;
}

/**
 * Band over time — one line per skill, labelled directly at its end point
 * instead of a legend; minimal axes, no gridline clutter (screen 11).
 *
 * Hand-rolled SVG rather than a charting library, for the phone bundle budget.
 * All series should share the same x labels, in order.
 */
export function BandTrendChart({ series, title }: { series: BandSeries[]; title: string }) {
	const all = series.flatMap((s) => s.points.map((p) => p.band)).filter((b): b is number => b !== null);
	if (all.length === 0) return null;

	const lo = Math.max(0, Math.floor(Math.min(...all)) - 0.5);
	const hi = Math.min(9, Math.ceil(Math.max(...all)) + 0.5);
	const span = hi - lo || 1;
	const count = Math.max(...series.map((s) => s.points.length));
	const x = (i: number) => LEFT + (count <= 1 ? 0 : (i / (count - 1)) * (W - LEFT - RIGHT));
	const y = (band: number) => TOP + (1 - (band - lo) / span) * (BOTTOM - TOP);
	const xLabels = series[0]?.points ?? [];

	const summary = series
		.map((s) => {
			const last = s.points.filter((p) => p.band !== null).at(-1);
			return last?.band != null ? `${s.name} ${formatBand(last.band)}` : `${s.name}: no tests yet`;
		})
		.join(", ");

	/*
	 * Direct end labels only work while the lines end in different places. Two
	 * skills often finish within a few marks of each other, so lay the labels
	 * out top-down and push any that would collide apart — a legend would cost
	 * the reader a lookup, which is what direct labelling exists to avoid.
	 */
	const MIN_GAP = 15;
	const endLabels = series
		.map((s) => {
			const taken = s.points
				.map((p, i) => ({ i, band: p.band }))
				.filter((p): p is { i: number; band: number } => p.band !== null);
			const end = taken.at(-1);
			return end ? { name: s.name, color: TONE_COLOR[s.tone], end, textY: y(end.band) - 4 } : null;
		})
		.filter((l) => l !== null)
		.sort((a, b) => a.textY - b.textY);

	for (let i = 1; i < endLabels.length; i++) {
		const prev = endLabels[i - 1];
		const cur = endLabels[i];
		if (cur.textY - prev.textY < MIN_GAP) cur.textY = prev.textY + MIN_GAP;
	}

	return (
		<svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${title}. Latest: ${summary}.`}>
			<line x1={LEFT} y1={BOTTOM} x2={W - 12} y2={BOTTOM} stroke="var(--line)" strokeWidth={1} />
			{series.map((s) => {
				const color = TONE_COLOR[s.tone];
				// Keep the original index — it is the x position — while dropping the
				// dates this skill was not tested on.
				const taken = s.points
					.map((p, i) => ({ i, band: p.band }))
					.filter((p): p is { i: number; band: number } => p.band !== null);
				if (taken.length === 0) return null;
				const end = taken.at(-1) as { i: number; band: number };

				return (
					<g key={s.name}>
						{segments(taken).map((seg) => (
							<polyline
								key={seg[0].i}
								points={seg.map((p) => `${x(p.i)},${y(p.band)}`).join(" ")}
								fill="none"
								stroke={color}
								strokeWidth={3}
								strokeLinejoin="round"
								strokeLinecap="round"
							/>
						))}
						{/* A lone point has no line to be seen on, so give it a dot. */}
						{segments(taken)
							.filter((seg) => seg.length === 1)
							.map((seg) => (
								<circle key={`dot-${seg[0].i}`} cx={x(seg[0].i)} cy={y(seg[0].band)} r={4} fill={color} />
							))}
						<circle cx={x(end.i)} cy={y(end.band)} r={5} fill={color} />
					</g>
				);
			})}
			{endLabels.map((l) => (
				<text
					key={l.name}
					x={x(l.end.i) + 9}
					y={l.textY}
					fontSize={13}
					fontWeight={600}
					fill={l.color}
					fontFamily="var(--font-sans)"
					// A halo in the card colour, so a label stays readable where it
					// crosses the other skill's line.
					stroke="var(--surface)"
					strokeWidth={3}
					paintOrder="stroke"
				>
					{l.name} {formatBand(l.end.band)}
				</text>
			))}
			{xLabels.length > 0 && (
				<>
					<text x={x(0)} y={H - 12} fontSize={13} fill="var(--ink-3)" fontFamily="var(--font-sans)">
						{xLabels[0].label}
					</text>
					{xLabels.length > 1 && (
						<text
							x={x(xLabels.length - 1)}
							y={H - 12}
							fontSize={13}
							fill="var(--ink-3)"
							textAnchor="middle"
							fontFamily="var(--font-sans)"
						>
							{xLabels.at(-1)?.label}
						</text>
					)}
				</>
			)}
		</svg>
	);
}

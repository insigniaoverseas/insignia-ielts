import { formatBand } from "./band-score";

export type BandPoint = { label: string; band: number };
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
 * Band over time — one line per skill, labelled directly at its end point
 * instead of a legend; minimal axes, no gridline clutter (screen 11).
 *
 * Hand-rolled SVG rather than a charting library, for the phone bundle budget.
 * All series should share the same x labels, in order.
 */
export function BandTrendChart({ series, title }: { series: BandSeries[]; title: string }) {
	const all = series.flatMap((s) => s.points.map((p) => p.band));
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
			const last = s.points.at(-1);
			return last ? `${s.name} ${formatBand(last.band)}` : s.name;
		})
		.join(", ");

	return (
		<svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${title}. Latest: ${summary}.`}>
			<line x1={LEFT} y1={BOTTOM} x2={W - 12} y2={BOTTOM} stroke="var(--line)" strokeWidth={1} />
			{series.map((s) => {
				const color = TONE_COLOR[s.tone];
				const last = s.points.length - 1;
				const end = s.points[last];
				return (
					<g key={s.name}>
						<polyline
							points={s.points.map((p, i) => `${x(i)},${y(p.band)}`).join(" ")}
							fill="none"
							stroke={color}
							strokeWidth={3}
							strokeLinejoin="round"
							strokeLinecap="round"
						/>
						{end && (
							<>
								<circle cx={x(last)} cy={y(end.band)} r={5} fill={color} />
								<text
									x={x(last) + 8}
									y={y(end.band) - 4}
									fontSize={13}
									fontWeight={600}
									fill={color}
									fontFamily="var(--font-sans)"
								>
									{s.name} {formatBand(end.band)}
								</text>
							</>
						)}
					</g>
				);
			})}
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

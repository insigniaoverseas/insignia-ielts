"use client";

import { cn } from "@/lib/utils";
import { formatClock } from "./countdown";

const controlButton =
	"min-h-12 rounded-control border border-line bg-surface px-4 font-semibold text-ink hover:border-ink-3 disabled:cursor-not-allowed disabled:text-ink-3";

/**
 * Audio player view — huge play button, progress, elapsed/total, volume.
 *
 * **Mock mode** follows the real test (PLAN.md §4): the recording plays once,
 * straight through. The button can *start* playback but not pause it, there is
 * no seek bar, and a note says "You can't rewind in a real test". Volume only.
 *
 * **Practice mode** adds pause, Back 10s, Play again and speed.
 *
 * Presentational only — the parent owns the `<audio>` element and its state.
 * Per MVP-1 D8 there is one audio file per test; section changes never touch it.
 */
export function AudioPlayer({
	mode,
	playing,
	elapsed,
	duration,
	volume,
	surface = "light",
	onPlay,
	onPause,
	onVolumeChange,
	onBack10,
	onReplay,
	speed = 1,
	onSpeedChange,
	title,
	className,
}: {
	mode: "mock" | "practice";
	playing: boolean;
	/** Seconds into the single test recording. */
	elapsed: number;
	duration: number;
	/** 0–1 */
	volume: number;
	/**
	 * Which surface it is drawn on.
	 *
	 * - `light` (default) — the vertical control stack: practice at home, and
	 *   the `/dev/components` gallery.
	 * - `night` — the compact band across the top of the mock player
	 *   (`06 Test Player Listening.dc.html`): white play button, translucent
	 *   track, no volume slider. In a lab the volume is on the machine, and an
	 *   extra control on a screen a student sees once is a control they can get
	 *   wrong under time pressure.
	 */
	surface?: "light" | "night";
	onPlay: () => void;
	onPause?: () => void;
	onVolumeChange: (volume: number) => void;
	onBack10?: () => void;
	onReplay?: () => void;
	speed?: number;
	onSpeedChange?: (speed: number) => void;
	title?: string;
	className?: string;
}) {
	const pct = duration > 0 ? Math.min(100, (elapsed / duration) * 100) : 0;
	const canPause = mode === "practice";
	const buttonDisabled = playing && !canPause;

	if (surface === "night") {
		return (
			<div className={cn("flex flex-wrap items-center gap-6", className)}>
				<button
					type="button"
					onClick={playing ? onPause : onPlay}
					disabled={buttonDisabled}
					aria-label={playing ? (canPause ? "Pause the audio" : "The audio is playing") : "Play the audio"}
					className="grid size-16 flex-none place-items-center rounded-full bg-white text-h1 text-night hover:bg-brand-soft disabled:cursor-default disabled:bg-white"
				>
					<span aria-hidden="true">{playing ? "❚❚" : "▶"}</span>
				</button>

				<div className="flex min-w-[220px] flex-1 flex-col gap-2">
					<div className="flex items-baseline justify-between gap-4">
						<span className="font-semibold text-white">{title ?? "Your test audio"}</span>
						<span className="font-mono text-[#dce3f5]">
							{formatClock(elapsed)} / {formatClock(duration)}
						</span>
					</div>
					<div
						className="h-2 overflow-hidden rounded-full bg-white/18"
						role="progressbar"
						aria-label="Audio progress"
						aria-valuemin={0}
						aria-valuemax={Math.round(duration)}
						aria-valuenow={Math.round(elapsed)}
						aria-valuetext={`${formatClock(elapsed)} of ${formatClock(duration)}`}
					>
						<div className="h-full bg-[#7fa0ff]" style={{ width: `${pct}%` }} />
					</div>
				</div>

				{mode === "mock" && (
					<div className="flex items-center gap-2.5 rounded-control bg-white/10 px-4 py-2.5">
						<span aria-hidden="true">🔒</span>
						<span className="text-[#dce3f5]">You can&apos;t rewind in a real test.</span>
					</div>
				)}
			</div>
		);
	}

	return (
		<div className={cn("flex flex-col gap-6", className)}>
			<div className="flex items-center gap-4">
				<button
					type="button"
					onClick={playing ? onPause : onPlay}
					disabled={buttonDisabled}
					aria-label={playing ? (canPause ? "Pause the audio" : "The audio is playing") : "Play the audio"}
					className="grid size-18 flex-none place-items-center rounded-full bg-brand text-h1 text-white hover:bg-brand-hover disabled:cursor-default disabled:bg-brand"
				>
					<span aria-hidden="true">{playing ? "❚❚" : "▶"}</span>
				</button>
				<div className="flex min-w-0 flex-1 flex-col gap-2">
					{title && <span className="font-semibold">{title}</span>}
					<div
						className="h-2 overflow-hidden rounded-full bg-line"
						role="progressbar"
						aria-label="Audio progress"
						aria-valuemin={0}
						aria-valuemax={Math.round(duration)}
						aria-valuenow={Math.round(elapsed)}
						aria-valuetext={`${formatClock(elapsed)} of ${formatClock(duration)}`}
					>
						<div className="h-full bg-brand" style={{ width: `${pct}%` }} />
					</div>
					<div className="flex justify-between font-mono text-ink-2">
						<span>{formatClock(elapsed)}</span>
						<span>{formatClock(duration)}</span>
					</div>
				</div>
			</div>

			{mode === "mock" && (
				<div className="flex items-center gap-3 rounded-control border border-line bg-bg px-4 py-3">
					<span aria-hidden="true">🔒</span>
					<span className="text-ink-2">You can&apos;t rewind in a real test.</span>
				</div>
			)}

			<label className="flex items-center gap-3">
				<span className="font-semibold">Volume</span>
				<input
					type="range"
					min={0}
					max={1}
					step={0.05}
					value={volume}
					onChange={(e) => onVolumeChange(Number(e.target.value))}
					className="h-2 flex-1 accent-ink-2"
				/>
			</label>

			{mode === "practice" && (
				<div className="flex flex-wrap gap-2 border-t border-line pt-6">
					<button type="button" onClick={onBack10} className={controlButton}>
						<span aria-hidden="true">◀ </span>Back 10s
					</button>
					<button type="button" onClick={onReplay} className={controlButton}>
						Play again
					</button>
					<button
						type="button"
						onClick={() => onSpeedChange?.(speed >= 1.5 ? 0.75 : speed + 0.25)}
						className={controlButton}
					>
						Speed {speed.toFixed(2).replace(/0$/, "")}×
					</button>
				</div>
			)}
		</div>
	);
}

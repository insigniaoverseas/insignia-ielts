import { cn } from "@/lib/utils";

/** Seconds → "28:14", or "1:05:00" at an hour or more. Negative clamps to 0. */
export function formatClock(totalSeconds: number): string {
	const s = Math.max(0, Math.floor(totalSeconds));
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = s % 60;
	const mm = String(m).padStart(2, "0");
	const ss = String(sec).padStart(2, "0");
	return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Which of the three calm states the timer is in. */
export function countdownTone(seconds: number): "calm" | "warning" | "danger" {
	if (seconds <= 60) return "danger";
	if (seconds <= 300) return "warning";
	return "calm";
}

const TONE = {
	calm: "bg-bg border-line text-ink",
	warning: "bg-warning-soft border-warning-line text-warning",
	danger: "bg-danger-soft border-danger-line text-danger animate-pulse-soft",
} as const;

const DEFAULT_NOTE = {
	calm: undefined,
	warning: "Less than 5 minutes left",
	danger: "Less than 1 minute left",
} as const;

/**
 * The big countdown — mono, tabular, calm grey → warning under 5 minutes →
 * danger with a gentle pulse under 1 minute. **Never flashing red-alarm
 * styling**: this is a high-anxiety product.
 *
 * ⚠️ Display only. The server owns the clock (MVP-1 §7, task M2-08): the
 * parent derives `seconds` from the server's `expires_at` and `server_now`,
 * never from the browser's own clock.
 *
 * `role="timer"` is implicitly `aria-live="off"`, so screen readers are not
 * interrupted every second.
 */
export function Countdown({
	seconds,
	note,
	className,
}: {
	seconds: number;
	/** Line under the clock. Defaults to a warning below 5 minutes. */
	note?: string;
	className?: string;
}) {
	const tone = countdownTone(seconds);
	const caption = note ?? DEFAULT_NOTE[tone];
	const m = Math.floor(Math.max(0, seconds) / 60);
	return (
		<div className={cn("flex flex-col items-center gap-0.5", className)}>
			<div
				role="timer"
				aria-label={`Time left: ${m} minute${m === 1 ? "" : "s"}`}
				className={cn("rounded-control border px-5 py-2 font-mono text-display font-medium", TONE[tone])}
			>
				{formatClock(seconds)}
			</div>
			{caption && <span className="text-small text-ink-2">{caption}</span>}
		</div>
	);
}

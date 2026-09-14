import { cn } from "@/lib/utils";

type Tone = "info" | "warning" | "danger";

const TONE: Record<Tone, { box: string; glyph: string; mark: string }> = {
	info: { box: "bg-brand-soft border-brand-line", glyph: "i", mark: "text-brand" },
	warning: { box: "bg-warning-soft border-warning-line", glyph: "!", mark: "text-warning" },
	danger: { box: "bg-danger-soft border-danger-line", glyph: "✕", mark: "text-danger" },
};

/**
 * Banner — one line of info, warning or danger, with an optional action.
 * Used for plan expiry, "your next test opens Monday", "your access has ended".
 *
 * Every banner says what's happening **and** what to do about it
 * (DESIGN-PROMPT "Say what's happening and what to do").
 *
 * @example
 * <Banner tone="warning" action={<a href="/profile">Ask your teacher to extend it</a>}>
 *   Your access ends in 5 days.
 * </Banner>
 */
export function Banner({
	tone = "info",
	action,
	children,
	className,
}: {
	tone?: Tone;
	action?: React.ReactNode;
	children: React.ReactNode;
	className?: string;
}) {
	const t = TONE[tone];
	return (
		<div
			role={tone === "danger" ? "alert" : "status"}
			className={cn("flex items-start gap-3 rounded-card border px-5 py-4 text-body", t.box, className)}
		>
			<span className={cn("font-bold", t.mark)} aria-hidden="true">
				{t.glyph}
			</span>
			<p className="m-0">
				{children}
				{action && <> {action}</>}
			</p>
		</div>
	);
}

import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

type Tone = "info" | "success" | "warning" | "danger";

const TONE: Record<Tone, { box: string; glyph: IconName; mark: string }> = {
	info: { box: "bg-brand-soft border-brand-line", glyph: "info", mark: "text-brand" },
	// No `--success-line` token exists; `success-muted` is the nearest in-system
	// border and the palette is switched off, so inventing one would generate
	// nothing. Added for "invitation sent" (M1-02).
	success: { box: "bg-success-soft border-success-muted", glyph: "check", mark: "text-success" },
	warning: { box: "bg-warning-soft border-warning-line", glyph: "warning", mark: "text-warning" },
	danger: { box: "bg-danger-soft border-danger-line", glyph: "alert", mark: "text-danger" },
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
			<Icon name={t.glyph} className={cn("mt-0.5 size-5", t.mark)} />
			<p className="m-0">
				{children}
				{action && <> {action}</>}
			</p>
		</div>
	);
}

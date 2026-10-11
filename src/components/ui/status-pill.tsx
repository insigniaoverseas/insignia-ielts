import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/** Every status a test, attempt or plan can be shown in. */
export type Status =
	| "not_started"
	| "in_progress"
	| "submitted"
	| "locked"
	| "expired"
	| "active"
	| "expiring";

const STATUS: Record<Status, { label: string; glyph: IconName; tone: string }> = {
	not_started: { label: "Not started", glyph: "circle", tone: "bg-bg border border-line text-ink-2" },
	in_progress: { label: "In progress", glyph: "play", tone: "bg-brand-soft text-brand" },
	submitted: { label: "Submitted", glyph: "check", tone: "bg-success-soft text-success" },
	locked: { label: "Locked", glyph: "lock", tone: "bg-bg border border-line text-ink-2" },
	expired: { label: "Expired", glyph: "x", tone: "bg-danger-soft text-danger" },
	active: { label: "Active", glyph: "dot", tone: "bg-success-soft text-success" },
	expiring: { label: "Expiring soon", glyph: "warning", tone: "bg-warning-soft text-warning" },
};

/**
 * Status pill — always a glyph **and** a word on a soft background, so meaning
 * never rests on colour alone (DESIGN-PROMPT §A2).
 *
 * @param size `"md"` (16px, student screens) or `"sm"` (14px, dense admin tables).
 * @param label Override the default word, e.g. "In 5 days" for an expiry pill.
 */
export function StatusPill({
	status,
	size = "md",
	label,
	className,
}: {
	status: Status;
	size?: "md" | "sm";
	label?: string;
	className?: string;
}) {
	const s = STATUS[status];
	return (
		<span
			className={cn(
				"inline-flex items-center gap-2 rounded-full font-semibold whitespace-nowrap",
				size === "md" ? "px-3.5 py-1.5 text-body" : "px-3 py-1 text-small",
				s.tone,
				className,
			)}
		>
			<Icon name={s.glyph} strokeWidth={2.5} />
			{label ?? s.label}
		</span>
	);
}

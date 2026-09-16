import Link from "next/link";
import { cn } from "@/lib/utils";

/** One tab: the label a student reads, and the `?tab=` value behind it. */
export type PillTab = { value: string; label: string };

/**
 * The pill tab row from screen 04.
 *
 * Tabs are **links**, not client state, so each tab is its own URL: the back
 * button works, a tab can be shared or bookmarked, and the screen needs no
 * JavaScript to switch. For a student on a slow phone in a lab, that matters
 * more than the animation it gives up.
 */
export function PillTabs({
	tabs,
	active,
	basePath,
	extraParams,
}: {
	tabs: PillTab[];
	active: string;
	basePath: string;
	/** Carried through so a review scenario (`?state=`) survives a tab change. */
	extraParams?: Record<string, string | undefined>;
}) {
	const extra = Object.entries(extraParams ?? {})
		.filter(([, v]) => v)
		.map(([k, v]) => `&${k}=${encodeURIComponent(v as string)}`)
		.join("");

	return (
		<div
			role="tablist"
			aria-label="Which tests to show"
			className="flex gap-1 self-start rounded-full border border-line bg-surface p-1"
		>
			{tabs.map((tab) => {
				const on = tab.value === active;
				return (
					<Link
						key={tab.value}
						href={`${basePath}?tab=${tab.value}${extra}`}
						role="tab"
						aria-selected={on}
						className={cn(
							"flex min-h-touch items-center rounded-full px-5 font-semibold no-underline hover:no-underline",
							on ? "bg-brand-soft text-brand" : "text-ink-2 hover:bg-bg hover:text-ink",
						)}
					>
						{tab.label}
					</Link>
				);
			})}
		</div>
	);
}

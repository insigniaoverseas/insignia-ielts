import Link from "next/link";
import { cn } from "@/lib/utils";

export type TabItem = { href: string; label: string; icon: string };

/** The four student destinations. Max four, always labelled (DESIGN-PROMPT §A5.20). */
export const STUDENT_TABS: TabItem[] = [
	{ href: "/home", label: "Home", icon: "🏠" },
	{ href: "/tests", label: "My Tests", icon: "📄" },
	{ href: "/progress", label: "Progress", icon: "📈" },
	{ href: "/profile", label: "Profile", icon: "👤" },
];

/**
 * Student navigation — bottom tabs on mobile, top bar on desktop.
 * Words over icons: every icon accompanies a label, never replaces it.
 * No hamburger menu on the student side.
 *
 * Positioning (fixed bottom vs. top) is the app shell's job (M2-01);
 * this component only draws the bar.
 */
export function StudentTabBar({
	activeHref,
	items = STUDENT_TABS,
	className,
}: {
	activeHref: string;
	items?: TabItem[];
	className?: string;
}) {
	return (
		<nav aria-label="Main" className={cn("overflow-hidden rounded-card border border-line bg-surface", className)}>
			<ul className="m-0 flex list-none p-0">
				{items.map((item) => {
					const active = item.href === activeHref;
					return (
						<li key={item.href} className="flex-1">
							<Link
								href={item.href}
								aria-current={active ? "page" : undefined}
								className={cn(
									"flex min-h-16 flex-col items-center justify-center gap-1 no-underline hover:no-underline",
									active ? "bg-brand-soft text-brand" : "text-ink-2 hover:bg-bg hover:text-ink",
								)}
							>
								<span aria-hidden="true">{item.icon}</span>
								<span className="text-small font-semibold">{item.label}</span>
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}

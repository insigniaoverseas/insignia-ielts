"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { STUDENT_TABS, StudentTabBar } from "@/components/ui/student-tab-bar";
import { cn } from "@/lib/utils";

/*
 * The only client component in the student shell, and only because a layout
 * cannot read the current path on the server. It holds no state of its own.
 */

/** Which tab a path belongs to. `/tests/a-001/start` still lights up "My Tests". */
function activeTab(pathname: string): string {
	const match = STUDENT_TABS.find((t) => pathname === t.href || pathname.startsWith(`${t.href}/`));
	return match?.href ?? "";
}

/** Top navigation, desktop only. Four labelled destinations, no hamburger. */
export function StudentTopNav() {
	const active = activeTab(usePathname());
	return (
		<nav aria-label="Main" className="hidden gap-1 md:flex">
			{STUDENT_TABS.map((tab) => {
				const on = tab.href === active;
				return (
					<Link
						key={tab.href}
						href={tab.href}
						aria-current={on ? "page" : undefined}
						className={cn(
							"flex min-h-touch items-center rounded-control px-4 font-semibold no-underline hover:no-underline",
							on ? "bg-brand-soft text-brand" : "text-ink-2 hover:bg-bg hover:text-ink",
						)}
					>
						{tab.label}
					</Link>
				);
			})}
		</nav>
	);
}

/** Bottom tab bar, mobile only. Square-cornered and edge-to-edge, per screen 03. */
export function StudentBottomNav() {
	const active = activeTab(usePathname());
	return (
		<StudentTabBar
			activeHref={active}
			className="sticky bottom-0 z-10 rounded-none border-0 border-t border-line md:hidden"
		/>
	);
}

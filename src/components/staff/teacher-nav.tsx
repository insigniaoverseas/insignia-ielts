"use client";

import { usePathname } from "next/navigation";
import { StaffSidebar, type SidebarGroup } from "@/components/ui/staff-sidebar";

/** The teacher destinations. Fewer than admin's, and all about one batch at a time. */
export const TEACHER_GROUPS: SidebarGroup[] = [
	{ title: "Teaching", items: [{ href: "/teacher/dashboard", label: "Dashboard", icon: "▤" }] },
	{
		title: "Tests",
		items: [
			{ href: "/teacher/assign", label: "Assign a test", icon: "＋" },
			{ href: "/teacher/results", label: "Results", icon: "✓" },
		],
	},
];

function useActive() {
	const pathname = usePathname();
	return (
		TEACHER_GROUPS.flatMap((g) => g.items).find(
			(i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
		)?.href ?? ""
	);
}

/** The teacher sidebar. Client only because a layout can't read the path. */
export function TeacherNav() {
	return <StaffSidebar groups={TEACHER_GROUPS} activeHref={useActive()} className="sticky top-6 hidden lg:flex" />;
}

/** The same destinations as a chip row, below the sidebar breakpoint. */
export function TeacherNavCompact() {
	const active = useActive();
	return (
		<nav aria-label="Staff" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
			{TEACHER_GROUPS.flatMap((g) => g.items).map((item) => {
				const on = item.href === active;
				return (
					<a
						key={item.href}
						href={item.href}
						aria-current={on ? "page" : undefined}
						className={`flex min-h-10 flex-none items-center rounded-full border px-4 font-semibold no-underline hover:no-underline ${
							on ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-ink-2 hover:text-ink"
						}`}
					>
						{item.label}
					</a>
				);
			})}
		</nav>
	);
}

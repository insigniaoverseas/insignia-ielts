"use client";

import { usePathname } from "next/navigation";
import { StaffSidebar, type SidebarGroup } from "@/components/ui/staff-sidebar";

/** The admin destinations, grouped by the job they belong to. */
export const ADMIN_GROUPS: SidebarGroup[] = [
	{
		title: "Overview",
		items: [{ href: "/admin/overview", label: "Overview", icon: "▤" }],
	},
	{
		title: "People",
		items: [
			{ href: "/admin/students", label: "Students", icon: "👤" },
			{ href: "/admin/plans", label: "Plans & validity", icon: "⏳" },
			{ href: "/admin/batches", label: "Batches", icon: "▦" },
		],
	},
	{
		title: "Content",
		items: [{ href: "/admin/library", label: "Test library", icon: "📄" }],
	},
];

/**
 * The admin sidebar. A client component only because a layout cannot read the
 * current path on the server; it holds no state.
 */
export function AdminNav() {
	const pathname = usePathname();
	const active =
		ADMIN_GROUPS.flatMap((g) => g.items).find(
			(i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
		)?.href ?? "";

	return <StaffSidebar groups={ADMIN_GROUPS} activeHref={active} className="sticky top-6 hidden lg:flex" />;
}

/** The same destinations as a scrolling row, for tablet widths. */
export function AdminNavCompact() {
	const pathname = usePathname();
	const items = ADMIN_GROUPS.flatMap((g) => g.items);
	return (
		<nav aria-label="Staff" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
			{items.map((item) => {
				const on = pathname === item.href || pathname.startsWith(`${item.href}/`);
				return (
					<a
						key={item.href}
						href={item.href}
						aria-current={on ? "page" : undefined}
						className={`flex min-h-10 flex-none items-center gap-2 rounded-full border px-4 font-semibold no-underline hover:no-underline ${
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

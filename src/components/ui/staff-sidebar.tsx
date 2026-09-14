import Link from "next/link";
import { cn } from "@/lib/utils";

export type SidebarGroup = {
	title: string;
	items: { href: string; label: string; icon?: string }[];
};

/**
 * Teacher / admin navigation — a grouped left sidebar with labelled items.
 * Denser than the student side (these are power users) but the same visual
 * language.
 *
 * Named `staff-sidebar` rather than `sidebar` so it can't collide with the
 * shadcn `sidebar` component (M0-03).
 */
export function StaffSidebar({
	groups,
	activeHref,
	className,
}: {
	groups: SidebarGroup[];
	activeHref: string;
	className?: string;
}) {
	return (
		<nav
			aria-label="Staff"
			className={cn("flex w-full max-w-[260px] flex-col gap-1 rounded-card border border-line bg-surface p-4", className)}
		>
			{groups.map((group, g) => (
				<div key={group.title} className="flex flex-col gap-1">
					<span
						className={cn(
							"px-3 py-2 text-small font-semibold tracking-[0.06em] text-ink-3 uppercase",
							g > 0 && "mt-2",
						)}
					>
						{group.title}
					</span>
					<ul className="m-0 flex list-none flex-col gap-1 p-0">
						{group.items.map((item) => {
							const active = item.href === activeHref;
							return (
								<li key={item.href}>
									<Link
										href={item.href}
										aria-current={active ? "page" : undefined}
										className={cn(
											"flex min-h-10 items-center gap-3 rounded-control px-3 no-underline hover:no-underline",
											active
												? "bg-brand-soft font-semibold text-brand"
												: "text-ink-2 hover:bg-bg hover:text-ink",
										)}
									>
										{item.icon && <span aria-hidden="true">{item.icon}</span>}
										{item.label}
									</Link>
								</li>
							);
						})}
					</ul>
				</div>
			))}
		</nav>
	);
}

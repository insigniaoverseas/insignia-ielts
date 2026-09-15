import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A toggleable filter chip for a table toolbar — "All batches", "Active",
 * "Expiring < 7 days". Section 12 of the design system.
 *
 * It is a real `<button>` with `aria-pressed`, so a screen reader announces
 * whether the filter is on; the brand tint is the second cue, not the only one.
 * Staff-only, hence 14px.
 *
 * @param pressed - Whether this filter is currently applied.
 *
 * @example <FilterChip pressed={f === "active"} onClick={() => setF("active")}>Active</FilterChip>
 */
function FilterChip({
	className,
	pressed = false,
	type = "button",
	...props
}: React.ComponentProps<"button"> & { pressed?: boolean }) {
	return (
		<button
			type={type}
			data-slot="filter-chip"
			aria-pressed={pressed}
			className={cn(
				"inline-flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-1.5 text-small font-semibold whitespace-nowrap transition-colors",
				pressed
					? "border-transparent bg-brand-soft text-brand"
					: "border-line bg-surface text-ink-2 hover:border-ink-3",
				className,
			)}
			{...props}
		/>
	);
}

export { FilterChip };

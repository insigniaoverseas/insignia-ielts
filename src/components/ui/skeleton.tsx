import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A loading placeholder.
 *
 * Skeleton blocks matching the final layout — never a spinner. Size each one to
 * the content it stands in for, so the page doesn't jump when data lands.
 *
 * Uses the `skeleton-shimmer` utility from `globals.css`, which stops under
 * `prefers-reduced-motion`.
 *
 * @example <Skeleton className="h-6 w-3/5" />
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="skeleton"
			aria-hidden="true"
			className={cn("skeleton-shimmer rounded-control", className)}
			{...props}
		/>
	);
}

export { Skeleton };

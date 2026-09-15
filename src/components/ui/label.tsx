"use client";

import * as React from "react";
import { Label as LabelPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

/**
 * A form label. Always above its field, never a placeholder standing in for one —
 * a placeholder disappears the moment a student starts typing.
 *
 * `text-body` (16px) semibold, per section 3 of the design system.
 */
function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
	return (
		<LabelPrimitive.Root
			data-slot="label"
			className={cn(
				"flex items-center gap-2 text-body font-semibold text-ink select-none",
				"group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:text-ink-3",
				"peer-disabled:cursor-not-allowed peer-disabled:text-ink-3",
				className,
			)}
			{...props}
		/>
	);
}

export { Label };

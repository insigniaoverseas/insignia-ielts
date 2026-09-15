"use client";

import * as React from "react";
import { CheckIcon, MinusIcon } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

/**
 * A checkbox. 18px with a 2px --color-ink-3 border, filling with brand when
 * checked — section 12 of the design system.
 *
 * The box itself is below the 48px tap minimum, so give it a label (or a
 * wrapping row) large enough to hit on a phone. In the Listening player, use
 * the `checkbox_n` widget instead — it has its own much larger target.
 *
 * `checked="indeterminate"` draws a dash, not a tick — used by a table's
 * "select all" when only some rows are selected. shadcn draws the same tick for
 * both, which tells an admin "everything is selected" right before a bulk action.
 */
function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
	return (
		<CheckboxPrimitive.Root
			data-slot="checkbox"
			className={cn(
				"peer group size-[18px] shrink-0 rounded-[4px] border-2 border-ink-3 bg-surface transition-colors",
				"data-[state=checked]:border-brand data-[state=checked]:bg-brand data-[state=checked]:text-white",
				"data-[state=indeterminate]:border-brand data-[state=indeterminate]:bg-brand data-[state=indeterminate]:text-white",
				"disabled:cursor-not-allowed disabled:border-line disabled:bg-bg",
				"aria-invalid:border-danger",
				className,
			)}
			{...props}
		>
			<CheckboxPrimitive.Indicator
				data-slot="checkbox-indicator"
				className="grid place-content-center text-current"
			>
				<CheckIcon className="size-3 group-data-[state=indeterminate]:hidden" strokeWidth={3} />
				<MinusIcon className="hidden size-3 group-data-[state=indeterminate]:block" strokeWidth={3} />
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	);
}

export { Checkbox };

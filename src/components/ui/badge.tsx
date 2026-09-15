import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

/*
 * Badge — shadcn/ui, restyled to the tokens (M0-03).
 * The "Listening · Mock test" tags on a test card (section 4 of the design).
 *
 * Tags are labels, not controls. For the toggleable chips in a table toolbar
 * use FilterChip, which is a button with `aria-pressed`.
 * For attempt state (Not started / In progress / Submitted …) use StatusPill,
 * and for Easy/Medium/Hard use DifficultyBadge — both encode meaning, where
 * this is a neutral label.
 */
const badgeVariants = cva(
	[
		"inline-flex w-fit shrink-0 items-center justify-center gap-2 whitespace-nowrap",
		"rounded-full border border-transparent px-3 py-1 text-small font-semibold",
		"transition-colors [&>svg]:pointer-events-none [&>svg]:size-4",
	],
	{
		variants: {
			variant: {
				/** A plain label: test type, batch name. */
				neutral: "border-line bg-bg text-ink-2 [a&]:hover:bg-surface",
				/** The skill tag — "Listening", "Reading". */
				brand: "bg-brand-soft text-brand [a&]:hover:bg-brand-line",
				success: "bg-success-soft text-success",
				warning: "bg-warning-soft text-warning",
				danger: "bg-danger-soft text-danger",
			},
		},
		defaultVariants: { variant: "neutral" },
	},
);

/**
 * A small rounded label.
 *
 * @param variant - `neutral` (default), `brand`, `success`, `warning` or `danger`.
 * @param asChild - Render as the child element, e.g. to make the chip a link.
 */
function Badge({
	className,
	variant = "neutral",
	asChild = false,
	...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
	const Comp = asChild ? Slot.Root : "span";

	return (
		<Comp
			data-slot="badge"
			data-variant={variant}
			className={cn(badgeVariants({ variant }), className)}
			{...props}
		/>
	);
}

export { Badge, badgeVariants };

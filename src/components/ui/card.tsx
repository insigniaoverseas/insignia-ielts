import * as React from "react";
import { cn } from "@/lib/utils";

/*
 * Card — shadcn/ui, restyled to the tokens (M0-03).
 *
 * ⚠️ A card has a 1px --color-line border and NO shadow. That is a stated rule
 * in the design system, not a default to override: --shadow-soft belongs to
 * modals, dropdowns and sticky bars only. shadcn ships `shadow-sm` here; it has
 * been removed deliberately. Don't add it back.
 */
function Card({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card"
			className={cn("flex flex-col gap-4 rounded-card border border-line bg-surface p-6", className)}
			{...props}
		/>
	);
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-header"
			className={cn(
				"grid auto-rows-min items-start gap-1",
				"has-data-[slot=card-action]:grid-cols-[1fr_auto]",
				className,
			)}
			{...props}
		/>
	);
}

/** The card's title. `text-h3` (17/24 600) — the design system's card-title size. */
function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
	return <div data-slot="card-title" className={cn("text-h3", className)} {...props} />;
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div data-slot="card-description" className={cn("text-body text-ink-2", className)} {...props} />
	);
}

/** An action pinned to the header's top-right — a link or a small button. */
function CardAction({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-action"
			className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
			{...props}
		/>
	);
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
	return <div data-slot="card-content" className={cn("flex flex-col gap-4", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-footer"
			className={cn("flex items-center gap-3 [.border-t]:border-line [.border-t]:pt-4", className)}
			{...props}
		/>
	);
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };

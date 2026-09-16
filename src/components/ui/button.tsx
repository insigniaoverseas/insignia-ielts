import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

/*
 * Button — shadcn/ui, restyled to the tokens (M0-03).
 *
 * Every value below comes from section 1 of "00 Design System.dc.html".
 * The size names are audiences, not t-shirts, because the height is a
 * usability decision rather than a taste one: students get 56px because the
 * player is used on a phone under time pressure; staff screens are denser.
 */
const buttonVariants = cva(
	[
		"inline-flex shrink-0 cursor-pointer items-center justify-center gap-3 whitespace-nowrap",
		"rounded-control text-body font-semibold transition-colors",
		// Focus: no outline utilities here, deliberately. The global :focus-visible
		// rule in globals.css draws the 2px brand ring. In Tailwind v4 `outline-none`
		// is `outline-style: none` in the utilities layer, which beats that base-layer
		// rule and would silently delete the ring for keyboard users.
		"disabled:pointer-events-none disabled:cursor-not-allowed",
		"[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
	],
	{
		variants: {
			variant: {
				primary: "bg-brand text-white hover:bg-brand-hover disabled:bg-line disabled:text-ink-3",
				secondary:
					"border border-line bg-surface text-ink hover:border-ink-3 disabled:border-line disabled:text-ink-3",
				ghost: "bg-transparent text-brand hover:bg-brand-soft disabled:text-ink-3",
				danger: "bg-danger text-white hover:bg-danger-hover disabled:bg-line disabled:text-ink-3",
				/** On a dark surface (the table bulk-action bar): the main action. */
				inverse: "bg-white text-ink hover:bg-line",
				/** On a dark surface: the other actions. */
				"inverse-secondary": "border border-ink-2 bg-transparent text-white hover:border-ink-3",
			},
			size: {
				/** 56px — student primary action. One per screen. */
				student: "h-primary px-8",
				/** 48px — inside a modal, where two actions sit side by side. */
				modal: "h-12 px-6",
				/** 40px — staff screens, table toolbars, pagination. */
				admin: "h-10 px-5",
				"icon-student": "size-primary px-0",
				"icon-admin": "size-10 px-0",
			},
			/**
			 * Loading sets the native `disabled` (so a double tap can't double-submit),
			 * but must not LOOK disabled — a grey button mid-submit reads as "broken".
			 * These override each variant's disabled colours back to its normal ones;
			 * tailwind-merge drops the earlier `disabled:` classes.
			 */
			loading: { true: "opacity-85", false: "" },
		},
		compoundVariants: [
			{ loading: true, variant: "primary", className: "disabled:bg-brand disabled:text-white" },
			{ loading: true, variant: "danger", className: "disabled:bg-danger disabled:text-white" },
			{ loading: true, variant: "secondary", className: "disabled:text-ink" },
			{ loading: true, variant: "ghost", className: "disabled:text-brand" },
		],
		defaultVariants: { variant: "primary", size: "admin", loading: false },
	},
);

/**
 * A button.
 *
 * @param variant - `primary` (one per screen), `secondary`, `ghost`, `danger`, or
 *   `inverse` / `inverse-secondary` on a dark surface such as the bulk-action bar.
 * @param size - `student` (56px), `modal` (48px) or `admin` (40px, the default).
 * @param loading - Shows a spinner and blocks interaction. The label stays put,
 *   so the button never changes width mid-submit.
 * @param asChild - Render as the single child element (e.g. a link) instead.
 *
 * @example <Button size="student">Start Test</Button>
 */
function Button({
	className,
	variant = "primary",
	size = "admin",
	asChild = false,
	loading = false,
	disabled,
	children,
	...props
}: React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
		loading?: boolean;
	}) {
	const Comp = asChild ? Slot.Root : "button";

	return (
		<Comp
			data-slot="button"
			data-variant={variant}
			data-size={size}
			data-loading={loading || undefined}
			aria-busy={loading || undefined}
			disabled={asChild ? undefined : disabled || loading}
			className={cn(buttonVariants({ variant, size, loading }), className)}
			{...props}
		>
			{/*
			 * `asChild` must pass Slot exactly ONE child. The spinner branch used
			 * to render `null` beside `children`, which Slot counts as two and
			 * rejects with "Expected a single React element child" — so every
			 * `asChild` call site threw. A link-shaped button never shows a
			 * spinner anyway: navigation is the browser's job, not ours.
			 */}
			{asChild ? (
				children
			) : (
				<>
					{loading ? <Spinner /> : null}
					{children}
				</>
			)}
		</Comp>
	);
}

/** The loading spinner. Calm, not frantic — 0.8s, matching the design's tone. */
function Spinner() {
	return (
		<span
			aria-hidden="true"
			className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70 motion-reduce:animate-none"
		/>
	);
}

export { Button, buttonVariants };

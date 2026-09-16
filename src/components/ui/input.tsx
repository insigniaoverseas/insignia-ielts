import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/*
 * Input — shadcn/ui, restyled to the tokens (M0-03).
 * Values from section 3 of "00 Design System.dc.html".
 *
 * Note the 16px font size is load-bearing, not cosmetic: iOS Safari zooms the
 * viewport on focus for anything smaller, which would wreck the test player.
 */
const inputVariants = cva(
	[
		"w-full min-w-0 rounded-control border border-line bg-surface px-4 text-body text-ink transition-colors",
		"placeholder:text-ink-3",
		// No `outline-none`: it would beat the global :focus-visible ring (see Button).
		"focus-visible:border-brand",
		"disabled:cursor-not-allowed disabled:bg-bg disabled:text-ink-3",
		// Error state is driven by aria-invalid, so the styling can never
		// disagree with what a screen reader announces.
		"aria-invalid:border-danger",
		"file:border-0 file:bg-transparent file:text-body file:font-semibold file:text-ink",
	],
	{
		variants: {
			size: {
				/** 56px — student-facing forms. */
				student: "h-primary",
				/** 40px — staff screens, table search. */
				admin: "h-10",
			},
			/** Digits that must not jitter as they change: phone, PIN, scores. */
			numeric: { true: "font-mono tabular-nums", false: "" },
		},
		defaultVariants: { size: "student", numeric: false },
	},
);

/**
 * A text input.
 *
 * @param size - `student` (56px, the default) or `admin` (40px).
 * @param numeric - Render in IBM Plex Mono with tabular figures.
 *
 * Pass `aria-invalid` to show the error state; pair it with a message element
 * referenced by `aria-describedby` rather than colour alone.
 */
function Input({
	className,
	type,
	size,
	numeric,
	...props
}: Omit<React.ComponentProps<"input">, "size"> & VariantProps<typeof inputVariants>) {
	return (
		<input
			type={type}
			data-slot="input"
			className={cn(inputVariants({ size, numeric }), className)}
			{...props}
		/>
	);
}

/**
 * An Indian mobile number field: a fixed `+91` chip beside the input.
 *
 * The country code is not editable — every student is in India, and a free-text
 * country code is a support call waiting to happen.
 */
function PhoneInput({
	className,
	size = "student",
	...props
}: Omit<React.ComponentProps<"input">, "size" | "type"> & {
	/**
	 * `student` (56px, the default) or `admin` (40px). Staff type phone numbers
	 * too — on the invite form — and a 56px field beside 40px ones reads as a
	 * mistake, so the prefix chip follows the field's height.
	 */
	size?: "student" | "admin";
}) {
	return (
		<div className="flex gap-2">
			<span
				aria-hidden="true"
				className={cn(
					"grid min-w-16 place-items-center rounded-control border border-line bg-bg px-4 font-mono text-body font-medium text-ink",
					size === "admin" ? "h-10" : "h-primary",
				)}
			>
				+91
			</span>
			<Input
				type="tel"
				inputMode="numeric"
				autoComplete="tel-national"
				numeric
				size={size}
				className={cn("flex-1", className)}
				{...props}
			/>
		</div>
	);
}

export { Input, PhoneInput, inputVariants };

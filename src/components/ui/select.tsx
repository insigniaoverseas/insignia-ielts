"use client";

import * as React from "react";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

/*
 * Select — shadcn/ui, restyled to the tokens (M0-03).
 *
 * The trigger matches Input exactly (height, border, radius, focus, error), so a
 * form mixing the two reads as one system.
 *
 * Not for the Listening/Reading answer widgets: `dropdown_bank` has its own
 * component with a larger target and the answer-state styling.
 */

function Select({ ...props }: React.ComponentProps<typeof SelectPrimitive.Root>) {
	return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectGroup({ ...props }: React.ComponentProps<typeof SelectPrimitive.Group>) {
	return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue({ ...props }: React.ComponentProps<typeof SelectPrimitive.Value>) {
	return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

/**
 * The closed select.
 *
 * @param size - `student` (56px, the default) or `admin` (40px) — same as Input.
 */
function SelectTrigger({
	className,
	size = "student",
	children,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & { size?: "student" | "admin" }) {
	return (
		<SelectPrimitive.Trigger
			data-slot="select-trigger"
			data-size={size}
			className={cn(
				"flex w-full cursor-pointer items-center justify-between gap-2 rounded-control border border-line bg-surface px-4 text-body text-ink whitespace-nowrap transition-colors",
				"focus-visible:border-brand", // ring from the global :focus-visible rule — no outline-none
				"data-[size=student]:h-primary data-[size=admin]:h-10",
				"data-[placeholder]:text-ink-3",
				"disabled:cursor-not-allowed disabled:bg-bg disabled:text-ink-3",
				"aria-invalid:border-danger",
				"*:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2",
				"[&_svg]:pointer-events-none [&_svg]:shrink-0",
				className,
			)}
			{...props}
		>
			{children}
			<SelectPrimitive.Icon asChild>
				<ChevronDownIcon className="size-5 text-ink-2" />
			</SelectPrimitive.Icon>
		</SelectPrimitive.Trigger>
	);
}

function SelectContent({
	className,
	children,
	position = "popper",
	align = "start",
	...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
	return (
		<SelectPrimitive.Portal>
			<SelectPrimitive.Content
				data-slot="select-content"
				className={cn(
					"relative z-50 max-h-(--radix-select-content-available-height) min-w-32 origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto",
					"rounded-control border border-line bg-surface text-ink shadow-soft",
					"data-[state=open]:animate-in data-[state=open]:fade-in-0",
					"data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
					position === "popper" &&
						"data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
					className,
				)}
				position={position}
				align={align}
				{...props}
			>
				<SelectScrollUpButton />
				<SelectPrimitive.Viewport
					className={cn(
						"p-1",
						position === "popper" &&
							"h-(--radix-select-trigger-height) w-full min-w-(--radix-select-trigger-width) scroll-my-1",
					)}
				>
					{children}
				</SelectPrimitive.Viewport>
				<SelectScrollDownButton />
			</SelectPrimitive.Content>
		</SelectPrimitive.Portal>
	);
}

function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) {
	return (
		<SelectPrimitive.Label
			data-slot="select-label"
			className={cn("px-3 py-2 text-small font-semibold text-ink-2", className)}
			{...props}
		/>
	);
}

/** One option. 48px tall — the tap-target minimum. */
function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
	return (
		<SelectPrimitive.Item
			data-slot="select-item"
			className={cn(
				"relative flex min-h-touch w-full cursor-pointer items-center gap-2 rounded-[6px] py-2 pr-10 pl-3 text-body outline-hidden select-none",
				"focus:bg-brand-soft focus:text-ink",
				"data-[state=checked]:font-semibold",
				"data-[disabled]:pointer-events-none data-[disabled]:text-ink-3",
				className,
			)}
			{...props}
		>
			<span
				data-slot="select-item-indicator"
				className="absolute right-3 flex size-5 items-center justify-center text-brand"
			>
				<SelectPrimitive.ItemIndicator>
					<CheckIcon className="size-5" />
				</SelectPrimitive.ItemIndicator>
			</span>
			<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
		</SelectPrimitive.Item>
	);
}

function SelectSeparator({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Separator>) {
	return (
		<SelectPrimitive.Separator
			data-slot="select-separator"
			className={cn("pointer-events-none -mx-1 my-1 h-px bg-line", className)}
			{...props}
		/>
	);
}

function SelectScrollUpButton({
	className,
	...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
	return (
		<SelectPrimitive.ScrollUpButton
			data-slot="select-scroll-up-button"
			className={cn("flex cursor-default items-center justify-center py-1 text-ink-2", className)}
			{...props}
		>
			<ChevronUpIcon className="size-5" />
		</SelectPrimitive.ScrollUpButton>
	);
}

function SelectScrollDownButton({
	className,
	...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
	return (
		<SelectPrimitive.ScrollDownButton
			data-slot="select-scroll-down-button"
			className={cn("flex cursor-default items-center justify-center py-1 text-ink-2", className)}
			{...props}
		>
			<ChevronDownIcon className="size-5" />
		</SelectPrimitive.ScrollDownButton>
	);
}

export {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectScrollDownButton,
	SelectScrollUpButton,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
};

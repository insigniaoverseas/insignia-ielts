"use client";

import * as React from "react";
import { XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/*
 * Dialog — shadcn/ui, restyled to the tokens (M0-03).
 * Section 13 of "00 Design System.dc.html".
 *
 * ⚠️ The design rule for confirmations: the destructive action is the
 * SECONDARY-styled button, never the primary one. A student mis-tapping a
 * bright red "Submit" they didn't read is exactly the failure this prevents.
 * `ConfirmDialog` below encodes that so nobody has to remember it.
 */

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
	return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
	return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
	return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
	return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
	return (
		<DialogPrimitive.Overlay
			data-slot="dialog-overlay"
			className={cn(
				"fixed inset-0 z-50 bg-night/60",
				"data-[state=open]:animate-in data-[state=open]:fade-in-0",
				"data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
				className,
			)}
			{...props}
		/>
	);
}

/**
 * The dialog panel. 420px max, 12px radius, the one soft shadow.
 *
 * @param showCloseButton - The ✕ in the corner. Turn it off for a decision the
 *   user must actually make (the submit confirmation in the player).
 */
function DialogContent({
	className,
	children,
	showCloseButton = true,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { showCloseButton?: boolean }) {
	return (
		<DialogPortal data-slot="dialog-portal">
			<DialogOverlay />
			<DialogPrimitive.Content
				data-slot="dialog-content"
				className={cn(
					"fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 flex-col gap-4",
					"rounded-card bg-surface p-6 shadow-soft outline-none duration-200",
					"data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
					"data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
					className,
				)}
				{...props}
			>
				{children}
				{showCloseButton && (
					<DialogPrimitive.Close
						data-slot="dialog-close"
						className="absolute top-4 right-4 grid size-touch place-items-center rounded-control text-ink-2 transition-colors hover:bg-bg hover:text-ink"
					>
						<XIcon className="size-5" />
						<span className="sr-only">Close</span>
					</DialogPrimitive.Close>
				)}
			</DialogPrimitive.Content>
		</DialogPortal>
	);
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
	return <div data-slot="dialog-header" className={cn("flex flex-col gap-2", className)} {...props} />;
}

/** The action row. Buttons are 48px and share the width equally. */
function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="dialog-footer"
			className={cn("flex flex-wrap gap-3 [&>*]:min-w-30 [&>*]:flex-1", className)}
			{...props}
		/>
	);
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
	return <DialogPrimitive.Title data-slot="dialog-title" className={cn("text-h2", className)} {...props} />;
}

function DialogDescription({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
	return (
		<DialogPrimitive.Description
			data-slot="dialog-description"
			className={cn("text-body text-ink-2", className)}
			{...props}
		/>
	);
}

/**
 * A confirmation dialog, with the design system's button ordering baked in.
 *
 * @param title - Ask the question plainly, and name the blast radius:
 *   "Extend 28 students by 3 months?", not "Are you sure?".
 * @param destructive - When true the confirm button is `secondary`-styled and
 *   the cancel button is `primary`, so the safe choice is the prominent one.
 *
 * @example
 * <ConfirmDialog
 *   open={open} onOpenChange={setOpen}
 *   title="Submit your answers?"
 *   description="You have 3 questions unanswered. You cannot come back to this test."
 *   confirmLabel="Yes, submit" cancelLabel="Keep working" destructive
 *   onConfirm={submit}
 * />
 */
function ConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel = "Yes, continue",
	cancelLabel = "Cancel",
	destructive = false,
	loading = false,
	onConfirm,
}: {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	title: string;
	description?: React.ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
	destructive?: boolean;
	loading?: boolean;
	onConfirm: () => void;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent showCloseButton={false}>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{description ? <DialogDescription>{description}</DialogDescription> : null}
				</DialogHeader>
				<DialogFooter>
					<Button
						size="modal"
						variant={destructive ? "secondary" : "primary"}
						loading={loading}
						onClick={onConfirm}
					>
						{confirmLabel}
					</Button>
					<DialogClose asChild>
						<Button size="modal" variant={destructive ? "primary" : "secondary"}>
							{cancelLabel}
						</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export {
	ConfirmDialog,
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
	DialogTrigger,
};

"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { signOutAction } from "@/lib/actions/auth";

/**
 * Log out, behind a confirm dialog (screen 13).
 *
 * Logging out is not destructive, but on a shared lab machine it is the action
 * a student takes by accident and then cannot undo without typing their password
 * again — so it asks first, and names what will happen.
 *
 * The work happens in `signOutAction`, which revokes the `user_sessions` row
 * before clearing the cookies. Doing it client-side would leave the row live,
 * and the row is what revocation actually reads.
 *
 * @param variant - Button style. Staff sidebars use `ghost`; the student
 *   Profile keeps `secondary`, where it is the only control on the card.
 * @param size - `student` (56px) on the student side, `admin` (40px) for staff.
 */
export function LogOutButton({
	variant = "secondary",
	size = "student",
	className = "w-full",
}: {
	variant?: React.ComponentProps<typeof Button>["variant"];
	size?: React.ComponentProps<typeof Button>["size"];
	className?: string;
}) {
	const [open, setOpen] = useState(false);
	const [pending, startTransition] = useTransition();

	return (
		<>
			<Button variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
				Log out
			</Button>
			<ConfirmDialog
				open={open}
				onOpenChange={setOpen}
				destructive
				loading={pending}
				title="Log out of this device?"
				description="You'll need your email and password to get back in. Your answers and results are saved."
				confirmLabel="Yes, log out"
				cancelLabel="Stay logged in"
				// The dialog stays open, showing its spinner, until the redirect
				// lands. Closing it first would flash the page they are leaving.
				onConfirm={() => startTransition(async () => void (await signOutAction()))}
			/>
		</>
	);
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";

/**
 * Log out, behind a confirm dialog (screen 13).
 *
 * Logging out is not destructive, but on a shared lab machine it is the action
 * a student takes by accident and then cannot undo without typing their password
 * again — so it asks first, and names what will happen.
 *
 * The sign-out Server Action lands with M1; until then this only closes the
 * dialog, which is why `onConfirm` is a no-op rather than a fake redirect.
 */
export function LogOutButton() {
	const [open, setOpen] = useState(false);

	return (
		<>
			<Button variant="secondary" size="student" className="w-full" onClick={() => setOpen(true)}>
				Log out
			</Button>
			<ConfirmDialog
				open={open}
				onOpenChange={setOpen}
				destructive
				title="Log out of this device?"
				description="You'll need your email and password to get back in. Your answers and results are saved."
				confirmLabel="Yes, log out"
				cancelLabel="Stay logged in"
				onConfirm={() => setOpen(false)}
			/>
		</>
	);
}

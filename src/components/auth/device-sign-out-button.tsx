"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { signOutDeviceAction } from "@/lib/actions/auth";

/**
 * "Sign out" beside one of your *other* devices — on the student Profile
 * (M1-14) and on staff My account (M10-12).
 *
 * Asks first, naming the device, because the likeliest one to sign out is the
 * lab computer — and a student who signs that out mid-lesson has to type their
 * password again. A test running there is not lost: answers are saved, and
 * the clock is the server's.
 *
 * The list refreshes from the server once it's done (`revalidatePath`), so the
 * row disappears rather than being hidden here.
 */
export function DeviceSignOutButton({
	sessionId,
	label,
	note = "Whoever is using it will need your email and password to get back in. Your answers and results are saved.",
}: {
	sessionId: string;
	label: string;
	/** What happens to whoever is using it. Students and staff lose different things. */
	note?: string;
}) {
	const [open, setOpen] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	return (
		<div className="flex flex-col items-end gap-1">
			<Button variant="secondary" size="modal" onClick={() => setOpen(true)}>
				Sign out
			</Button>
			{message && (
				<p className="m-0 text-small font-semibold text-danger" role="alert">
					{message}
				</p>
			)}
			<ConfirmDialog
				open={open}
				onOpenChange={setOpen}
				destructive
				loading={pending}
				title={`Sign out of ${label}?`}
				description={note}
				confirmLabel="Yes, sign it out"
				cancelLabel="Keep it signed in"
				onConfirm={() =>
					startTransition(async () => {
						const result = await signOutDeviceAction(sessionId);
						setMessage(result.ok ? null : result.message);
						setOpen(false);
					})
				}
			/>
		</div>
	);
}

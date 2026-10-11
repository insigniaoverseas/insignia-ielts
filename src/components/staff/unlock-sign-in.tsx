"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { unlockStudentSignInAction } from "@/lib/actions/students";

/**
 * "Locked out until 4:35 pm" and an Unlock button, for a student who typed the
 * wrong password too many times. The login screen tells them to ask their
 * teacher; this is what the teacher presses.
 *
 * No confirmation step: unlocking only gives the student back the five tries
 * they had, it changes nothing else, and the person asking is standing there.
 *
 * @param lockedUntilLabel - When the lock would lift on its own, already in
 *   `Asia/Kolkata` — computed on the server, never from this browser's clock.
 * @param revalidate - The page to refresh afterwards, so the label goes.
 */
export function UnlockSignIn({
	studentId,
	lockedUntilLabel,
	revalidate,
}: {
	studentId: string;
	lockedUntilLabel: string;
	revalidate: string;
}) {
	const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
	const [pending, startTransition] = useTransition();

	if (message?.ok) {
		return (
			<p className="m-0 text-small font-semibold text-success" role="status">
				{message.text}
			</p>
		);
	}

	return (
		<div className="flex flex-col items-start gap-1.5">
			<div className="flex flex-wrap items-center gap-2">
				<StatusPill status="locked" size="sm" label={`Locked out until ${lockedUntilLabel}`} />
				<Button
					variant="secondary"
					loading={pending}
					onClick={() =>
						startTransition(async () => {
							const result = await unlockStudentSignInAction(studentId, revalidate);
							setMessage(result ? { ok: result.ok, text: result.message } : null);
						})
					}
				>
					Unlock sign-in
				</Button>
			</div>
			{message && !message.ok && (
				<p className="m-0 text-small font-semibold text-danger" role="status">
					{message.text}
				</p>
			)}
		</div>
	);
}

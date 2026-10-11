"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { signOutOtherDevicesAction } from "@/lib/actions/auth";

/**
 * "Sign out everywhere else" on staff My account (M10-12). Keeps this browser
 * signed in and closes every other one — a forgotten lab PC in one tap.
 */
export function SignOutEverywhereElse({ others }: { others: number }) {
	const [open, setOpen] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	return (
		<div className="flex flex-col items-start gap-1.5">
			<Button variant="secondary" onClick={() => setOpen(true)}>
				Sign out everywhere else
			</Button>
			{message && (
				<p className="m-0 text-small font-semibold text-success" role="status">
					{message}
				</p>
			)}
			<ConfirmDialog
				open={open}
				onOpenChange={setOpen}
				destructive
				loading={pending}
				title={others === 1 ? "Sign out of your other device?" : `Sign out of your ${others} other devices?`}
				description="This computer stays signed in. Anywhere else will need your email and password to get back in."
				confirmLabel="Yes, sign them out"
				cancelLabel="Keep them signed in"
				onConfirm={() =>
					startTransition(async () => {
						const result = await signOutOtherDevicesAction();
						setMessage(result?.message ?? null);
						setOpen(false);
					})
				}
			/>
		</div>
	);
}

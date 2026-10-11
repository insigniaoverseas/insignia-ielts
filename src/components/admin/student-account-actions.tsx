"use client";

import { useState, useTransition } from "react";

import { SendSignInCode } from "@/components/staff/send-sign-in-code";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changeStudentPhoneAction, sendStudentResetAction } from "@/lib/actions/students";

/**
 * Screen 23's account buttons (M5-05): send a password reset link, change
 * the phone number, and email a sign-in code (M10-10). Each dialog says what will happen before it does,
 * and the result is shown on the page afterwards.
 */
export function StudentAccountActions({ studentId, email }: { studentId: string; email: string }) {
	const [open, setOpen] = useState<"reset" | "phone" | null>(null);
	const [phone, setPhone] = useState("");
	const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
	const [pending, startTransition] = useTransition();

	function run(action: () => Promise<{ ok: boolean; message: string } | null>) {
		startTransition(async () => {
			const result = await action();
			setOpen(null);
			setPhone("");
			setMessage(result ? { ok: result.ok, text: result.message } : null);
		});
	}

	return (
		<div className="flex flex-col items-end gap-2">
			<div className="flex flex-wrap gap-3">
				<Button variant="secondary" onClick={() => setOpen("reset")}>
					Send a password reset link
				</Button>
				<Button variant="secondary" onClick={() => setOpen("phone")}>
					Change phone number
				</Button>
				<SendSignInCode studentId={studentId} />
			</div>
			{message && (
				<p className={`m-0 text-small font-semibold ${message.ok ? "text-success" : "text-danger"}`} role="status">
					{message.text}
				</p>
			)}

			<ConfirmDialog
				open={open === "reset"}
				onOpenChange={(o) => setOpen(o ? "reset" : null)}
				loading={pending}
				title="Send them a password reset link?"
				description={`An email goes to ${email} with a link to choose a new password. It works for one hour. Their current password keeps working until they use it.`}
				confirmLabel="Send the link"
				cancelLabel="Cancel"
				onConfirm={() => run(() => sendStudentResetAction(studentId))}
			/>

			<ConfirmDialog
				open={open === "phone"}
				onOpenChange={(o) => setOpen(o ? "phone" : null)}
				loading={pending}
				title="Change their phone number"
				description={
					<span className="flex flex-col gap-1.5">
						<Label htmlFor="new-phone">New mobile number</Label>
						<Input
							id="new-phone"
							size="admin"
							inputMode="tel"
							autoComplete="off"
							value={phone}
							onChange={(e) => setPhone(e.target.value)}
							placeholder="98765 43210"
						/>
					</span>
				}
				confirmLabel={phone.trim() ? "Save the number" : "Type the number first"}
				cancelLabel="Cancel"
				onConfirm={() => {
					if (phone.trim()) run(() => changeStudentPhoneAction(studentId, phone));
				}}
			/>
		</div>
	);
}

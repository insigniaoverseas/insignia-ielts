"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { sendStudentSignInCodeAction } from "@/lib/actions/students";

/**
 * "Email a sign-in code" (M10-10). Sends the student six numbers they read on
 * their own phone and type on the sign-in screen — no password, and no email
 * opened on a lab PC.
 *
 * No confirmation step: it only sends the student an email, and the person
 * asking is usually standing there. What happened is said underneath.
 */
export function SendSignInCode({ studentId, size = "admin" }: { studentId: string; size?: "admin" | "compact" }) {
	const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
	const [pending, startTransition] = useTransition();

	return (
		<div className="flex flex-col items-start gap-1.5">
			<Button
				variant={size === "compact" ? "ghost" : "secondary"}
				loading={pending}
				onClick={() =>
					startTransition(async () => {
						const result = await sendStudentSignInCodeAction(studentId);
						setMessage(result ? { ok: result.ok, text: result.message } : null);
					})
				}
			>
				{pending ? "Sending…" : "Email a sign-in code"}
			</Button>
			{message && (
				<p className={`m-0 max-w-sm text-small font-semibold ${message.ok ? "text-success" : "text-danger"}`} role="status">
					{message.text}
				</p>
			)}
		</div>
	);
}

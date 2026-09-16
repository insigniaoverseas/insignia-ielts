"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordResetAction } from "@/lib/actions/auth";
import type { ResetRequestState } from "@/lib/actions/types";

/**
 * Ask for a reset link (M1-15).
 *
 * **The confirmation is the same whether or not the account exists.** That is
 * not vagueness for its own sake: the login screen already refuses to say which
 * addresses are real, and a reset form that said would hand back exactly the
 * list it protects (`MVP-1.md` §8).
 *
 * The screen replaces itself with that confirmation rather than leaving the
 * form up, so nobody sits there pressing the button wondering whether it worked.
 */
export function ForgotPasswordForm() {
	const [state, formAction] = useActionState<ResetRequestState, FormData>(requestPasswordResetAction, null);

	if (state?.sent) {
		return (
			<>
				<Banner tone="success">{state.message}</Banner>
				<p className="m-0 text-center text-ink-2">
					Check your spam folder if it isn&rsquo;t there in a minute. Still nothing?{" "}
					<strong className="font-semibold text-ink">Ask your teacher</strong> — they can send you a new
					invitation.
				</p>
				<Button size="student" variant="secondary" asChild>
					<Link href="/login">Back to sign in</Link>
				</Button>
			</>
		);
	}

	return (
		<form action={formAction} className="flex flex-col gap-5 rounded-card border border-line bg-surface p-6">
			<div className="flex flex-col gap-1.5">
				<Label htmlFor="email">Your email</Label>
				<Input
					id="email"
					name="email"
					type="email"
					autoComplete="username"
					autoCapitalize="off"
					required
					aria-invalid={state?.message ? true : undefined}
				/>
				<span className="text-small text-ink-2">The one your invitation was sent to.</span>
			</div>

			{state?.message && !state.sent && (
				<p className="m-0 flex items-start gap-2 font-semibold text-danger" role="alert">
					<span aria-hidden="true">✕</span>
					<span>{state.message}</span>
				</p>
			)}

			<SubmitButton />

			<Button variant="secondary" size="student" asChild>
				<Link href="/login">Back to sign in</Link>
			</Button>
		</form>
	);
}

/** Separate so `useFormStatus` reports on the form above it, not the whole page. */
function SubmitButton() {
	const { pending } = useFormStatus();
	return (
		<Button type="submit" size="student" disabled={pending}>
			{pending ? "Sending…" : "Send me a link"}
		</Button>
	);
}

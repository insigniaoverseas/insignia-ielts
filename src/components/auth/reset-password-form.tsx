"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completePasswordResetAction } from "@/lib/actions/auth";
import { PASSWORD_RULES } from "@/lib/auth/password";
import type { ResetFormState } from "@/lib/actions/types";

/**
 * Choose a new password (M1-15).
 *
 * Same shape as `SetPasswordForm` and for the same reasons — rules printed
 * before you type, show/hide rather than a confirm field, one shared definition
 * in `lib/auth/password.ts` so the screen cannot promise what the server
 * refuses.
 *
 * Kept as a separate component rather than a prop on that one: they post to
 * different actions, and the copy differs in a way that matters. Accepting an
 * invitation is a welcome; this is a recovery, and it ends by warning that
 * every device gets signed out.
 */
export function ResetPasswordForm({ token }: { token: string }) {
	const [state, formAction] = useActionState<ResetFormState, FormData>(completePasswordResetAction, null);
	const [password, setPassword] = useState("");
	const [show, setShow] = useState(false);

	const checks = PASSWORD_RULES.map((rule) => ({ label: rule.label, ok: rule.test(password) }));
	const ready = checks.every((c) => c.ok);

	return (
		<form action={formAction} className="flex flex-col gap-5 rounded-card border border-line bg-surface p-6">
			<input type="hidden" name="token" value={token} />

			<div className="flex flex-col gap-1.5">
				<div className="flex items-center justify-between gap-3">
					<Label htmlFor="password">Choose a new password</Label>
					<button
						type="button"
						onClick={() => setShow((s) => !s)}
						className="min-h-touch cursor-pointer font-semibold text-brand"
					>
						{show ? "Hide" : "Show"}
					</button>
				</div>
				<Input
					id="password"
					name="password"
					type={show ? "text" : "password"}
					autoComplete="new-password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					required
				/>
			</div>

			<ul className="m-0 flex list-none flex-col gap-1.5 p-0">
				{checks.map((c) => (
					<li key={c.label} className={`flex items-center gap-2 ${c.ok ? "text-success" : "text-ink-2"}`}>
						<span aria-hidden="true">{c.ok ? "✓" : "○"}</span>
						{c.label}
						<span className="sr-only">{c.ok ? " — done" : " — not yet"}</span>
					</li>
				))}
			</ul>

			{state?.message && (
				<p className="m-0 flex items-start gap-2 font-semibold text-danger" role="alert">
					<span aria-hidden="true">✕</span>
					<span>{state.message}</span>
				</p>
			)}

			<SubmitButton ready={ready} />

			{/* Said before it happens, not discovered afterwards: a student who is
			    signed in on a lab machine should know it is about to log out. */}
			<p className="m-0 text-small text-ink-2">
				Saving this signs you out everywhere, on every device. You&rsquo;ll sign back in with the new password.
			</p>
		</form>
	);
}

/** Separate so `useFormStatus` reports on the form above it, not the whole page. */
function SubmitButton({ ready }: { ready: boolean }) {
	const { pending } = useFormStatus();
	return (
		<Button type="submit" size="student" disabled={!ready || pending}>
			{pending ? "Saving…" : "Save my new password"}
		</Button>
	);
}

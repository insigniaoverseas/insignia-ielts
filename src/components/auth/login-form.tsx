"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInAction } from "@/lib/actions/auth";
import { formatTime } from "@/lib/time";
import type { LoginFormState } from "@/lib/actions/types";

/**
 * Screen 01's form (M1-08).
 *
 * A client component only because it needs `useActionState` to show what came
 * back. The decision about whether the credentials were right is entirely the
 * server's; nothing here is a check, it is all presentation.
 *
 * The three deliberate absences — no signup link, no per-field error, no
 * self-serve reset — are documented on the page that renders this.
 */
export function LoginForm({ next }: { next?: string }) {
	const [state, formAction] = useActionState<LoginFormState, FormData>(signInAction, null);
	const locked = Boolean(state?.lockedUntil);

	return (
		<>
			{locked && (
				<Banner tone="danger">
					Too many tries. You can sign in again after{" "}
					<strong className="font-semibold">{formatTime(state!.lockedUntil!)}</strong>. If you need to get in
					now, ask your teacher.
				</Banner>
			)}

			<form action={formAction} className="flex flex-col gap-5 rounded-card border border-line bg-surface p-6">
				{next && <input type="hidden" name="next" value={next} />}

				<div className="flex flex-col gap-1.5">
					<Label htmlFor="email">Email</Label>
					<Input
						id="email"
						name="email"
						type="email"
						autoComplete="username"
						autoCapitalize="off"
						required
						disabled={locked}
						aria-invalid={state?.message ? true : undefined}
					/>
				</div>

				<div className="flex flex-col gap-1.5">
					<Label htmlFor="password">Password</Label>
					<Input
						id="password"
						name="password"
						type="password"
						autoComplete="current-password"
						required
						disabled={locked}
						aria-invalid={state?.message ? true : undefined}
					/>
				</div>

				{state?.message && !locked && (
					<p className="m-0 flex items-start gap-2 font-semibold text-danger" role="alert">
						<span aria-hidden="true">✕</span>
						<span>
							{state.message}
							{state.triesLeft !== null && state.triesLeft > 0 && (
								<span className="block font-normal">
									{state.triesLeft === 1 ? "1 try left" : `${state.triesLeft} tries left`} before this
									account is locked for a while.
								</span>
							)}
						</span>
					</p>
				)}

				<SubmitButton locked={locked} />
			</form>
		</>
	);
}

/** Separate so `useFormStatus` reports on the form above it, not the whole page. */
function SubmitButton({ locked }: { locked: boolean }) {
	const { pending } = useFormStatus();
	return (
		<Button type="submit" size="student" disabled={locked || pending}>
			{pending ? "Signing in…" : "Sign in"}
		</Button>
	);
}

"use client";

import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Turnstile } from "@/components/auth/turnstile";
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
 * Each error sits under the box it is about (M10-11): "no account with this
 * email" under Email, "that password isn't right" and the tries left under
 * Password. The typed email survives a wrong password.
 */
export function LoginForm({ next, turnstileSiteKey }: { next?: string; turnstileSiteKey: string }) {
	const [state, formAction] = useActionState<LoginFormState, FormData>(signInAction, null);
	const locked = Boolean(state?.lockedUntil);
	const emailWrong = !locked && state?.field === "email";
	const passwordWrong = !locked && state?.field === "password";

	return (
		<>
			{locked && (
				<Banner tone="danger">
					Too many tries. You can sign in again after{" "}
					<strong className="font-semibold">{formatTime(state!.lockedUntil!)}</strong>. To get in now,{" "}
					<Link href={next ? `/login/code?next=${encodeURIComponent(next)}` : "/login/code"} className="font-semibold underline">
						sign in with a code from your email
					</Link>
					, or ask your teacher.
				</Banner>
			)}

			<form action={formAction} className="flex flex-col gap-5 rounded-card border border-line bg-surface p-6">
				{next && <input type="hidden" name="next" value={next} />}

				<div className="flex flex-col gap-1.5">
					<Label htmlFor="email">Email</Label>
					<Input
						key={state?.email ?? ""}
						id="email"
						name="email"
						type="email"
						autoComplete="username"
						autoCapitalize="off"
						defaultValue={state?.email ?? ""}
						required
						disabled={locked}
						aria-invalid={emailWrong ? true : undefined}
						aria-describedby={emailWrong ? "login-error" : undefined}
					/>
					{emailWrong && <ErrorLine text={state!.message} />}
				</div>

				<div className="flex flex-col gap-1.5">
					<Label htmlFor="password">Password</Label>
					<Input
						id="password"
						name="password"
						type="password"
						autoComplete="current-password"
						required
						autoFocus={passwordWrong}
						disabled={locked}
						aria-invalid={passwordWrong ? true : undefined}
						aria-describedby={passwordWrong ? "login-error" : undefined}
					/>
					{passwordWrong && (
						<ErrorLine text={state!.message}>
							{state!.triesLeft !== null && state!.triesLeft > 0 && (
								<span className="block font-normal">
									{state!.triesLeft === 1 ? "1 try left" : `${state!.triesLeft} tries left`} before this
									account is locked for a while.{" "}
									<Link href="/forgot" className="font-semibold underline">
										Forgotten it?
									</Link>
								</span>
							)}
						</ErrorLine>
					)}
				</div>

				{state?.message && !locked && !emailWrong && !passwordWrong && <ErrorLine text={state.message} />}
				<Turnstile siteKey={turnstileSiteKey} action="login" resetKey={state?.message} />

				<SubmitButton locked={locked} />
			</form>
		</>
	);
}

/** Separate so `useFormStatus` reports on the form above it, not the whole page. */
function SubmitButton({ locked }: { locked: boolean }) {
	const { pending } = useFormStatus();
	return (
		<Button type="submit" size="student" disabled={locked} loading={pending}>
			{pending ? "Signing in…" : "Sign in"}
		</Button>
	);
}

/** One error, said in words, under the box it is about. */
function ErrorLine({ text, children }: { text: string; children?: ReactNode }) {
	return (
		<p id="login-error" className="m-0 flex items-start gap-2 font-semibold text-danger" role="alert">
			<span aria-hidden="true">✕</span>
			<span>
				{text}
				{children}
			</span>
		</p>
	);
}

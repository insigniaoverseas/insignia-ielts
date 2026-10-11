"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestSignInCodeAction, signInWithCodeAction } from "@/lib/actions/auth";
import type { SignInCodeState } from "@/lib/actions/types";
import { Icon } from "@/components/ui/icon";

/**
 * Sign in with an emailed code (M10-10), in two steps on one screen: your
 * email, then the six numbers. One obvious action at each step.
 *
 * The code is read on the student's own phone and typed here, so they never
 * sign into email on a lab PC. Errors say what is wrong (M10-11) — no account
 * with that email, a wrong code, or one that has run out.
 */
export function SignInCodeForm({ next }: { next?: string }) {
	const [requested, requestAction] = useActionState<SignInCodeState, FormData>(requestSignInCodeAction, null);
	const [checked, checkAction] = useActionState<SignInCodeState, FormData>(signInWithCodeAction, null);
	const [changingEmail, setChangingEmail] = useState(false);

	const email = requested?.email ?? "";
	const onCodeStep = Boolean(requested?.sent) && !changingEmail;

	if (!onCodeStep) {
		return (
			<form
				action={(formData) => {
					setChangingEmail(false);
					requestAction(formData);
				}}
				className="flex flex-col gap-5 rounded-card border border-line bg-surface p-6"
			>
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="email">Your email</Label>
					<Input
						id="email"
						name="email"
						type="email"
						autoComplete="username"
						autoCapitalize="off"
						defaultValue={email}
						required
						aria-invalid={requested?.error ? true : undefined}
					/>
					<span className="text-small text-ink-2">
						We&rsquo;ll email you 6 numbers. Read them on your phone and type them here.
					</span>
				</div>

				{requested?.error && requested.message && <ErrorLine text={requested.message} />}

				<SubmitButton idle="Email me a code" busy="Sending…" />

				<Button variant="secondary" size="student" asChild>
					<Link href="/login">Back to sign in</Link>
				</Button>
			</form>
		);
	}

	return (
		<>
			<Banner tone={requested?.error ? "danger" : "success"}>{requested?.message}</Banner>

			<form action={checkAction} className="flex flex-col gap-5 rounded-card border border-line bg-surface p-6">
				<input type="hidden" name="email" value={email} />
				{next && <input type="hidden" name="next" value={next} />}

				<div className="flex flex-col gap-1.5">
					<Label htmlFor="code">The code from your email</Label>
					<Input
						id="code"
						name="code"
						inputMode="numeric"
						autoComplete="one-time-code"
						pattern="[0-9 \-]*"
						maxLength={7}
						placeholder="123 456"
						className="text-center font-mono text-h2 tracking-widest"
						required
						autoFocus
						aria-invalid={checked?.error ? true : undefined}
					/>
					<span className="text-small text-ink-2">Sent to {email}</span>
				</div>

				{checked?.error && checked.message && <ErrorLine text={checked.message} />}

				<SubmitButton idle="Sign In" busy="Signing in…" />
			</form>

			<form action={requestAction} className="flex flex-col gap-3">
				<input type="hidden" name="email" value={email} />
				<ResendButton />
				<Button variant="ghost" size="student" type="button" onClick={() => setChangingEmail(true)}>
					Use a different email
				</Button>
			</form>
		</>
	);
}

function ErrorLine({ text }: { text: string }) {
	return (
		<p className="m-0 flex items-start gap-2 font-semibold text-danger" role="alert">
			<Icon name="alert" />
			<span>{text}</span>
		</p>
	);
}

/** Separate so `useFormStatus` reports on the form above it, not the whole page. */
function SubmitButton({ idle, busy }: { idle: string; busy: string }) {
	const { pending } = useFormStatus();
	return (
		<Button type="submit" size="student" loading={pending}>
			{pending ? busy : idle}
		</Button>
	);
}

function ResendButton() {
	const { pending } = useFormStatus();
	return (
		<Button type="submit" variant="secondary" size="student" loading={pending}>
			{pending ? "Sending…" : "Send a new code"}
		</Button>
	);
}

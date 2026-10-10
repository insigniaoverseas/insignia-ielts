"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePasswordAction } from "@/lib/actions/auth";
import { PASSWORD_RULES } from "@/lib/auth/password";
import type { ChangePasswordState } from "@/lib/actions/types";

/**
 * Change my password, from Profile.
 *
 * `ResetPasswordForm` plus one box: the current password, because being signed
 * in on a shared lab machine does not prove who is typing. The rules come from
 * the same `lib/auth/password.ts` the server enforces, and one Show button
 * reveals both boxes rather than giving each its own.
 *
 * On success the form is replaced by the confirmation and a way back — there
 * is nothing left to do on this screen.
 */
export function ChangePasswordForm() {
	const [state, formAction] = useActionState<ChangePasswordState, FormData>(changePasswordAction, null);
	const [current, setCurrent] = useState("");
	const [password, setPassword] = useState("");
	const [show, setShow] = useState(false);

	if (state?.ok) {
		return (
			<div className="flex flex-col gap-5 rounded-card border border-line bg-surface p-6">
				<p className="m-0 flex items-start gap-2 font-semibold text-success" role="status">
					<span aria-hidden="true">✓</span>
					<span>{state.message}</span>
				</p>
				<Button size="student" asChild>
					<Link href="/profile">Back to my profile</Link>
				</Button>
			</div>
		);
	}

	const checks = PASSWORD_RULES.map((rule) => ({ label: rule.label, ok: rule.test(password) }));
	const ready = current.length > 0 && checks.every((c) => c.ok);
	const error = (field: "current" | "password") =>
		state && !state.ok && state.field === field ? (
			<p id={`${field}-error`} className="m-0 flex items-start gap-2 font-semibold text-danger" role="alert">
				<span aria-hidden="true">✕</span>
				<span>{state.message}</span>
			</p>
		) : null;

	return (
		<form action={formAction} className="flex flex-col gap-5 rounded-card border border-line bg-surface p-6">
			<div className="flex flex-col gap-1.5">
				<div className="flex items-center justify-between gap-3">
					<Label htmlFor="current">Your current password</Label>
					<button
						type="button"
						onClick={() => setShow((s) => !s)}
						className="min-h-touch cursor-pointer font-semibold text-brand"
					>
						{show ? "Hide" : "Show"}
					</button>
				</div>
				<Input
					id="current"
					name="current"
					type={show ? "text" : "password"}
					autoComplete="current-password"
					value={current}
					onChange={(e) => setCurrent(e.target.value)}
					aria-invalid={state?.field === "current" || undefined}
					aria-describedby={state?.field === "current" ? "current-error" : undefined}
					required
				/>
				{error("current")}
			</div>

			<div className="flex flex-col gap-1.5">
				<Label htmlFor="password">Your new password</Label>
				<Input
					id="password"
					name="password"
					type={show ? "text" : "password"}
					autoComplete="new-password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					aria-invalid={state?.field === "password" || undefined}
					aria-describedby={state?.field === "password" ? "password-error" : undefined}
					required
				/>
				{error("password")}
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

			{state && !state.ok && !state.field && (
				<p className="m-0 flex items-start gap-2 font-semibold text-danger" role="alert">
					<span aria-hidden="true">✕</span>
					<span>{state.message}</span>
				</p>
			)}

			<SubmitButton ready={ready} />

			<p className="m-0 text-small text-ink-2">
				You&rsquo;ll stay signed in here. Anywhere else you&rsquo;re signed in will be signed out.
			</p>
		</form>
	);
}

/** Separate so `useFormStatus` reports on the form above it, not the whole page. */
function SubmitButton({ ready }: { ready: boolean }) {
	const { pending } = useFormStatus();
	return (
		<Button type="submit" size="student" disabled={!ready} loading={pending}>
			{pending ? "Saving…" : "Save my new password"}
		</Button>
	);
}

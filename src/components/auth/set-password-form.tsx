"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptInvitationAction } from "@/lib/actions/auth";
import { PASSWORD_RULES } from "@/lib/auth/password";
import type { AcceptFormState } from "@/lib/actions/types";

/**
 * Set a password while accepting an invitation (M1-06).
 *
 * Two deliberate choices:
 *
 * - **The rules are printed before you type**, and tick as you satisfy them.
 *   A student meeting this screen once should not discover the requirements by
 *   failing them.
 * - **A show/hide toggle, not a "confirm password" field.** Retyping catches
 *   typos by accident; being able to read what you typed catches them on
 *   purpose, and on a phone keyboard it is far less frustrating.
 *
 * The rules come from `lib/auth/password.ts`, which the Server Action imports
 * too — so this screen can never promise something the server then rejects.
 * The server also checks against known-breached passwords, which is the check
 * that catches `password1` (Supabase leaked-password protection, M1-01).
 */
export function SetPasswordForm({ token, email }: { token: string; email: string }) {
	const [state, formAction] = useActionState<AcceptFormState, FormData>(acceptInvitationAction, null);
	const [password, setPassword] = useState("");
	const [show, setShow] = useState(false);

	const checks = PASSWORD_RULES.map((rule) => ({ label: rule.label, ok: rule.test(password) }));
	const ready = checks.every((c) => c.ok);

	return (
		<form action={formAction} className="flex flex-col gap-5 rounded-card border border-line bg-surface p-6">
			<input type="hidden" name="token" value={token} />
			{/* Echoed so the action can sign them straight in afterwards, rather
			    than sending them to a login form to retype what they just chose. */}
			<input type="hidden" name="email" value={email} />

			<div className="flex flex-col gap-1.5">
				<div className="flex items-center justify-between gap-3">
					<Label htmlFor="password">Choose a password</Label>
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

			{/* The rules, before you need them — not as an error afterwards. */}
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

			<p className="m-0 text-small text-ink-2">
				Write it somewhere safe. If you forget it, your teacher has to send you a new invitation.
			</p>
		</form>
	);
}

/** Separate so `useFormStatus` reports on the form above it, not the whole page. */
function SubmitButton({ ready }: { ready: boolean }) {
	const { pending } = useFormStatus();
	return (
		<Button type="submit" size="student" disabled={!ready || pending}>
			{pending ? "Setting up…" : "Save my password and start"}
		</Button>
	);
}

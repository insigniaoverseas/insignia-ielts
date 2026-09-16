"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeFirstRunSetupAction } from "@/lib/actions/auth";
import type { FormState } from "@/lib/actions/types";

/**
 * First-run setup (M1-02 bootstrap).
 *
 * The only screen in the product that creates an account without an invitation,
 * and it can run exactly once: the database refuses any caller but the pinned
 * bootstrap account, and refuses outright once any user exists.
 *
 * It asks for as little as it can get away with. The centre's name and the
 * owner's name are both `NOT NULL` downstream and nobody else can supply them;
 * everything else about the institute is ordinary admin work afterwards.
 */
export function FirstRunForm({ email }: { email: string }) {
	const [state, formAction] = useActionState<FormState, FormData>(completeFirstRunSetupAction, null);

	return (
		<form action={formAction} className="flex flex-col gap-5 rounded-card border border-line bg-surface p-6">
			<div className="flex flex-col gap-1.5">
				<Label htmlFor="branchName">What is this centre called?</Label>
				<Input id="branchName" name="branchName" size="admin" required placeholder="Insignia — Karol Bagh" />
				<span className="text-small text-ink-2">
					Students see this on their invitation email and their account.
				</span>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label htmlFor="branchAddress">Address (optional)</Label>
				<Input id="branchAddress" name="branchAddress" size="admin" />
			</div>

			<div className="flex flex-col gap-1.5">
				<Label htmlFor="ownerName">Your full name</Label>
				<Input id="ownerName" name="ownerName" size="admin" required />
				<span className="text-small text-ink-2">
					Shown next to anything you do — invitations you send, marks you change.
				</span>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label htmlFor="phone">Your phone (optional)</Label>
				<Input id="phone" name="phone" size="admin" />
				<input type="hidden" name="countryCode" value="+91" />
			</div>

			<div className="flex flex-col gap-1.5">
				<Label htmlFor="email">Sign-in email</Label>
				{/* Read-only on purpose: it comes from the account that was created
				    by hand, and the server takes it from there regardless of what
				    this form sends. Shown so a wrong address is caught now. */}
				<Input id="email" value={email} size="admin" readOnly disabled />
			</div>

			{state && !state.ok && (
				<p className="m-0 flex items-start gap-2 font-semibold text-danger" role="alert">
					<span aria-hidden="true">✕</span>
					<span>{state.message}</span>
				</p>
			)}

			<SubmitButton />
		</form>
	);
}

/** Separate so `useFormStatus` reports on the form above it, not the whole page. */
function SubmitButton() {
	const { pending } = useFormStatus();
	return (
		<Button type="submit" size="admin" disabled={pending}>
			{pending ? "Setting up…" : "Finish setting up"}
		</Button>
	);
}

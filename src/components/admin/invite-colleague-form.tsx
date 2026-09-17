"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Input, PhoneInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteAction } from "@/lib/actions/invitations";
import type { FormState } from "@/lib/actions/types";
import type { BranchOption } from "@/lib/queries/batches";

/** A role this admin is allowed to invite, with what it actually grants. */
export type InvitableRole = {
	key: string;
	label: string;
	description: string;
};

/**
 * Screen 28a's form — invite a colleague (M5-04 + M1-02).
 *
 * The staff twin of `invite-student-form.tsx`, and deliberately not the same
 * component: a colleague has no batch and no plan, and gains a role that a
 * student's invitation cannot. Folding both into one form would mean four
 * fields hidden behind a role dropdown, which is how the wrong person gets
 * invited as the wrong thing.
 *
 * **The role list is passed in, already filtered.** The page asks
 * `canInviteRole` per role, so an admin without `admin:manage` is never offered
 * "Admin" at all. `inviteAction` then checks again for itself, because a Server
 * Action is a public endpoint — this list shapes the screen, it does not guard it.
 */
export function InviteColleagueForm({ roles, branches }: { roles: InvitableRole[]; branches: BranchOption[] }) {
	const [state, formAction] = useActionState<FormState, FormData>(inviteAction, null);
	const [roleKey, setRoleKey] = useState(roles[0]?.key ?? "");
	const role = roles.find((r) => r.key === roleKey);

	if (roles.length === 0) {
		return <Banner tone="danger">Your account can&rsquo;t invite colleagues. Ask the Owner to do it.</Banner>;
	}

	return (
		<>
			{state && <Banner tone={state.ok ? "success" : "danger"}>{state.message}</Banner>}

			<form
				key={state?.ok ? state.message : "invite-colleague"}
				action={formAction}
				className="flex flex-col gap-5 rounded-card border border-line bg-surface p-6"
			>
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="role">Role</Label>
					<select
						id="role"
						name="role"
						value={roleKey}
						onChange={(event) => setRoleKey(event.target.value)}
						aria-invalid={state?.field === "role" || undefined}
						className="h-10 rounded-control border border-line bg-surface px-3 text-body"
					>
						{roles.map((r) => (
							<option key={r.key} value={r.key}>
								{r.label}
							</option>
						))}
					</select>
					{/* What the role grants, in the admin's words rather than the
					    permission table's. Chosen here, this is the one decision on
					    the screen that is hard to undo later. */}
					{role && <span className="text-small text-ink-2">{role.description}</span>}
				</div>

				<div className="flex flex-col gap-1.5">
					<Label htmlFor="name">Full name</Label>
					<Input id="name" name="name" size="admin" required aria-invalid={state?.field === "name" || undefined} />
				</div>

				<div className="flex flex-col gap-1.5">
					<Label htmlFor="email">Work email</Label>
					<Input
						id="email"
						name="email"
						type="email"
						size="admin"
						required
						aria-invalid={state?.field === "email" || undefined}
					/>
					<span className="text-small text-ink-2">
						The invitation goes here, and it&rsquo;s how they sign in. Check it twice.
					</span>
				</div>

				<div className="flex flex-col gap-1.5">
					<Label htmlFor="phone">Phone number</Label>
					<PhoneInput id="phone" name="phone" size="admin" />
					<input type="hidden" name="countryCode" value="+91" />
					<span className="text-small text-ink-2">For contacting them. Not used to sign in.</span>
				</div>

				<div className="flex flex-col gap-1.5">
					<Label htmlFor="branch">Centre</Label>
					<select
						id="branch"
						name="branch"
						className="h-10 rounded-control border border-line bg-surface px-3 text-body"
					>
						{/* Blank means "the inviter's own centre", which is what an admin
						    who only has one will expect without being told. */}
						<option value="">Same centre as you</option>
						{branches.map((b) => (
							<option key={b.id} value={b.id}>
								{b.name}
							</option>
						))}
					</select>
				</div>

				<div className="flex flex-wrap gap-3">
					<SubmitButton />
					<Button variant="secondary" asChild>
						<Link href="/admin/users">Cancel</Link>
					</Button>
				</div>
			</form>
		</>
	);
}

/** Separate so `useFormStatus` reports on the form above it, not the whole page. */
function SubmitButton() {
	const { pending } = useFormStatus();
	return (
		<Button type="submit" disabled={pending}>
			{pending ? "Sending…" : "Send the invitation"}
		</Button>
	);
}

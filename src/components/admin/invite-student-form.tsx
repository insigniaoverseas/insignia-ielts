"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Input, PhoneInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteAction } from "@/lib/actions/invitations";
import type { BatchOption } from "@/lib/queries/batches";
import type { FormState } from "@/lib/actions/types";

/**
 * Screen 22a's form (M5-04 + M1-02).
 *
 * Called "Invite", not "Add", because that is literally what happens: there is
 * no public signup, so every account starts as an admin invitation
 * (`CLAUDE.md` rule 7). "Add student" would imply the account exists the moment
 * this is submitted, and it does not — the student still has to accept.
 *
 * On success the form clears itself by remounting through the `key`, so an
 * admin inviting a whole batch one at a time is not deleting the previous
 * person's details each round.
 */
export function InviteStudentForm({ batches }: { batches: BatchOption[] }) {
	const [state, formAction] = useActionState<FormState, FormData>(inviteAction, null);

	return (
		<>
			{state && (
				<Banner tone={state.ok ? "success" : "danger"}>{state.message}</Banner>
			)}

			<form
				key={state?.ok ? state.message : "invite"}
				action={formAction}
				className="flex flex-col gap-5 rounded-card border border-line bg-surface p-6"
			>
				<input type="hidden" name="role" value="student" />

				<div className="flex flex-col gap-1.5">
					<Label htmlFor="name">Full name</Label>
					<Input id="name" name="name" size="admin" required aria-invalid={state?.field === "name" || undefined} />
				</div>

				<div className="flex flex-col gap-1.5">
					<Label htmlFor="email">Email</Label>
					<Input
						id="email"
						name="email"
						type="email"
						size="admin"
						required
						aria-invalid={state?.field === "email" || undefined}
					/>
					{/* This used to read "phone — this is how they log in", from the
					    PIN design. Sign-in is email and password now, and telling an
					    admin otherwise would have them checking the wrong field. */}
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
					<Label htmlFor="batch">Batch</Label>
					<select
						id="batch"
						name="batch"
						className="h-10 rounded-control border border-line bg-surface px-3 text-body"
					>
						<option value="">No batch yet</option>
						{batches.map((b) => (
							<option key={b.id} value={b.id}>
								{b.name}
							</option>
						))}
					</select>
				</div>

				<div className="flex flex-wrap gap-4">
					<div className="flex min-w-[180px] flex-1 flex-col gap-1.5">
						<Label htmlFor="planStart">Plan starts</Label>
						<Input id="planStart" name="planStart" type="date" size="admin" />
						<span className="text-small text-ink-2">Leave blank to start the day they accept.</span>
					</div>
					<div className="flex min-w-[180px] flex-1 flex-col gap-1.5">
						<Label htmlFor="planMonths">Plan length</Label>
						<select
							id="planMonths"
							name="planMonths"
							defaultValue="3"
							className="h-10 rounded-control border border-line bg-surface px-3 text-body"
						>
							<option value="1">1 month</option>
							<option value="3">3 months</option>
							<option value="6">6 months</option>
							<option value="12">12 months</option>
						</select>
					</div>
				</div>

				<div className="flex flex-wrap gap-3">
					<SubmitButton />
					<Button variant="secondary" asChild>
						<Link href="/admin/students">Cancel</Link>
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

"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBatchAction } from "@/lib/actions/batches";
import type { FormState } from "@/lib/actions/types";
import type { BranchOption, TeacherOption } from "@/lib/queries/batches";

/**
 * Screen 25a's form — create a batch (M5-07).
 *
 * A batch is a class group: a name, when it runs, where, and who teaches it.
 * Screen 25 flags a batch with no teacher as broken, so the teacher picker is
 * on this form rather than being a second trip through an edit screen.
 *
 * @param branches Centres the admin may create in. One centre means no choice
 *   to make, so the field is not rendered at all.
 * @param teachers Active teachers and invigilators, for the picker.
 */
export function CreateBatchForm({
	branches,
	teachers,
	today,
}: {
	branches: BranchOption[];
	teachers: TeacherOption[];
	today: string;
}) {
	const [state, formAction] = useActionState<FormState, FormData>(createBatchAction, null);

	return (
		<>
			{state && !state.ok && <Banner tone="danger">{state.message}</Banner>}

			<form action={formAction} className="flex flex-col gap-5 rounded-card border border-line bg-surface p-6">
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="name">Batch name</Label>
					<Input
						id="name"
						name="name"
						size="admin"
						required
						placeholder="Morning — Jan 2026"
						aria-invalid={state?.field === "name" || undefined}
					/>
					<span className="text-small text-ink-2">
						Teachers and students both see this. Something like &ldquo;Morning &mdash; Jan 2026&rdquo; beats
						&ldquo;Batch 4&rdquo;.
					</span>
				</div>

				<div className="flex flex-wrap gap-4">
					<div className="flex min-w-[180px] flex-1 flex-col gap-1.5">
						<Label htmlFor="startsOn">Starts</Label>
						<Input
							id="startsOn"
							name="startsOn"
							type="date"
							size="admin"
							required
							defaultValue={today}
							aria-invalid={state?.field === "startsOn" || undefined}
						/>
					</div>
					<div className="flex min-w-[180px] flex-1 flex-col gap-1.5">
						<Label htmlFor="endsOn">Ends</Label>
						<Input
							id="endsOn"
							name="endsOn"
							type="date"
							size="admin"
							aria-invalid={state?.field === "endsOn" || undefined}
						/>
						<span className="text-small text-ink-2">Leave blank if it runs until you say otherwise.</span>
					</div>
				</div>

				{/* One centre is not a choice — rendering a select with a single
				    option only asks the admin to confirm what they already know. */}
				{branches.length > 1 && (
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="branch">Centre</Label>
						<select
							id="branch"
							name="branch"
							className="h-10 rounded-control border border-line bg-surface px-3 text-body"
							aria-invalid={state?.field === "branch" || undefined}
						>
							{branches.map((b) => (
								<option key={b.id} value={b.id}>
									{b.name}
								</option>
							))}
						</select>
					</div>
				)}

				<div className="flex flex-col gap-1.5">
					<Label htmlFor="teachers">Teacher</Label>
					{teachers.length === 0 ? (
						// Honest about why the field is empty, and where to fix it —
						// a disabled empty dropdown explains nothing.
						<p className="m-0 text-small text-ink-2">
							No teachers yet.{" "}
							<Link href="/admin/users/new" className="font-semibold">
								Invite a colleague
							</Link>{" "}
							first, or create the batch now and add them later.
						</p>
					) : (
						<>
							<select
								id="teachers"
								name="teachers"
								multiple
								size={Math.min(teachers.length, 5)}
								className="rounded-control border border-line bg-surface px-3 py-2 text-body"
								aria-invalid={state?.field === "teachers" || undefined}
							>
								{teachers.map((t) => (
									<option key={t.id} value={t.id}>
										{t.name}
									</option>
								))}
							</select>
							<span className="text-small text-ink-2">
								Optional now, but a batch with no teacher is flagged on the batch list. Hold Ctrl (or Cmd) to pick
								more than one.
							</span>
						</>
					)}
				</div>

				<div className="flex flex-wrap gap-3">
					<SubmitButton />
					<Button variant="secondary" asChild>
						<Link href="/admin/batches">Cancel</Link>
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
			{pending ? "Creating…" : "Create batch"}
		</Button>
	);
}

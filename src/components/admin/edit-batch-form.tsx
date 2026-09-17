"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateBatchAction } from "@/lib/actions/batches";
import type { FormState } from "@/lib/actions/types";
import type { TeacherOption } from "@/lib/queries/batches";
import type { BatchDetail } from "@/lib/view-models/admin";

/** What each status means, since "archived" and "finished" are easy to confuse. */
const STATUS_HELP: Record<string, string> = {
	active: "Running now. Tests can be assigned to it.",
	completed: "Finished teaching. Results stay readable; no new assignments.",
	archived: "Put away. Hidden from the everyday lists.",
};

/**
 * Screen 25b's form — edit a batch (M5-07).
 *
 * Every field the create form has except the centre, which is deliberately not
 * editable: moving a batch between centres would strand its students' RLS
 * visibility, and no screen asks for it. `updateBatch` reads the batch's own
 * branch and refuses a cross-centre edit regardless of what is posted.
 */
export function EditBatchForm({ batch, teachers }: { batch: BatchDetail; teachers: TeacherOption[] }) {
	const [state, formAction] = useActionState<FormState, FormData>(updateBatchAction, null);

	return (
		<>
			{state && <Banner tone={state.ok ? "success" : "danger"}>{state.message}</Banner>}

			<form action={formAction} className="flex flex-col gap-5 rounded-card border border-line bg-surface p-6">
				<input type="hidden" name="batchId" value={batch.id} />

				<div className="flex flex-col gap-1.5">
					<Label htmlFor="name">Batch name</Label>
					<Input
						id="name"
						name="name"
						size="admin"
						required
						defaultValue={batch.name}
						aria-invalid={state?.field === "name" || undefined}
					/>
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
							defaultValue={batch.startsOn}
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
							defaultValue={batch.endsOn ?? ""}
							aria-invalid={state?.field === "endsOn" || undefined}
						/>
						<span className="text-small text-ink-2">Leave blank if it runs until you say otherwise.</span>
					</div>
				</div>

				<div className="flex flex-col gap-1.5">
					<Label htmlFor="status">Status</Label>
					<select
						id="status"
						name="status"
						defaultValue={batch.status}
						className="h-10 rounded-control border border-line bg-surface px-3 text-body"
						aria-invalid={state?.field === "status" || undefined}
					>
						<option value="active">Active</option>
						<option value="completed">Finished</option>
						<option value="archived">Archived</option>
					</select>
					<span className="text-small text-ink-2">{STATUS_HELP[batch.status]}</span>
				</div>

				<div className="flex flex-col gap-1.5">
					<Label htmlFor="teachers">Teachers</Label>
					{teachers.length === 0 ? (
						<p className="m-0 text-small text-ink-2">
							No teachers at this centre yet.{" "}
							<Link href="/admin/users/new" className="font-semibold">
								Invite a colleague
							</Link>
							.
						</p>
					) : (
						<>
							<select
								id="teachers"
								name="teachers"
								multiple
								size={Math.min(teachers.length, 5)}
								defaultValue={batch.teacherIds}
								className="rounded-control border border-line bg-surface px-3 py-2 text-body"
								aria-invalid={state?.field === "teachers" || undefined}
							>
								{teachers.map((t) => (
									<option key={t.id} value={t.id}>
										{t.name}
									</option>
								))}
							</select>
							{/* Says it plainly, because "multiple select" is the control
							    most likely to lose an admin their co-teacher by accident. */}
							<span className="text-small text-ink-2">
								Whoever is highlighted teaches this batch. Hold Ctrl (or Cmd) to pick more than one, or to
								deselect.
							</span>
						</>
					)}
				</div>

				<div className="flex flex-wrap gap-3">
					<SubmitButton />
					<Button variant="secondary" asChild>
						<Link href="/admin/batches">Back to batches</Link>
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
			{pending ? "Saving…" : "Save changes"}
		</Button>
	);
}

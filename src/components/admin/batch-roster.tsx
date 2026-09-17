"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { addStudentsToBatchAction, removeStudentFromBatchAction } from "@/lib/actions/batches";
import type { FormState } from "@/lib/actions/types";
import type { StudentOption } from "@/lib/queries/batches";

/**
 * Screen 25b's roster — who is in this batch, and how they get in and out
 * (M5-07).
 *
 * Membership used to be settable only at the moment of invitation, which meant
 * a student in the wrong batch stayed there. Both directions now work at any
 * time, and neither deletes anything: leaving sets `left_at`, so a result
 * earned in this batch can still say which batch it was.
 *
 * The two ways in are a deliberate choice rather than an inference:
 *
 * - **Move** closes their other batches, which is what "promoted to Advanced"
 *   means and what keeps "which batch are they in?" answerable.
 * - **Also add** leaves those alone, for the student who really does attend a
 *   weekend course as well.
 */
export function BatchRoster({
	batchId,
	members,
	candidates,
}: {
	batchId: string;
	members: { id: string; name: string }[];
	candidates: StudentOption[];
}) {
	const [addState, addAction] = useActionState<FormState, FormData>(addStudentsToBatchAction, null);
	const [removeState, removeAction] = useActionState<FormState, FormData>(removeStudentFromBatchAction, null);
	const [mode, setMode] = useState<"promote" | "addon">("promote");

	const memberIds = new Set(members.map((m) => m.id));
	const addable = candidates.filter((c) => !memberIds.has(c.id));
	const state = addState ?? removeState;

	return (
		<div className="flex flex-col gap-5 rounded-card border border-line bg-surface p-6">
			<div className="flex flex-col gap-1">
				<h2 className="m-0 text-h3">Students ({members.length})</h2>
				<p className="m-0 text-small text-ink-2">
					Add or remove at any time. Removing keeps their results &mdash; it only takes them off the register.
				</p>
			</div>

			{state && <Banner tone={state.ok ? "success" : "danger"}>{state.message}</Banner>}

			{members.length === 0 ? (
				<p className="m-0 text-ink-2">Nobody in this batch yet.</p>
			) : (
				<ul className="m-0 flex list-none flex-col gap-0 p-0">
					{members.map((student) => (
						<li
							key={student.id}
							className="flex items-center justify-between gap-4 border-t border-line py-3 first:border-t-0"
						>
							<Link href={`/admin/students/${student.id}`} className="font-semibold">
								{student.name}
							</Link>
							<form action={removeAction}>
								<input type="hidden" name="batchId" value={batchId} />
								<input type="hidden" name="studentId" value={student.id} />
								<RemoveButton />
							</form>
						</li>
					))}
				</ul>
			)}

			{addable.length === 0 ? (
				<p className="m-0 border-t border-line pt-4 text-small text-ink-2">
					Every active student at this centre is already in this batch.{" "}
					<Link href="/admin/students/new" className="font-semibold">
						Invite a student
					</Link>
					.
				</p>
			) : (
				<form action={addAction} className="flex flex-col gap-4 border-t border-line pt-5">
					<input type="hidden" name="batchId" value={batchId} />
					<input type="hidden" name="mode" value={mode} />

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="students">Add students</Label>
						<select
							id="students"
							name="students"
							multiple
							size={Math.min(addable.length, 6)}
							className="rounded-control border border-line bg-surface px-3 py-2 text-body"
							aria-invalid={state?.field === "students" || undefined}
						>
							{addable.map((student) => (
								<option key={student.id} value={student.id}>
									{student.name}
									{student.batchNames.length > 0 && ` — currently in ${student.batchNames.join(", ")}`}
								</option>
							))}
						</select>
						<span className="text-small text-ink-2">Hold Ctrl (or Cmd) to pick more than one.</span>
					</div>

					<fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
						<legend className="mb-1 p-0 text-body font-semibold">
							If they&rsquo;re already in another batch
						</legend>
						<Choice
							name="mode"
							checked={mode === "promote"}
							onSelect={() => setMode("promote")}
							title="Move them here"
							detail="Takes them out of their other batches. Use this for a promotion."
						/>
						<Choice
							name="mode"
							checked={mode === "addon"}
							onSelect={() => setMode("addon")}
							title="Also add them here"
							detail="Keeps their other batches. Use this for an extra course."
						/>
					</fieldset>

					<div>
						<AddButton mode={mode} />
					</div>
				</form>
			)}
		</div>
	);
}

/** A labelled radio whose whole row is the target — easier than hitting the dot. */
function Choice({
	name,
	checked,
	onSelect,
	title,
	detail,
}: {
	name: string;
	checked: boolean;
	onSelect: () => void;
	title: string;
	detail: string;
}) {
	return (
		<label className="flex cursor-pointer items-start gap-3 rounded-control border border-line p-3 has-checked:border-brand has-checked:bg-brand-soft">
			<input
				type="radio"
				name={`${name}-choice`}
				checked={checked}
				onChange={onSelect}
				className="mt-1 size-4 shrink-0"
			/>
			<span className="flex flex-col gap-0.5">
				<span className="font-semibold">{title}</span>
				<span className="text-small text-ink-2">{detail}</span>
			</span>
		</label>
	);
}

/** Separate so `useFormStatus` reports on its own form. */
function AddButton({ mode }: { mode: "promote" | "addon" }) {
	const { pending } = useFormStatus();
	const label = mode === "promote" ? "Move into this batch" : "Add to this batch";
	return (
		<Button type="submit" disabled={pending}>
			{pending ? "Saving…" : label}
		</Button>
	);
}

/** Separate so one student's spinner does not disable the whole roster. */
function RemoveButton() {
	const { pending } = useFormStatus();
	return (
		<Button type="submit" variant="secondary" size="admin" disabled={pending}>
			{pending ? "Removing…" : "Remove"}
		</Button>
	);
}

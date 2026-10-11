"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { purgeBatchAction, removeBatchAction, restoreBatchAction } from "@/lib/actions/batches";
import { describePurge, planBatchRemoval, purgeConfirmed, type PurgePreview } from "@/lib/batch-removal";
import type { BatchDetail } from "@/lib/view-models/admin";

/**
 * The bottom of screen 25b (M10-14): **Remove batch**, or **Restore** for one
 * already removed.
 *
 * The confirm box says which kind of removal this will be — deleted for good,
 * or put away with its results kept — before anything happens. The server
 * decides again on the click (`removeBatch`), so a test assigned in the
 * meantime turns a delete into an archive.
 */
export function RemoveBatch({ batch, purge }: { batch: BatchDetail; purge: PurgePreview | null }) {
	return (
		<>
			<RemoveOrRestore batch={batch} />
			{/* A never-used batch is already deleted for good by Remove batch. */}
			{purge && batch.assignedTestCount > 0 && <DeletePermanently batch={batch} purge={purge} />}
		</>
	);
}

function RemoveOrRestore({ batch }: { batch: BatchDetail }) {
	const [open, setOpen] = useState(false);
	const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
	const [pending, startTransition] = useTransition();

	if (batch.status === "archived") {
		return (
			<section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-6">
				<h2 className="m-0 text-h3">This batch was removed</h2>
				<p className="m-0 text-ink-2">
					It&rsquo;s hidden from your lists and from teachers&rsquo; dashboards. Its results are kept.
				</p>
				<div>
					<Button
						variant="secondary"
						loading={pending}
						onClick={() =>
							startTransition(async () => {
								const result = await restoreBatchAction(batch.id);
								setMessage(result ? { ok: result.ok, text: result.message } : null);
							})
						}
					>
						Restore this batch
					</Button>
				</div>
				{message && (
					<p className={`m-0 text-small font-semibold ${message.ok ? "text-success" : "text-danger"}`} role="status">
						{message.text}
					</p>
				)}
			</section>
		);
	}

	const plan = planBatchRemoval(batch.name, batch.assignedTestCount, batch.students.length);
	return (
		<section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-6">
			<h2 className="m-0 text-h3">Remove this batch</h2>
			<p className="m-0 text-ink-2">
				{plan.kind === "delete"
					? "No tests were ever assigned to it, so removing it deletes it for good."
					: "Tests were assigned to it, so removing it hides it but keeps its results. You can restore it later."}
			</p>
			<div>
				<Button variant="danger" onClick={() => setOpen(true)}>
					Remove batch
				</Button>
			</div>
			{message && !message.ok && (
				<p className="m-0 text-small font-semibold text-danger" role="alert">
					{message.text}
				</p>
			)}
			<ConfirmDialog
				open={open}
				onOpenChange={setOpen}
				destructive
				loading={pending}
				title={plan.title}
				description={plan.description}
				confirmLabel={plan.confirmLabel}
				cancelLabel="Keep it"
				onConfirm={() =>
					startTransition(async () => {
						// On success the action redirects to the list; only a refusal returns.
						const result = await removeBatchAction(batch.id);
						if (result) setMessage({ ok: result.ok, text: result.message });
						setOpen(false);
					})
				}
			/>
		</section>
	);
}

/**
 * "Delete permanently" (M10-14) — for when a batch and everything done in it
 * should go: the batch, its assignments and their results. Tests in the
 * library are never touched. Typing the batch's name is the confirmation,
 * because this one cannot be undone.
 */
function DeletePermanently({ batch, purge }: { batch: BatchDetail; purge: PurgePreview }) {
	const [open, setOpen] = useState(false);
	const [typed, setTyped] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();
	const ready = purgeConfirmed(batch.name, typed);

	return (
		<section className="flex flex-col gap-3 rounded-card border border-danger/40 bg-surface p-6">
			<h2 className="m-0 text-h3">Delete permanently</h2>
			<p className="m-0 text-ink-2">
				Deletes this batch, its assignments and every result in them. The tests stay in the Test library.
			</p>
			<div>
				<Button variant="danger" onClick={() => setOpen(true)}>
					Delete permanently
				</Button>
			</div>
			{error && (
				<p className="m-0 text-small font-semibold text-danger" role="alert">
					{error}
				</p>
			)}
			<ConfirmDialog
				open={open}
				onOpenChange={(o) => {
					setOpen(o);
					if (!o) setTyped("");
				}}
				destructive
				loading={pending}
				title={`Delete ${batch.name} for good?`}
				description={
					<span className="flex flex-col gap-2">
						{describePurge(batch.name, purge).map((line) => (
							<span key={line}>{line}</span>
						))}
						<span className="mt-2 flex flex-col gap-1.5">
							<Label htmlFor="purge-name">
								Type <strong>{batch.name}</strong> to confirm
							</Label>
							<Input id="purge-name" size="admin" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
						</span>
					</span>
				}
				confirmLabel={ready ? "Delete everything" : "Type the name first"}
				cancelLabel="Keep it"
				onConfirm={() => {
					if (!ready) return;
					startTransition(async () => {
						// On success the action redirects to the list; only a refusal returns.
						const result = await purgeBatchAction(batch.id, typed);
						if (result && !result.ok) setError(result.message);
						setOpen(false);
						setTyped("");
					});
				}}
			/>
		</section>
	);
}

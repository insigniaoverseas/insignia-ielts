"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { removeBatchAction, restoreBatchAction } from "@/lib/actions/batches";
import { planBatchRemoval } from "@/lib/batch-removal";
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
export function RemoveBatch({ batch }: { batch: BatchDetail }) {
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

"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { StatusPill } from "@/components/ui/status-pill";
import { releaseResultsAction } from "@/lib/actions/assignments";
import type { AssignmentResults } from "@/lib/view-models/teacher";

/**
 * Screen 18's release control (M6-05): where these results stand, in one
 * sentence, and — while they are held — the one button that lets them out.
 *
 * One gate for the whole assignment (`assignments.results_released_at`), so
 * one action for everyone. It asks first: a band, once seen, cannot be
 * un-seen. A scheduled release can be brought forward from here.
 */
export function ReleasePanel({
	assignmentId,
	release,
	submitted,
}: {
	assignmentId: string;
	release: AssignmentResults["release"];
	/** How many have handed in — said in the confirm, so nobody releases to an empty room by mistake. */
	submitted: number;
}) {
	const [open, setOpen] = useState(false);
	const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
	const [pending, startTransition] = useTransition();

	const sentence = release.released
		? release.mode === "immediate"
			? "Students see their results as soon as they finish."
			: `Released${release.whenLabel ? ` on ${release.whenLabel}` : ""}. Students can see their band and their mistakes.`
		: release.mode === "scheduled"
			? `Held until ${release.whenLabel}. Students will see their band then.`
			: "Held. Students can't see their band until you release the results.";

	return (
		<section className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-line bg-surface p-6">
			<div className="flex flex-col gap-2">
				<StatusPill
					status={release.released ? "submitted" : "not_started"}
					size="sm"
					label={release.released ? "Results are out" : "Results are held"}
				/>
				<p className="m-0">{sentence}</p>
				{message && (
					<p className={`m-0 font-semibold ${message.ok ? "text-success" : "text-danger"}`} role="status">
						{message.text}
					</p>
				)}
			</div>

			{!release.released && (
				<Button onClick={() => setOpen(true)}>
					{release.mode === "scheduled" ? "Release now instead" : "Release results to everyone"}
				</Button>
			)}

			<ConfirmDialog
				open={open}
				onOpenChange={setOpen}
				loading={pending}
				title="Release these results now?"
				description={`Every student on this test will see their band and their mistakes straight away — ${submitted} ${
					submitted === 1 ? "has" : "have"
				} handed in so far, and anyone who finishes later sees theirs at once. You can't take this back.`}
				confirmLabel="Release them"
				cancelLabel="Not yet"
				onConfirm={() =>
					startTransition(async () => {
						const result = await releaseResultsAction(assignmentId);
						setOpen(false);
						setMessage(result ? { ok: result.ok, text: result.message } : null);
					})
				}
			/>
		</section>
	);
}

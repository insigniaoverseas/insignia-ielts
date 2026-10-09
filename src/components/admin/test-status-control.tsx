"use client";

import { useState, useTransition } from "react";

import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { publishTestAction, unpublishTestAction } from "@/lib/actions/test-status";
import type { FormState } from "@/lib/actions/types";

/**
 * Publish / back-to-draft for one test (M5-08). Two clicks, never one: the
 * first says what will happen, the second does it. The server re-checks the
 * permission and the test's completeness; this only asks.
 */
export function TestStatusControl({ testId, status }: { testId: string; status: string }) {
	const [confirming, setConfirming] = useState(false);
	const [result, setResult] = useState<FormState>(null);
	const [pending, startTransition] = useTransition();
	const published = status === "published";

	function run() {
		startTransition(async () => {
			setResult(await (published ? unpublishTestAction(testId) : publishTestAction(testId)));
			setConfirming(false);
		});
	}

	return (
		<div className="flex flex-col items-end gap-3">
			{confirming ? (
				<div className="flex flex-wrap items-center justify-end gap-3">
					<span className="text-ink-2">
						{published
							? "Move back to draft? Teachers won't be able to assign it."
							: "Publish? Teachers will be able to assign it to students."}
					</span>
					<Button variant="secondary" onClick={() => setConfirming(false)} disabled={pending}>
						Cancel
					</Button>
					<Button onClick={run} disabled={pending}>
						{pending ? "Working…" : published ? "Yes, move to draft" : "Yes, publish"}
					</Button>
				</div>
			) : published ? (
				<Button variant="secondary" onClick={() => setConfirming(true)}>
					Move back to draft
				</Button>
			) : (
				<Button onClick={() => setConfirming(true)}>Publish</Button>
			)}
			{result && <Banner tone={result.ok ? "info" : "warning"}>{result.message}</Banner>}
		</div>
	);
}

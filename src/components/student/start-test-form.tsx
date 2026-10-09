"use client";

import { useActionState } from "react";

import { Banner } from "@/components/ui/banner";
import { startAttemptAction } from "@/lib/actions/attempts";

/**
 * The pre-test screen's one primary action (M2-05 → M2-07). Starting is a
 * write — it creates the attempt and starts the server clock — so it is a
 * form post, never a link a browser might prefetch.
 */
export function StartTestForm({ refId, resume }: { refId: string; resume: boolean }) {
	const [state, action, pending] = useActionState(startAttemptAction, null);
	return (
		<form action={action} className="flex flex-col gap-3">
			<input type="hidden" name="ref" value={refId} />
			{state && <Banner tone="warning">{state.message}</Banner>}
			<button
				type="submit"
				disabled={pending}
				className="flex h-primary cursor-pointer items-center justify-center gap-2.5 rounded-control bg-brand text-h3 font-semibold text-white hover:bg-brand-hover disabled:opacity-70"
			>
				{pending ? "Starting…" : resume ? "Carry on with your test" : "I’m ready — Start"}
				<span aria-hidden="true">→</span>
			</button>
		</form>
	);
}

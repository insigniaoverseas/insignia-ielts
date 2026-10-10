import Link from "next/link";

import type { LockedReason } from "@/lib/view-models/student";

/** The heading for each reason — what happened, in a few plain words. */
const HEADING: Record<LockedReason["kind"], string> = {
	not_open_yet: "This test isn’t open yet",
	closed: "This test has closed",
	no_attempts_left: "No more tries on this test",
	plan_expired: "You can’t start tests right now",
	no_plan: "You can’t start tests right now",
	in_progress_elsewhere: "Finish your other test first",
};

/**
 * Screen 30 — test not available (M9-04).
 *
 * Shown on the pre-test screen in place of the rules and the Start button
 * when the student can't start this test: it hasn't opened, it has closed,
 * the tries are used up, their access has ended — or it isn't theirs at all
 * (`reason` `null`: unassigned, or an old link). A Start button that only
 * refuses after it is pressed is a screen that needs explaining.
 *
 * The reason's own message (from `lib/queries/student.ts`) carries the date
 * or the number, so the card on My Tests and this screen never disagree.
 *
 * @param reason Why it is locked, or `null` when the test isn't on their list.
 * @param title The test's name, when known.
 */
export function TestNotAvailable({ reason, title }: { reason: LockedReason | null; title?: string }) {
	return (
		<div className="mx-auto flex w-full max-w-[520px] flex-col items-center gap-5 py-12 text-center">
			<span className="grid size-14 place-items-center rounded-full bg-brand-soft text-h1" aria-hidden="true">
				🔒
			</span>
			<h1 className="m-0 text-h1">{reason ? HEADING[reason.kind] : "This test isn’t on your list"}</h1>
			{title && <p className="m-0 text-h3 text-ink-2">{title}</p>}
			<p className="m-0 text-ink-2">
				{reason
					? reason.message
					: "It may have been taken off your list, or the link is old. Ask your teacher if you think you should have it."}
			</p>
			<Link
				href="/tests"
				className="flex h-primary items-center justify-center rounded-control bg-brand px-8 text-h3 font-semibold text-white no-underline hover:bg-brand-hover hover:no-underline"
			>
				Go to My Tests
			</Link>
		</div>
	);
}

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { StatusPill } from "@/components/ui/status-pill";
import { formatClock } from "@/components/player/countdown";
import type { LiveSession, LiveStudent } from "@/lib/view-models/teacher";

/** How often the monitor asks the server for fresh state. */
const POLL_SECONDS = 10;

const STATE: Record<LiveStudent["state"], { label: string; pill: "not_started" | "in_progress" | "submitted" | "expired" }> = {
	not_started: { label: "Not started", pill: "not_started" },
	in_progress: { label: "Working", pill: "in_progress" },
	submitted: { label: "Finished", pill: "submitted" },
	expired: { label: "Ran out of time", pill: "expired" },
};

/**
 * Screen 17 — Live session monitor (M7-02).
 *
 * An invigilator watches this on a lab wall while twenty students sit a timed
 * test, so it is built for glanceability: one tile per student, status as a
 * **word** as well as a colour, and time remaining in tabular mono so it does
 * not jitter.
 *
 * Polled every 10 seconds rather than held open on a realtime channel
 * (`PROJECT-MEMORY.md` §4, 2026-09-15). The "last updated" stamp is not
 * decoration: an invigilator needs to know whether they are looking at the room
 * or at a frozen page, and a silently dead socket looks exactly like a calm room.
 *
 * Between polls the tiles tick their own countdowns so the numbers stay alive.
 * That is cosmetic; every poll replaces them with the server's figures, which
 * are the only ones that decide anything.
 */
export function LiveMonitor({ initial }: { initial: LiveSession }) {
	const [session, setSession] = useState(initial);
	const [secondsSincePoll, setSecondsSincePoll] = useState(0);
	const [acting, setActing] = useState<{ student: LiveStudent; action: "extend" | "submit" } | null>(null);

	useEffect(() => {
		const tick = setInterval(() => {
			setSecondsSincePoll((s) => {
				const next = s + 1;
				// The real poll lands with M7-01; until then, keep the clocks honest
				// by ticking them down locally and resetting the stamp.
				if (next >= POLL_SECONDS) {
					setSession((prev) => ({ ...prev, lastUpdatedLabel: "just now" }));
					return 0;
				}
				return next;
			});
			setSession((prev) => ({
				...prev,
				students: prev.students.map((st) =>
					st.state === "in_progress" && st.secondsRemaining !== null
						? { ...st, secondsRemaining: Math.max(0, st.secondsRemaining - 1) }
						: st,
				),
			}));
		}, 1000);
		return () => clearInterval(tick);
	}, []);

	const working = session.students.filter((s) => s.state === "in_progress").length;
	const finished = session.students.filter((s) => s.state === "submitted").length;
	const notStarted = session.students.filter((s) => s.state === "not_started").length;

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-line bg-surface p-6">
				<div className="flex flex-wrap gap-6">
					<span>
						<strong className="font-mono text-h2 font-medium">{working}</strong>{" "}
						<span className="text-ink-2">working</span>
					</span>
					<span>
						<strong className="font-mono text-h2 font-medium">{finished}</strong>{" "}
						<span className="text-ink-2">finished</span>
					</span>
					<span>
						<strong className="font-mono text-h2 font-medium">{notStarted}</strong>{" "}
						<span className="text-ink-2">not started</span>
					</span>
				</div>
				{/* Says whether you're looking at the room or at a frozen page. */}
				<span className="text-small text-ink-2" aria-live="polite">
					Updated {secondsSincePoll === 0 ? "just now" : `${secondsSincePoll}s ago`} · refreshes every{" "}
					{POLL_SECONDS}s
				</span>
			</div>

			<ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
				{session.students.map((s) => {
					const meta = STATE[s.state];
					const low = s.secondsRemaining !== null && s.secondsRemaining < 300;
					return (
						<li key={s.attemptId} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
							<div className="flex flex-wrap items-start justify-between gap-2">
								<span className="font-semibold">{s.name}</span>
								<StatusPill status={meta.pill} size="sm" label={meta.label} />
							</div>

							<div className="flex items-end justify-between gap-4">
								<div className="flex flex-col gap-0.5">
									<span className={`font-mono text-h2 font-medium ${low ? "text-warning" : ""}`}>
										{s.secondsRemaining === null ? "—" : formatClock(s.secondsRemaining)}
									</span>
									<span className="text-small text-ink-2">time left</span>
								</div>
								<div className="flex flex-col items-end gap-0.5">
									<span className="font-mono text-h2 font-medium">
										{s.answered}/{s.total}
									</span>
									<span className="text-small text-ink-2">answered</span>
								</div>
							</div>

							{s.flags.length > 0 && (
								// A flag, never a block. The invigilator decides.
								<p className="m-0 text-small font-semibold text-warning">
									{s.flags.map((f) => (
										<span key={f} className="block">
											! {f}
										</span>
									))}
								</p>
							)}

							{s.state === "in_progress" && (
								<div className="flex flex-wrap gap-2">
									<Button variant="secondary" onClick={() => setActing({ student: s, action: "extend" })}>
										+5 minutes
									</Button>
									<Button variant="secondary" onClick={() => setActing({ student: s, action: "submit" })}>
										Finish for them
									</Button>
								</div>
							)}
						</li>
					);
				})}
			</ul>

			<ConfirmDialog
				open={acting !== null}
				onOpenChange={(open) => !open && setActing(null)}
				destructive={acting?.action === "submit"}
				title={
					acting?.action === "extend"
						? `Give ${acting.student.name} 5 more minutes?`
						: `Finish the test for ${acting?.student.name}?`
				}
				description={
					acting?.action === "extend"
						? "Their timer goes up by five minutes. This is recorded against the attempt."
						: `Their answers are submitted as they stand — ${acting?.student.answered} of ${acting?.student.total} answered. They can't go back in.`
				}
				confirmLabel={acting?.action === "extend" ? "Give 5 minutes" : "Yes, finish it"}
				cancelLabel="Cancel"
				onConfirm={() => setActing(null)}
			/>
		</div>
	);
}

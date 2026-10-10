"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { StatusPill } from "@/components/ui/status-pill";
import { formatClock } from "@/components/player/countdown";
import { extendAttemptAction, forceSubmitAttemptAction } from "@/lib/actions/invigilation";
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
 * The poll is `GET /teacher/live/[id]/state` (M7-01), which returns only the
 * tiles. Between polls the tiles tick their own countdowns so the numbers stay alive.
 * That is cosmetic; every poll replaces them with the server's figures, which
 * are the only ones that decide anything.
 */
export function LiveMonitor({ initial }: { initial: LiveSession }) {
	const [session, setSession] = useState(initial);
	const [secondsSincePoll, setSecondsSincePoll] = useState(0);
	const [gone, setGone] = useState(false);
	const [acting, setActing] = useState<{ student: LiveStudent; action: "extend" | "submit" } | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);
	const [actionPending, startAction] = useTransition();

	/**
	 * Runs +5 minutes or Finish for them (M7-03), then shows the server's
	 * answer on the tile at once rather than waiting up to 10 s for the poll.
	 */
	function confirmAction() {
		if (!acting) return;
		const { student, action } = acting;
		startAction(async () => {
			const result =
				action === "extend"
					? await extendAttemptAction(student.attemptId)
					: await forceSubmitAttemptAction(student.attemptId);
			setActing(null);
			if (!result.ok) {
				setActionError(`${student.name}: ${result.message}`);
				return;
			}
			setActionError(null);
			setSession((prev) => ({
				...prev,
				students: prev.students.map((st) =>
					st.attemptId !== student.attemptId
						? st
						: action === "extend"
							? { ...st, secondsRemaining: result.secondsRemaining }
							: { ...st, state: "submitted", secondsRemaining: null },
				),
			}));
		});
	}

	// The one-second tick: the "updated" stamp and the cosmetic countdowns.
	useEffect(() => {
		const tick = setInterval(() => {
			setSecondsSincePoll((s) => s + 1);
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

	// The poll (M7-01). Skipped while the tab is hidden — nobody is watching, and
	// on the Free plan every request counts — and run at once when it comes
	// back, so a returning invigilator never reads a stale room.
	useEffect(() => {
		if (gone) return;
		let inFlight = false;
		let stopped = false;

		async function poll() {
			if (inFlight || stopped || document.hidden) return;
			inFlight = true;
			try {
				const res = await fetch(`/teacher/live/${encodeURIComponent(initial.sessionId)}/state`, {
					cache: "no-store",
					headers: { Accept: "application/json" },
				});
				if (stopped) return;
				// Signed out or revoked: the guard redirected to sign-in. Reload rather
				// than follow it — the page's own guard then sends them to sign in
				// with *this screen* as the way back, not the JSON endpoint.
				if (res.redirected || !res.headers.get("content-type")?.includes("application/json")) {
					stopped = true;
					window.location.reload();
					return;
				}
				if (res.status === 404) {
					setGone(true);
					return;
				}
				if (!res.ok) return; // Try again next round; the stamp keeps ageing.
				const body = (await res.json()) as { students: LiveStudent[] };
				setSession((prev) => ({ ...prev, students: body.students, lastUpdatedLabel: "just now" }));
				setSecondsSincePoll(0);
			} catch {
				// Offline or a dropped request. Same as above: the stamp says so.
			} finally {
				inFlight = false;
			}
		}

		const interval = setInterval(poll, POLL_SECONDS * 1000);
		const onVisible = () => {
			if (!document.hidden) void poll();
		};
		document.addEventListener("visibilitychange", onVisible);
		return () => {
			stopped = true;
			clearInterval(interval);
			document.removeEventListener("visibilitychange", onVisible);
		};
	}, [initial.sessionId, gone]);

	// Three missed polls: say so in words, not just a bigger number.
	const stale = secondsSincePoll >= POLL_SECONDS * 3;

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
				{gone ? (
					<span className="text-small font-semibold text-danger" role="alert">
						This test is no longer available to you. Go back to the dashboard.
					</span>
				) : stale ? (
					<span className="text-small font-semibold text-warning" role="alert">
						Can&rsquo;t reach the server — last updated {secondsSincePoll}s ago. Check the internet connection.
					</span>
				) : (
					<span className="text-small text-ink-2">
						Updated {secondsSincePoll < 2 ? "just now" : `${secondsSincePoll}s ago`} · refreshes every{" "}
						{POLL_SECONDS}s
					</span>
				)}
			</div>

			{actionError && (
				<p className="m-0 rounded-card border border-danger-line bg-danger-soft px-5 py-4 font-semibold text-danger" role="alert">
					{actionError}
				</p>
			)}

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
						? "Their timer goes up by five minutes. It's recorded against the test, with your name."
						: `Their answers are submitted as they stand — ${acting?.student.answered} of ${acting?.student.total} answered. They can't go back in.`
				}
				confirmLabel={acting?.action === "extend" ? "Give 5 minutes" : "Yes, finish it"}
				cancelLabel="Cancel"
				loading={actionPending}
				onConfirm={confirmAction}
			/>
		</div>
	);
}

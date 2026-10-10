"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { PlayerShell } from "@/components/player/player-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AnswerValue } from "@/components/player/question-group";
import { heartbeatAction, saveAnswerAction, submitAttemptAction } from "@/lib/actions/attempts";
import type { SaveAnswerInput } from "@/lib/actions/types";
import { dropAudio } from "@/lib/audio-cache";
import type { AttemptSession } from "@/lib/view-models/attempt";

/** How long typing must pause before a text answer is sent. */
const TYPING_PAUSE_MS = 1200;
/** How long to wait before retrying a save that failed in flight. */
const RETRY_MS = 5000;
/** How often the server clock and the session are re-checked (MVP-1 §4: 30 s). */
const HEARTBEAT_MS = 30_000;

type SaveStatus = "saved" | "saving" | "offline";

/**
 * Connects the presentational {@link PlayerShell} to the attempt's Server
 * Actions (M2-07): autosave on change, flags, and submit.
 *
 * - Choices save at once; typed answers after a short pause, so a word is one
 *   request, not one per letter (Workers Free counts requests).
 * - Every save carries a revision that only rises, and one control's saves go
 *   out one at a time (an answer and a flag on the same question share a
 *   queue entry), so the database never sees a newer save before an older one
 *   from this tab. Across two tabs it keeps the newer and refuses the older.
 * - A failed save is kept and retried; the student is told "Offline — keep
 *   working", never asked to do anything.
 * - Submit first sends everything still pending.
 *
 * Nothing here decides the deadline (M2-08). The countdown is drawn by the
 * shell and corrected from the server every 30 seconds, after every save, and
 * the moment a sleeping tab wakes. When it reaches zero the server is asked
 * first: if its clock still has time (a fast browser clock), the countdown is
 * corrected instead of submitting. The same check notices a session ended
 * elsewhere and sends the student to sign in.
 */
export function AttemptRunner({ session, firstRevision }: { session: AttemptSession; firstRevision: number }) {
	const revision = useRef(firstRevision);
	const pending = useRef(new Map<string, SaveAnswerInput>());
	const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
	const inFlight = useRef(0);
	/** Controls with a save on the wire; a newer value waits for it. */
	const busy = useRef(new Set<string>());
	const finishing = useRef(false);
	const [status, setStatus] = useState<SaveStatus>("saved");
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [clock, setClock] = useState<{ seconds: number; stamp: number }>();
	const [leaving, setLeaving] = useState(false);
	/** "Leave anyway" was tapped and My Tests is loading. */
	const [goingHome, startGoingHome] = useTransition();
	/** Handing in: from the tap (or time-up) until the result page loads or it fails. */
	const [submitting, setSubmitting] = useState(false);
	const correct = useCallback((seconds: number) => setClock({ seconds, stamp: Date.now() }), []);
	const router = useRouter();
	/** The latest `send`, for retry timers set before it was recreated. */
	const sendRef = useRef<(key: string) => Promise<void>>(async () => {});

	/** Control id → where it sits and how it is answered. */
	const controls = useMemo(() => {
		const map = new Map<string, { sectionNo: number; number: number; covers?: number[]; typed: boolean }>();
		for (const section of session.sections) {
			for (const group of section.groups) {
				const typed = group.widget === "text_gap" || (group.widget === "image_label" && !group.bank);
				for (const q of group.questions) {
					map.set(q.id, { sectionNo: section.number, number: q.number, covers: q.covers, typed });
				}
			}
		}
		return map;
	}, [session.sections]);

	/** The control that answers a question number — where its flag is saved. */
	const controlOf = useCallback(
		(questionNumber: number) =>
			[...controls.entries()].find(([, c]) => (c.covers ?? [c.number]).includes(questionNumber)),
		[controls],
	);

	const finish = useCallback(async () => {
		if (finishing.current) return;
		finishing.current = true;
		setSubmitting(true);
		// A mock or class recording must not stay replayable once handed in (§12).
		const cached = session.audio?.cache;
		if (cached?.dropAfterSubmit) await dropAudio(cached.key);
		const result = await submitAttemptAction(session.attemptId);
		// On success the action redirects and this line is never reached.
		finishing.current = false;
		setSubmitting(false);
		if (result && !result.ok) setSubmitError(result.message);
	}, [session.attemptId, session.audio]);

	/** Sends one queued save. Re-queues it on a network failure. */
	const send = useCallback(
		async (key: string) => {
			const input = pending.current.get(key);
			if (!input || busy.current.has(key)) return;
			pending.current.delete(key);
			busy.current.add(key);
			inFlight.current += 1;
			setStatus("saving");
			let retry = false;
			try {
				const result = await saveAnswerAction(input);
				if (result.ok) correct(result.secondsRemaining);
				if (!result.ok) {
					if (result.reason === "session_ended") {
						router.replace("/login?ended=1");
						return;
					}
					if (result.reason === "time_up" || result.reason === "closed") {
						void finish();
						return;
					}
					retry = result.reason === "error";
				}
			} catch {
				retry = true;
			} finally {
				inFlight.current -= 1;
				busy.current.delete(key);
			}
			if (retry) {
				// Keep it unless a newer value for the same control arrived meanwhile.
				if (!pending.current.has(key)) pending.current.set(key, input);
				setStatus("offline");
				timers.current.set(key, setTimeout(() => void sendRef.current(key), RETRY_MS));
				return;
			}
			// A newer value arrived while this one was on the wire: send it now.
			if (pending.current.has(key)) {
				void sendRef.current(key);
				return;
			}
			if (inFlight.current === 0 && pending.current.size === 0) setStatus("saved");
		},
		[correct, finish, router],
	);
	useEffect(() => {
		sendRef.current = send;
	}, [send]);

	/**
	 * Asks the server for the clock and the session. Seconds left; `null` once
	 * the attempt is closed; `undefined` when the server couldn't be reached.
	 */
	const check = useCallback(async (): Promise<number | null | undefined> => {
		try {
			const result = await heartbeatAction(session.attemptId);
			if (result.ok) {
				correct(result.secondsRemaining);
				return result.secondsRemaining;
			}
			if (result.reason === "session_ended") router.replace("/login?ended=1");
			if (result.reason === "time_up" || result.reason === "closed") return null;
		} catch {
			// Offline: keep drawing the clock; the next check corrects it.
		}
		return undefined;
	}, [correct, router, session.attemptId]);

	useEffect(() => {
		const timer = setInterval(() => {
			// Only a test someone is looking at checks in: for practice, a gap in
			// check-ins is how the server knows the student was away.
			if (document.visibilityState !== "visible") return;
			void check().then((left) => {
				if (left === null) void finish();
			});
		}, HEARTBEAT_MS);
		function onVisible() {
			if (document.visibilityState === "visible") {
				void check().then((left) => {
					if (left === null) void finish();
				});
			}
		}
		document.addEventListener("visibilitychange", onVisible);
		return () => {
			clearInterval(timer);
			document.removeEventListener("visibilitychange", onVisible);
		};
	}, [check, finish]);

	const queue = useCallback(
		(key: string, input: Omit<SaveAnswerInput, "revision" | "attemptId">, delay: number) => {
			revision.current += 1;
			const previous = pending.current.get(key);
			pending.current.set(key, {
				...previous,
				...input,
				attemptId: session.attemptId,
				revision: revision.current,
			});
			clearTimeout(timers.current.get(key));
			setStatus("saving");
			timers.current.set(key, setTimeout(() => void send(key), delay));
		},
		[send, session.attemptId],
	);

	const onSave = useCallback(
		(questionId: string, value: AnswerValue) => {
			const control = controls.get(questionId);
			if (!control) return;
			queue(
				questionId,
				{ sectionNo: control.sectionNo, number: control.number, covers: control.covers, value },
				control.typed ? TYPING_PAUSE_MS : 0,
			);
		},
		[controls, queue],
	);

	const onFlag = useCallback(
		(questionNumber: number, flagged: boolean) => {
			const found = controlOf(questionNumber);
			if (!found) return;
			const [id, control] = found;
			// Same queue entry as the control's answer, so neither overtakes the other.
			queue(
				id,
				{ sectionNo: control.sectionNo, number: control.number, covers: control.covers, flag: { qNumber: questionNumber, flagged } },
				0,
			);
		},
		[controlOf, queue],
	);

	/** Sends everything still waiting, then submits. */
	const onSubmit = useCallback(async (reason: "student" | "time") => {
		if (reason === "time") {
			// The drawn clock reached zero. The server decides whether it really did.
			const left = await check();
			if (typeof left === "number" && left > 0) return;
		}
		setSubmitting(true);
		for (const key of [...pending.current.keys()]) {
			clearTimeout(timers.current.get(key));
			await send(key);
		}
		// Let anything already on the wire land before closing the attempt.
		while (inFlight.current > 0) await new Promise((resolve) => setTimeout(resolve, 100));
		await finish();
	}, [check, finish, send]);

	// Back button: the clock doesn't stop, so leaving is never an accident. One
	// extra history entry means Back lands here first and asks.
	useEffect(() => {
		window.history.pushState({ testGuard: true }, "");
		function onBack() {
			window.history.pushState({ testGuard: true }, "");
			setLeaving(true);
		}
		window.addEventListener("popstate", onBack);
		return () => window.removeEventListener("popstate", onBack);
	}, []);

	// Leaving with unsaved typing: ask the browser to warn.
	useEffect(() => {
		function beforeUnload(event: BeforeUnloadEvent) {
			if (pending.current.size > 0 || inFlight.current > 0) event.preventDefault();
		}
		window.addEventListener("beforeunload", beforeUnload);
		return () => window.removeEventListener("beforeunload", beforeUnload);
	}, []);

	const statusLabel = (
		<span role="status" aria-live="polite" className={status === "offline" ? "text-warning" : "text-ink-2"}>
			{status === "saved" ? "Saved" : status === "saving" ? "Saving…" : "Offline — keep working"}
		</span>
	);

	return (
		<>
			{submitError && (
				<div role="alert" className="border-b border-danger-line bg-danger-soft px-4 py-3 md:px-8">
					{submitError}
				</div>
			)}
			<PlayerShell
				session={session}
				onSave={onSave}
				onFlag={onFlag}
				onSubmit={(reason) => void onSubmit(reason)}
				status={statusLabel}
				clock={clock}
				submitting={submitting}
			/>
			<Dialog open={leaving} onOpenChange={setLeaving}>
				<DialogContent showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>Leave the test?</DialogTitle>
						<DialogDescription>
							{session.mode === "practice"
								? "This is practice, so your time pauses while you're away. Your answers are saved, and you can carry on from My Tests."
								: "Your time keeps running while you're away. Your answers are saved, and you can carry on from My Tests."}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button size="modal" onClick={() => setLeaving(false)}>
							Stay in the test
						</Button>
						<Button
							size="modal"
							variant="secondary"
							loading={goingHome}
							onClick={() => startGoingHome(() => router.push("/tests"))}
						>
							Leave anyway
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

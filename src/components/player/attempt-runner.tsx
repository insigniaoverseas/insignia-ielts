"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PlayerShell } from "@/components/player/player-shell";
import type { AnswerValue } from "@/components/player/question-group";
import { saveAnswerAction, submitAttemptAction } from "@/lib/actions/attempts";
import type { SaveAnswerInput } from "@/lib/actions/types";
import type { AttemptSession } from "@/lib/view-models/attempt";

/** How long typing must pause before a text answer is sent. */
const TYPING_PAUSE_MS = 1200;
/** How long to wait before retrying a save that failed in flight. */
const RETRY_MS = 5000;

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
 * Nothing here decides the deadline. The countdown is drawn by the shell from
 * the server's `secondsRemaining`; if a save reports time is up, or the clock
 * reaches zero, the server is asked to close the attempt and it rules.
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
		const result = await submitAttemptAction(session.attemptId);
		// On success the action redirects and this line is never reached.
		finishing.current = false;
		if (result && !result.ok) setSubmitError(result.message);
	}, [session.attemptId]);

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
		[finish, router],
	);
	useEffect(() => {
		sendRef.current = send;
	}, [send]);

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
	const onSubmit = useCallback(async () => {
		for (const key of [...pending.current.keys()]) {
			clearTimeout(timers.current.get(key));
			await send(key);
		}
		// Let anything already on the wire land before closing the attempt.
		while (inFlight.current > 0) await new Promise((resolve) => setTimeout(resolve, 100));
		await finish();
	}, [finish, send]);

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
				onSubmit={() => void onSubmit()}
				status={statusLabel}
			/>
		</>
	);
}

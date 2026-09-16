"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AudioPlayer } from "@/components/player/audio-player";
import { Countdown } from "@/components/player/countdown";
import { QuestionNavigator, type NavQuestion } from "@/components/player/question-navigator";
import { QuestionGroupBlock, type AnswerValue } from "@/components/player/question-group";
import { ReadingSplit } from "@/components/player/reading-split";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AttemptSession } from "@/lib/view-models/attempt";

/**
 * The test player (M2-15 Listening, M3-01 Reading) — screens 06, 07 and the
 * submit dialog, 08.
 *
 * Three rules it exists to keep:
 *
 * 1. **The server owns the clock.** `secondsRemaining` arrives from the server
 *    and is ticked down here only to draw a timer. Reaching zero submits, but
 *    the submit endpoint decides whether time was actually up — a student whose
 *    laptop clock is wrong, or who slept the tab, is reconciled there, not here.
 * 2. **One audio file, never re-requested.** A single `<audio>` element lives
 *    at this component's root, above the section switch, so moving between
 *    sections cannot seek it or fetch it again (`MVP-1.md` D8).
 * 3. **Nothing is ever submitted blind.** Finishing opens a dialog naming every
 *    unanswered question as a chip you can jump to (screen 08).
 *
 * It holds answers in state and reports them upward through `onSave`. Scoring
 * happens on submit, on the server; nothing here knows a correct answer.
 */
export function PlayerShell({
	session,
	onSave,
	onSubmit,
}: {
	session: AttemptSession;
	/** Autosave. Fired per change, debounced by the caller. */
	onSave?: (questionId: string, value: AnswerValue) => void;
	/** Hand over to the submit Server Action. */
	onSubmit?: (reason: "student" | "time") => void;
}) {
	const [answers, setAnswers] = useState<Record<string, AnswerValue>>(session.answers);
	const [flagged, setFlagged] = useState<Set<number>>(new Set(session.flagged));
	const [sectionIndex, setSectionIndex] = useState(0);
	const [seconds, setSeconds] = useState(session.secondsRemaining);
	const [confirming, setConfirming] = useState(false);
	const [playing, setPlaying] = useState(false);
	const [elapsed, setElapsed] = useState(0);
	const [volume, setVolume] = useState(0.8);
	const [audioFailed, setAudioFailed] = useState(false);

	const audioRef = useRef<HTMLAudioElement>(null);
	const submitted = useRef(false);

	const section = session.sections[sectionIndex];
	const isLast = sectionIndex === session.sections.length - 1;
	const mock = session.mode !== "practice";

	/** Every question in the test, in order, with its state for the navigator. */
	const navQuestions: NavQuestion[] = useMemo(
		() =>
			session.sections.flatMap((s) =>
				s.groups.flatMap((g) =>
					g.questions.flatMap((q) =>
						// One control can answer several numbered questions.
						(q.covers ?? [q.number]).map((n) => ({
							n,
							answered: isAnswered(answers[q.id]),
							flagged: flagged.has(n),
						})),
					),
				),
			),
		[session.sections, answers, flagged],
	);

	const unanswered = navQuestions.filter((q) => !q.answered).map((q) => q.n);

	// The countdown. It draws the clock; it does not decide the deadline.
	useEffect(() => {
		if (seconds <= 0) return;
		const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
		return () => clearInterval(t);
	}, [seconds]);

	// Time up: hand over once, and let the server rule on whether it really was.
	useEffect(() => {
		if (seconds === 0 && !submitted.current) {
			submitted.current = true;
			onSubmit?.("time");
		}
	}, [seconds, onSubmit]);

	const answer = useCallback(
		(questionId: string, value: AnswerValue) => {
			setAnswers((prev) => ({ ...prev, [questionId]: value }));
			onSave?.(questionId, value);
		},
		[onSave],
	);

	/** Jump to whichever section holds a question number, and focus it. */
	function goToQuestion(n: number) {
		const index = session.sections.findIndex((s) =>
			s.groups.some((g) => g.questions.some((q) => (q.covers ?? [q.number]).includes(n))),
		);
		if (index >= 0) setSectionIndex(index);
		setConfirming(false);
		// Let the section render before reaching for the field.
		requestAnimationFrame(() => {
			document.getElementById(`nav-target-${n}`)?.scrollIntoView({ block: "center" });
		});
	}

	function toggleFlag(n: number) {
		setFlagged((prev) => {
			const next = new Set(prev);
			if (next.has(n)) next.delete(n);
			else next.add(n);
			return next;
		});
	}

	/** The first question of the section on screen — what the flag button acts on. */
	const firstInSection = section.groups[0]?.questions[0]?.number ?? 1;

	const hasPassage = section.passages.length > 0;

	const passagePane = (
		<div className="flex flex-col gap-6">
			{section.passages.map((p) => (
				<article key={p.title} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-6">
					<h2 className="m-0 text-h2">{p.title}</h2>
					{/* Sanitised on the server — see sanitizeAttemptSession. Text
					    selection stays on: highlighting is how people read a passage. */}
					<div className="max-w-[70ch] text-passage [&_p]:mb-4" dangerouslySetInnerHTML={{ __html: p.html }} />
				</article>
			))}
		</div>
	);

	const questionPane = (
		<div className="flex flex-col gap-10">
			{section.groups.map((group) => (
				<div key={group.id} className="rounded-card border border-line bg-surface p-6">
					<QuestionGroupBlock group={group} answers={answers} onAnswer={answer} />
				</div>
			))}
		</div>
	);

	return (
		<div className="flex min-h-screen flex-col bg-bg">
			{/* One audio element for the whole attempt. Never remounted. */}
			{session.audio && (
				<audio
					ref={audioRef}
					src={session.audio.url}
					preload="auto"
					onTimeUpdate={(e) => setElapsed(e.currentTarget.currentTime)}
					onEnded={() => setPlaying(false)}
					onError={() => {
						setAudioFailed(true);
						setPlaying(false);
					}}
				/>
			)}

			<header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-line bg-surface px-4 py-3 shadow-soft md:px-8">
				<span className="text-h3">{session.test.title}</span>
				<Countdown seconds={seconds} />
				<span className="font-semibold text-ink-2">
					{section.label} of {session.sections.length}
				</span>
			</header>

			{session.audio && (
				<div className="border-b border-line bg-night px-4 py-4 md:px-8">
					<AudioPlayer
						surface="night"
						title={section.label}
						mode={mock ? "mock" : "practice"}
						playing={playing}
						elapsed={elapsed}
						duration={session.audio.durationSeconds}
						volume={volume}
						onVolumeChange={(v) => {
							setVolume(v);
							if (audioRef.current) audioRef.current.volume = v;
						}}
						onPlay={() => {
							audioRef.current
								?.play()
								.then(() => {
									setAudioFailed(false);
									setPlaying(true);
								})
								.catch(() => setAudioFailed(true));
						}}
						onPause={
							mock
								? undefined
								: () => {
										audioRef.current?.pause();
										setPlaying(false);
									}
						}
						onReplay={
							mock
								? undefined
								: () => {
										if (audioRef.current) audioRef.current.currentTime = 0;
									}
						}
					/>
				</div>
			)}

			{audioFailed && (
				<div
					role="alert"
					className="flex flex-wrap items-center gap-3 border-b border-danger-line bg-danger-soft px-4 py-3.5 md:px-8"
				>
					<span
						className="grid size-6 flex-none place-items-center rounded-full bg-danger text-small font-bold text-white"
						aria-hidden="true"
					>
						✕
					</span>
					<span className="min-w-[200px] flex-1">
						The sound didn&rsquo;t start. Your answers are safe. Check your headphones are plugged in, then
						press play again — if it still doesn&rsquo;t work, put your hand up.
					</span>
					<Button
						size="modal"
						variant="secondary"
						onClick={() => {
							audioRef.current
								?.play()
								.then(() => {
									setAudioFailed(false);
									setPlaying(true);
								})
								.catch(() => setAudioFailed(true));
						}}
					>
						Try again
					</Button>
				</div>
			)}

			<div className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-6 px-4 py-6 md:flex-row md:px-8 md:py-8">
				<main className="flex min-w-0 flex-1 flex-col gap-6">
					{hasPassage ? (
						// Screen 07: two panes that scroll independently, so checking
						// paragraph 3 against question 9 loses neither place.
						<ReadingSplit passage={passagePane} questions={questionPane} />
					) : (
						questionPane
					)}
				</main>

				<aside className="md:w-[260px] md:flex-none">
					<div className="md:sticky md:top-28">
						<QuestionNavigator
							questions={navQuestions}
							current={firstInSection}
							onSelect={goToQuestion}
						/>
					</div>
				</aside>
			</div>

			<footer className="sticky bottom-0 z-20 flex items-center justify-between gap-3 border-t border-line bg-surface px-4 py-3 shadow-soft md:px-8">
				<Button
					variant="secondary"
					size="modal"
					disabled={sectionIndex === 0}
					onClick={() => setSectionIndex((i) => Math.max(0, i - 1))}
				>
					Previous
				</Button>

				<Button
					variant={flagged.has(firstInSection) ? "primary" : "ghost"}
					size="modal"
					onClick={() => toggleFlag(firstInSection)}
					aria-pressed={flagged.has(firstInSection)}
				>
					{flagged.has(firstInSection) ? "Marked" : "Mark to come back"}
				</Button>

				{isLast ? (
					<Button size="modal" onClick={() => setConfirming(true)}>
						Finish Test
					</Button>
				) : (
					<Button
						size="modal"
						onClick={() => setSectionIndex((i) => Math.min(session.sections.length - 1, i + 1))}
					>
						Next
					</Button>
				)}
			</footer>

			{/* Screen 08 — never let a student submit blind. */}
			<Dialog open={confirming} onOpenChange={setConfirming}>
				<DialogContent showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>
							{unanswered.length === 0
								? "Finish your test?"
								: unanswered.length === 1
									? "You have 1 unanswered question."
									: `You have ${unanswered.length} unanswered questions.`}
						</DialogTitle>
						<DialogDescription>
							{unanswered.length === 0
								? "You've answered everything. You can't change your answers after this."
								: "Tap a number to go back to it. You can't change your answers after you finish."}
						</DialogDescription>
					</DialogHeader>

					{unanswered.length > 0 && (
						<ul className="m-0 flex max-h-40 list-none flex-wrap gap-2 overflow-y-auto p-0">
							{unanswered.map((n) => (
								<li key={n}>
									<button
										type="button"
										onClick={() => goToQuestion(n)}
										className="min-h-touch min-w-touch cursor-pointer rounded-control border border-line bg-surface px-3 font-mono font-medium hover:border-brand hover:text-brand"
									>
										{n}
									</button>
								</li>
							))}
						</ul>
					)}

					<DialogFooter>
						<Button size="modal" onClick={() => setConfirming(false)}>
							Go back
						</Button>
						<Button
							size="modal"
							variant="secondary"
							onClick={() => {
								submitted.current = true;
								onSubmit?.("student");
							}}
						>
							{unanswered.length === 0 ? "Finish" : "Submit anyway"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

/** Whether a stored answer counts as given. An empty string or list does not. */
function isAnswered(value: AnswerValue | undefined): boolean {
	if (value == null) return false;
	return Array.isArray(value) ? value.length > 0 : value.trim() !== "";
}

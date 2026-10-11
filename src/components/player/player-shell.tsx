"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AudioPlayer } from "@/components/player/audio-player";
import { Countdown } from "@/components/player/countdown";
import { QuestionBar, type NavQuestion, type NavSection } from "@/components/player/question-navigator";
import { QuestionGroupBlock, type AnswerValue } from "@/components/player/question-group";
import { ReadingSplit } from "@/components/player/reading-split";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { readAudio } from "@/lib/audio-cache";
import type { AttemptSession } from "@/lib/view-models/attempt";
import { Icon } from "@/components/ui/icon";

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
	onFlag,
	onSubmit,
	status,
	clock,
	submitting = false,
}: {
	session: AttemptSession;
	/** Autosave. Fired per change, debounced by the caller. */
	onSave?: (questionId: string, value: AnswerValue) => void;
	/** A question was marked or unmarked to come back to. */
	onFlag?: (questionNumber: number, flagged: boolean) => void;
	/** A short live line for the header — "Saved", "Saving…", "Offline". */
	status?: React.ReactNode;
	/**
	 * A correction from the server clock. Each new `stamp` replaces the drawn
	 * countdown with `seconds`; a correction above zero also re-arms time-up,
	 * for when a fast browser clock reached zero before the server did.
	 */
	clock?: { seconds: number; stamp: number };
	/** Hand over to the submit Server Action. */
	onSubmit?: (reason: "student" | "time") => void;
	/**
	 * The test is being handed in. The Finish button spins and the dialog
	 * can't be closed; when time ran out (no dialog open) a small one says so,
	 * because handing in can take a few seconds on a lab connection.
	 */
	submitting?: boolean;
}) {
	const [answers, setAnswers] = useState<Record<string, AnswerValue>>(session.answers);
	const [flagged, setFlagged] = useState<Set<number>>(new Set(session.flagged));
	const [sectionIndex, setSectionIndex] = useState(0);
	/** The question the student is on: the number they picked, or the field they are in. */
	const [currentQuestion, setCurrentQuestion] = useState<number | null>(null);
	const [seconds, setSeconds] = useState(session.secondsRemaining);
	const [confirming, setConfirming] = useState(false);
	const [playing, setPlaying] = useState(false);
	const [elapsed, setElapsed] = useState(0);
	const [volume, setVolume] = useState(0.8);
	const [audioFailed, setAudioFailed] = useState(false);

	const audioRef = useRef<HTMLAudioElement>(null);
	const submitted = useRef(false);
	const audioSrc = useAudioSource(session.audio);

	const section = session.sections[sectionIndex];
	const isLast = sectionIndex === session.sections.length - 1;
	const mock = session.mode !== "practice";

	/** Every question in the test, by section, with its state for the bottom bar. */
	const navSections: NavSection[] = useMemo(
		() =>
			session.sections.map((s) => ({
				label: s.label,
				questions: s.groups.flatMap((g) =>
					g.questions.flatMap((q) =>
						// One control can answer several numbered questions.
						(q.covers ?? [q.number]).map((n) => ({
							n,
							answered: isAnswered(answers[q.id]),
							flagged: flagged.has(n),
						})),
					),
				),
			})),
		[session.sections, answers, flagged],
	);
	const navQuestions: NavQuestion[] = navSections.flatMap((s) => s.questions);

	const unanswered = navQuestions.filter((q) => !q.answered).map((q) => q.n);

	// A server correction replaces the drawn clock (state adjusted during
	// render when the prop changes, not in an effect).
	const [appliedStamp, setAppliedStamp] = useState(clock?.stamp);
	if (clock && clock.stamp !== appliedStamp) {
		setAppliedStamp(clock.stamp);
		setSeconds(clock.seconds);
	}

	// The countdown. It draws the clock; it does not decide the deadline.
	useEffect(() => {
		if (seconds <= 0) return;
		// Time is on the clock again (a server correction): re-arm time-up.
		submitted.current = false;
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
		setCurrentQuestion(n);
		setConfirming(false);
		// Let the section render before reaching for the field.
		requestAnimationFrame(() => {
			document.getElementById(`nav-target-${n}`)?.scrollIntoView({ block: "center" });
		});
	}

	function toggleFlag(n: number) {
		const nowFlagged = !flagged.has(n);
		setFlagged((prev) => {
			const next = new Set(prev);
			if (nowFlagged) next.add(n);
			else next.delete(n);
			return next;
		});
		onFlag?.(n, nowFlagged);
	}

	/** The first question of the section on screen. */
	const firstInSection = section.groups[0]?.questions[0]?.number ?? 1;
	/**
	 * What the bar highlights and "Mark to come back" acts on: the question the
	 * student picked or is answering, if it is in this section; otherwise the
	 * section's first, so the button never marks a question they can't see.
	 */
	const sectionNumbers = new Set(
		section.groups.flatMap((g) => g.questions.flatMap((q) => q.covers ?? [q.number])),
	);
	const current = currentQuestion !== null && sectionNumbers.has(currentQuestion) ? currentQuestion : firstInSection;

	const hasPassage = section.passages.length > 0;

	const passagePane = (
		<div className="flex flex-col gap-6">
			{section.passages.map((p) => (
				<article key={p.title} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-6">
					<h2 className="m-0 text-h2">{p.title}</h2>
					{/* Sanitised on the server — see sanitizeAttemptSession. Text
					    selection stays on: highlighting is how people read a passage. */}
					{/* Paragraph letters (data-label, kept by the sanitiser) are printed in
					    the margin: "Which paragraph contains…" questions depend on them. */}
					<div
						className="max-w-[70ch] text-passage [&_h4]:mt-2 [&_h4]:mb-3 [&_h4]:text-h3 [&_h5]:mt-2 [&_h5]:mb-2 [&_h5]:font-semibold [&_p]:mb-4 [&_p[data-label]]:relative [&_p[data-label]]:pl-8 [&_p[data-label]]:before:absolute [&_p[data-label]]:before:left-0 [&_p[data-label]]:before:font-bold [&_p[data-label]]:before:content-[attr(data-label)]"
						dangerouslySetInnerHTML={{ __html: p.html }}
					/>
				</article>
			))}
		</div>
	);

	const questionPane = (
		<div className="flex flex-col gap-10">
			{section.groups.map((group) => (
				<div key={group.id} className="rounded-card border border-line bg-surface p-6">
					<QuestionGroupBlock group={group} answers={answers} onAnswer={answer} onFocusQuestion={setCurrentQuestion} />
				</div>
			))}
		</div>
	);

	return (
		// Reading fills exactly one screen so its two panes scroll on their own
		// and the question bar never scrolls away; Listening scrolls as a page.
		<div className={hasPassage ? "flex h-dvh flex-col bg-bg" : "flex min-h-screen flex-col bg-bg"}>
			{/* One audio element for the whole attempt. Never remounted. */}
			{session.audio && audioSrc && (
				<audio
					ref={audioRef}
					src={audioSrc}
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
				<span className="flex items-center gap-4 font-semibold text-ink-2">
					{status}
					<span>
						{section.label} of {session.sections.length}
					</span>
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
						<Icon name="x" strokeWidth={3} className="size-4" />
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

			{hasPassage ? (
				// Screen 07: passage and questions side by side, each scrolling on
				// its own, so checking paragraph 3 against question 9 loses neither
				// place. The full width is theirs — the navigator lives in the footer.
				<main className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 md:overflow-hidden md:px-8">
					<ReadingSplit passage={passagePane} questions={questionPane} />
				</main>
			) : (
				<main className="mx-auto flex w-full max-w-[960px] flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
					{questionPane}
				</main>
			)}

			<footer className="sticky bottom-0 z-20 flex min-w-0 flex-col gap-3 border-t border-line bg-surface px-4 py-3 shadow-soft md:px-8">
				<QuestionBar
					sections={navSections}
					currentSection={sectionIndex}
					current={current}
					onSelect={goToQuestion}
				/>
				<div className="flex items-center justify-between gap-3">
					<Button
						variant="secondary"
						size="modal"
						disabled={sectionIndex === 0}
						onClick={() => setSectionIndex((i) => Math.max(0, i - 1))}
					>
						Previous
					</Button>

					<Button
						variant={flagged.has(current) ? "primary" : "ghost"}
						size="modal"
						onClick={() => toggleFlag(current)}
						aria-pressed={flagged.has(current)}
					>
						{flagged.has(current) ? `Question ${current} marked` : `Mark question ${current} to come back`}
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
				</div>
			</footer>

			{/* Screen 08 — never let a student submit blind. */}
			<Dialog open={confirming} onOpenChange={(open) => !submitting && setConfirming(open)}>
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
						<Button size="modal" onClick={() => setConfirming(false)} disabled={submitting}>
							Go back
						</Button>
						<Button
							size="modal"
							variant="secondary"
							loading={submitting}
							onClick={() => {
								submitted.current = true;
								onSubmit?.("student");
							}}
						>
							{submitting ? "Handing in…" : unanswered.length === 0 ? "Finish" : "Submit anyway"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Time ran out: nothing was tapped, so say what is happening. */}
			<Dialog open={submitting && !confirming}>
				<DialogContent showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>Time&rsquo;s up</DialogTitle>
						<DialogDescription>Handing in your answers… This only takes a moment.</DialogDescription>
					</DialogHeader>
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

/**
 * Where the one `<audio>` element gets its file (M2-06): the copy the pre-test
 * screen downloaded, as a `blob:` URL, so playing never touches the network.
 * Only when this browser has no copy — a resumed test on another machine, a
 * private window that was reloaded — does it fall back to the URL from the
 * server. Resolved once; the element mounts when it is known and never again.
 */
function useAudioSource(audio: AttemptSession["audio"]): string | null {
	const [src, setSrc] = useState<string | null>(audio && !audio.cache ? audio.url : null);
	useEffect(() => {
		if (!audio?.cache) return;
		let objectUrl: string | null = null;
		let cancelled = false;
		readAudio(audio.cache.ownerId, audio.cache.key)
			.then((blob) => {
				if (cancelled) return;
				if (blob) objectUrl = URL.createObjectURL(blob);
				setSrc(objectUrl ?? audio.url);
			})
			.catch(() => !cancelled && setSrc(audio.url));
		return () => {
			cancelled = true;
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
		// One attempt, one file: resolving again would remount the element.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
	return src;
}

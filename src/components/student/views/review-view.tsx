"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { use, useSyncExternalStore } from "react";

import { PillTabs } from "@/components/student/pill-tabs";
import { Banner } from "@/components/ui/banner";
import { EmptyState } from "@/components/ui/empty-state";
import { useReviewLoader } from "@/components/student/student-data";
import StudentLoading from "@/app/(student)/loading";
import { cn } from "@/lib/utils";
import type { ReviewQuestion } from "@/lib/view-models/student";
import { Icon } from "@/components/ui/icon";

/** `useSyncExternalStore` needs a subscribe function; nothing here ever changes. */
const noSubscription = () => () => {};

/**
 * Screen 10 — Review my mistakes (M4-01).
 *
 * Only for the student's own attempt, once its result is released and its
 * assignment allows review (`getMyMistakes`). Built on the server by
 * `getMyMistakes`, and fetched by the result screen in the
 * background (`useReviewLoader`) so it is already in the browser when the
 * student taps "See my mistakes". It holds only what this student is allowed
 * to see; the answer key itself never leaves the server.
 *
 * Opens on the mistakes, because that is what the student came for. Each
 * card says what they wrote, then what was right — in words, with a tick or
 * a cross as well as colour. Explanations and "play this part" arrive with
 * the transcript (M4-02); nothing is invented in their place.
 */
export function ReviewView({ attemptId, show }: { attemptId: string; show?: string }) {
	const loadReview = useReviewLoader();
	// The review is fetched by a Server Action, which can only be called from
	// the browser — so a server pre-render (someone opening this URL directly)
	// shows the loading state, and the browser takes over.
	const inBrowser = useSyncExternalStore(noSubscription, () => true, () => false);
	if (!inBrowser) return <StudentLoading />;

	// Usually already loaded by the result screen; otherwise this suspends
	// behind the student loading state until it arrives.
	const entry = loadReview(attemptId);
	const loaded = entry.settled ? entry.value : use(entry.promise);
	// The loader is already sending them to sign in.
	if (loaded === "session_ended") return <StudentLoading />;
	if (!loaded) notFound();

	const back = (
		<Link href={`/results/${attemptId}`} className="font-semibold">
			<Icon name="arrow-left" className="mr-1.5" />
			Back to my result
		</Link>
	);

	if ("problem" in loaded) {
		return (
			<div className="mx-auto flex w-full max-w-[760px] flex-col gap-6">
				{back}
				<h1 className="m-0 text-[1.75rem] leading-9 font-bold md:text-h1">See my mistakes</h1>
				<Banner tone="warning">
					We can&rsquo;t open the questions for this test right now. Your result is safe. Please tell your teacher.
				</Banner>
			</div>
		);
	}

	const { mistakes } = loaded;
	const all = show === "all";
	const wrong = mistakes.questions.filter((q) => !q.correct);
	const shown = all ? mistakes.questions : wrong;

	return (
		<div className="mx-auto flex w-full max-w-[760px] flex-col gap-6">
			{back}

			<div className="flex flex-col gap-2">
				<h1 className="m-0 text-[1.75rem] leading-9 font-bold md:text-h1">See my mistakes</h1>
				<p className="m-0 text-ink-2">{mistakes.test.title}</p>
			</div>

			<section className="flex flex-wrap gap-8 rounded-card border border-line bg-surface p-6">
				<div className="flex items-center gap-3">
					<span className="grid size-10 place-items-center rounded-full bg-success-soft font-bold text-success" aria-hidden="true">
						<Icon name="check" strokeWidth={3} className="size-5" />
					</span>
					<span className="flex flex-col">
						<span className="font-mono text-h2 font-medium">{mistakes.summary.correct}</span>
						<span className="text-small text-ink-2">Correct</span>
					</span>
				</div>
				<div className="flex items-center gap-3">
					<span className="grid size-10 place-items-center rounded-full bg-danger-soft font-bold text-danger" aria-hidden="true">
						<Icon name="x" strokeWidth={3} className="size-5" />
					</span>
					<span className="flex flex-col">
						<span className="font-mono text-h2 font-medium">{mistakes.summary.wrong}</span>
						<span className="text-small text-ink-2">Wrong</span>
					</span>
				</div>
			</section>

			<PillTabs
				label="Which questions to show"
				paramName="show"
				basePath={`/review/${attemptId}`}
				active={all ? "all" : "mistakes"}
				tabs={[
					{ value: "mistakes", label: "Only my mistakes" },
					{ value: "all", label: "All questions" },
				]}
			/>

			{shown.length === 0 ? (
				<EmptyState
					icon={<Icon name="check" />}
					title="You got everything right"
					action={
						<Link href={`/review/${attemptId}?show=all`} className="font-semibold">
							Read through all the questions
						</Link>
					}
				>
					Nothing to fix in this test.
				</EmptyState>
			) : (
				<>
					<p className="m-0 text-ink-2">
						{all
							? `All ${mistakes.summary.total} questions, in order. The ones you got right are marked too.`
							: // No count here: the header counts question numbers (as the result
								// page does), while a card can cover two — "29–30" is one card.
								"Here are the questions you got wrong. Read your answer, then the right one."}
					</p>
					<ol className="m-0 flex list-none flex-col gap-4 p-0">
						{shown.map((q) => (
							<ReviewCard key={q.number} q={q} part={mistakes.test.skill === "reading" ? "Passage" : "Section"} />
						))}
					</ol>
				</>
			)}

			<div className="flex flex-col gap-3">
				<Link
					href="/progress"
					className="flex h-primary items-center justify-center gap-2.5 rounded-control bg-brand text-h3 font-semibold text-white no-underline hover:bg-brand-hover hover:no-underline"
				>
					See what to practise
					<Icon name="arrow-right" />
				</Link>
				<Link
					href="/home"
					className="flex min-h-touch items-center justify-center font-semibold text-ink-2 no-underline hover:text-ink hover:no-underline"
				>
					Back to Home
				</Link>
			</div>
		</div>
	);
}

/** One question: what they answered, and — when it was wrong — what was right. */
function ReviewCard({ q, part }: { q: ReviewQuestion; part: "Section" | "Passage" }) {
	return (
		<li
			className={cn(
				"flex flex-col gap-4 rounded-card border bg-surface p-5",
				q.correct ? "border-line" : "border-danger-line",
			)}
		>
			<div className="flex items-start gap-4">
				<span
					className={cn(
						"grid min-w-10 flex-none place-items-center rounded-control px-2 py-1 font-mono font-semibold",
						q.correct ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
					)}
				>
					{q.label}
				</span>
				<div className="flex flex-col gap-1">
					{/* Sanitised on the server, on write and again before it got here. */}
					<span dangerouslySetInnerHTML={{ __html: q.promptHtml }} />
					<span className="text-small text-ink-2">
						{q.questionTypeLabel} · {part} {q.sectionNo}
					</span>
				</div>
			</div>

			<div
				className={cn(
					"flex items-start gap-3 rounded-control px-4 py-3",
					q.correct ? "bg-success-soft" : "bg-danger-soft",
				)}
			>
				<Icon
					name={q.correct ? "check" : "x"}
					strokeWidth={3}
					className={cn("mt-1", q.correct ? "text-success" : "text-danger")}
				/>
				<span>
					<span className="font-semibold">{q.correct ? "Your answer (right)" : "Your answer (wrong)"}</span> —{" "}
					{q.givenAnswer ?? <em>You left this empty</em>}
				</span>
			</div>

			{!q.correct && (
				<div className="flex items-start gap-3 rounded-control border border-line px-4 py-3">
					<Icon name="check" strokeWidth={3} className="mt-1 text-success" />
					<span>
						<span className="font-semibold">Correct answer</span> — {q.correctAnswer}
					</span>
				</div>
			)}
		</li>
	);
}

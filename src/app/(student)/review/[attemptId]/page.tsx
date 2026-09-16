import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AnswerLine } from "@/components/ui/band-score";
import { PillTabs } from "@/components/student/pill-tabs";
import { sanitizePassageHtml } from "@/lib/security/sanitize";
import { getMyMistakes } from "@/lib/mock/student";
import type { ReviewQuestion } from "@/lib/view-models/student";

export const metadata: Metadata = { title: "Review my mistakes" };

/**
 * One reviewed question.
 *
 * Teacher-authored HTML is sanitised **again here, on render**, even though the
 * importer already sanitised it on write (`MVP-1.md` §8 rule 8). The two passes
 * are not redundant: the write-side pass can be bypassed by anything that
 * reaches the table another way, and passages are the likeliest XSS vector in
 * this product.
 *
 * Correct and wrong pair colour with a mark **and** a word, via `AnswerLine` —
 * some students are colour-blind and all of them are stressed.
 */
function QuestionBlock({ q }: { q: ReviewQuestion }) {
	return (
		<article
			className={`flex flex-col gap-4 rounded-card border bg-surface p-6 ${
				q.correct ? "border-line" : "border-danger-line"
			}`}
		>
			<div className="flex flex-wrap items-center gap-3">
				<span
					className={`grid size-8 flex-none place-items-center rounded-full font-mono font-medium ${
						q.correct ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
					}`}
				>
					{q.number}
				</span>
				<span className="text-small font-semibold text-ink-2">{q.questionTypeLabel}</span>
				<span
					className={`ml-auto flex items-center gap-2 text-small font-semibold ${
						q.correct ? "text-success" : "text-danger"
					}`}
				>
					<span aria-hidden="true">{q.correct ? "✓" : "✕"}</span>
					{q.correct ? "Correct" : "Wrong"}
				</span>
			</div>

			<div
				className="text-passage"
				// Sanitised immediately above; see the note on this component.
				dangerouslySetInnerHTML={{ __html: sanitizePassageHtml(q.promptHtml) }}
			/>

			<div className="flex flex-col gap-2">
				<AnswerLine
					kind={q.correct ? "correct" : "yours"}
					value={q.givenAnswer ?? <em className="text-ink-2">You left this blank</em>}
				/>
				{!q.correct && <AnswerLine kind="correct" value={q.correctAnswer} />}
			</div>

			{(q.explanationHtml || q.audioOffsetSeconds !== null) && (
				<details className="group rounded-control border border-line bg-bg px-4 py-3">
					<summary className="cursor-pointer list-none font-semibold text-brand marker:content-none">
						Show why <span aria-hidden="true">▾</span>
					</summary>
					<div className="flex flex-col gap-3 pt-3">
						{q.explanationHtml && (
							<div
								className="text-passage text-ink-2"
								dangerouslySetInnerHTML={{ __html: sanitizePassageHtml(q.explanationHtml) }}
							/>
						)}
						{q.audioOffsetSeconds !== null && (
							<p className="m-0 text-ink-2">
								You can hear this part at{" "}
								<strong className="font-mono font-medium text-ink">
									{Math.floor(q.audioOffsetSeconds / 60)}:
									{String(q.audioOffsetSeconds % 60).padStart(2, "0")}
								</strong>{" "}
								in the recording.
							</p>
						)}
					</div>
				</details>
			)}
		</article>
	);
}

/**
 * Screen 10 — Review my mistakes (M4-01). The teaching screen.
 *
 * Only reachable for a released result on the student's own attempt; the
 * release gate is enforced server-side, so `getMyMistakes` returning `null` is
 * the same 404 a stranger's attempt would give.
 *
 * Defaults to **mistakes only** — the list exists to be worked through, and a
 * student who got 32 right does not want to scroll past 32 green cards to find
 * the 8 that matter.
 */
export default async function ReviewPage({
	params,
	searchParams,
}: {
	params: Promise<{ attemptId: string }>;
	searchParams: Promise<{ show?: string }>;
}) {
	const { attemptId } = await params;
	const { show } = await searchParams;
	const data = await getMyMistakes(attemptId);
	if (!data) notFound();

	const showAll = show === "all";
	const questions = showAll ? data.questions : data.questions.filter((q) => !q.correct);

	return (
		<div className="mx-auto flex w-full max-w-[760px] flex-col gap-6">
			<Link href={`/results/${attemptId}`} className="font-semibold">
				← Back to my result
			</Link>

			<div className="flex flex-col gap-2">
				<h1 className="m-0 text-[1.75rem] leading-9 font-bold md:text-h1">Review my mistakes</h1>
				<p className="m-0 text-ink-2">{data.test.title}</p>
			</div>

			<section className="flex flex-wrap gap-8 rounded-card border border-line bg-surface p-6">
				<div className="flex items-center gap-3">
					<span className="font-bold text-success" aria-hidden="true">
						✓
					</span>
					<span>
						<strong className="font-mono font-medium">{data.summary.correct}</strong> correct
					</span>
				</div>
				<div className="flex items-center gap-3">
					<span className="font-bold text-danger" aria-hidden="true">
						✕
					</span>
					<span>
						<strong className="font-mono font-medium">{data.summary.wrong}</strong> wrong
					</span>
				</div>
			</section>

			<PillTabs
				basePath={`/review/${attemptId}`}
				paramName="show"
				active={showAll ? "all" : "mistakes"}
				tabs={[
					{ value: "mistakes", label: "Only my mistakes" },
					{ value: "all", label: "All questions" },
				]}
			/>

			<div className="flex flex-col gap-4">
				{questions.map((q) => (
					<QuestionBlock key={q.number} q={q} />
				))}
			</div>
		</div>
	);
}

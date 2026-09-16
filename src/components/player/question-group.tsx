"use client";

import { ChooseN } from "@/components/player/widgets/checkbox-n";
import { MatchingSelect } from "@/components/player/widgets/dropdown-bank";
import { SingleChoice } from "@/components/player/widgets/radio";
import { SegmentedChoice } from "@/components/player/widgets/segmented-3";
import { TextAnswer } from "@/components/player/widgets/text-gap";
import type { ContainerKey, PlayerQuestion, QuestionGroup } from "@/lib/view-models/attempt";

/**
 * One "Questions 1–5" block: its instruction, its container, and one widget
 * per question (M2-10 … M2-13).
 *
 * The widget key decides the *control*; the container key decides the *layout
 * around it*. That split is why six widgets cover fourteen question types
 * (`MVP-1.md` §10) — a note completion and a table completion are the same
 * text input in different furniture.
 *
 * Nothing here compares an answer to anything. It reports changes upward and
 * draws what it is given.
 *
 * ⚠️ Every `…Html` field arriving here has already been through
 * `sanitizeAttemptSession` on the server. **Do not import the sanitiser into
 * this file** — it would drag `unified` and three `rehype` packages into the
 * browser bundle. If some HTML here looks unsanitised, it reached the player
 * by a path that skipped that call; fix the path.
 */

/** An answer value as the player stores it: one string, or several. */
export type AnswerValue = string | string[];

/** The furniture a completion group sits in. */
const CONTAINER_CLASS: Record<ContainerKey, string> = {
	plain: "flex flex-col gap-8",
	// A form is read down a column of labelled rows, so keep the rows tight.
	form: "flex flex-col gap-6 rounded-card border border-line bg-bg p-6",
	note: "flex flex-col gap-6 rounded-card border border-line bg-bg p-6",
	summary: "flex flex-col gap-6 rounded-card border border-line bg-bg p-6",
	sentence: "flex flex-col gap-8",
	table: "flex flex-col gap-6 rounded-card border border-line bg-bg p-6",
	flow_chart: "flex flex-col gap-6 rounded-card border border-line bg-bg p-6",
};

/** Server-sanitised question HTML, inline so it can sit inside a label. */
function Prompt({ html }: { html: string }) {
	return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export function QuestionGroupBlock({
	group,
	answers,
	onAnswer,
	disabled,
}: {
	group: QuestionGroup;
	answers: Record<string, AnswerValue>;
	onAnswer: (questionId: string, value: AnswerValue) => void;
	/** True once the attempt is over — the student can read but not change. */
	disabled?: boolean;
}) {
	const str = (q: PlayerQuestion) => {
		const v = answers[q.id];
		return typeof v === "string" ? v : "";
	};
	const arr = (q: PlayerQuestion) => {
		const v = answers[q.id];
		return Array.isArray(v) ? v : [];
	};

	return (
		<section className="flex flex-col gap-5" aria-labelledby={`${group.id}-heading`}>
			<div className="flex flex-col gap-2">
				<h3 id={`${group.id}-heading`} className="m-0 text-h2">
					{group.heading}
				</h3>
				<div
					className="text-passage text-ink-2"
					dangerouslySetInnerHTML={{ __html: group.instructionHtml }}
				/>
			</div>

			{/* The shared bank is printed once, above the rows that draw from it. */}
			{group.widget === "dropdown_bank" && group.bank && (
				<ul className="m-0 flex list-none flex-col gap-2 rounded-card border border-line bg-bg p-6 text-passage">
					{group.bank.map((o) => (
						<li key={o.value}>{o.label}</li>
					))}
				</ul>
			)}

			<div className={CONTAINER_CLASS[group.container]}>
				{group.questions.map((q) => {
					const id = `q-${q.id}`;
					// Anchors for the navigator and the submit dialog's chips: one per
					// question number, so jumping to 22 lands on the control that
					// answers it even though the control is numbered 21.
					// Zero-size and absolutely positioned, so they never become flex
					// items or add a gap; offset upward to clear the sticky header.
					const anchors = (q.covers ?? [q.number]).map((n) => (
						<span key={n} id={`nav-target-${n}`} className="absolute -top-32 block size-0" />
					));
					const widget = ((): React.ReactNode => {
					switch (group.widget) {
						case "radio":
							return (
								<SingleChoice
									name={id}
									legend={
										<>
											<strong className="font-semibold">{q.number}.</strong> <Prompt html={q.promptHtml} />
										</>
									}
									options={q.options ?? []}
									value={str(q) || null}
									onChange={(v) => onAnswer(q.id, v)}
									disabled={disabled}
								/>
							);

						case "checkbox_n":
							return (
								<ChooseN
									name={id}
									legend={
										<>
											<strong className="font-semibold">
												{q.number}–{q.number + (group.choose ?? 2) - 1}.
											</strong>{" "}
											<Prompt html={q.promptHtml} />
										</>
									}
									options={q.options ?? []}
									value={arr(q)}
									onChange={(v) => onAnswer(q.id, v)}
									choose={group.choose ?? 2}
									disabled={disabled}
								/>
							);

						case "segmented_3":
							return (
								<SegmentedChoice
									name={id}
									options={group.bank?.map((b) => b.value)}
									legend={
										<>
											<strong className="font-semibold">{q.number}.</strong> <Prompt html={q.promptHtml} />
										</>
									}
									value={str(q) || null}
									onChange={(v) => onAnswer(q.id, v)}
									disabled={disabled}
								/>
							);

						case "dropdown_bank":
							return (
								<MatchingSelect
									id={id}
									label={
										<>
											<strong className="font-semibold">{q.number}.</strong> <Prompt html={q.promptHtml} />
										</>
									}
									options={group.bank ?? []}
									value={str(q) || null}
									onChange={(v) => onAnswer(q.id, v)}
									disabled={disabled}
								/>
							);

						case "text_gap":
						default:
							return (
								<TextAnswer
									id={id}
									number={q.number}
									prompt={<Prompt html={q.promptHtml} />}
									value={str(q)}
									onChange={(v) => onAnswer(q.id, v)}
									hint={q.hint}
									disabled={disabled}
								/>
							);
					}
					})();

					return (
						<div key={q.id} className="relative">
							{anchors}
							{widget}
						</div>
					);
				})}
			</div>
		</section>
	);
}

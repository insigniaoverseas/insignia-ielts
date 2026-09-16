import type { Mode, TestSummary } from "./student";

export type { ContainerKey, WidgetKey } from "../question-types";
import type { ContainerKey, WidgetKey } from "../question-types";

/**
 * The test player's view-model — everything a running attempt renders.
 *
 * **There is no correct answer in this file, and there must never be one.**
 * The player is the one place a student's browser could be handed the key, so
 * the shape of the data is the first line of defence: if a type has no field
 * for it, a careless join cannot leak it (`MVP-1.md` §7, `CLAUDE.md` rule 3).
 * Marking happens on submit, on the server, in `lib/scoring.ts`.
 *
 * The clock is the second rule. The server sets `attempts.expires_at` and sends
 * `secondsRemaining` with it; the browser counts down from that number purely
 * to draw a timer. It never decides that time is up — submit does, server-side.
 */

/** One question, as the player draws it. Answers in, never out. */
export type PlayerQuestion = {
	id: string;
	/** 1-based across the whole test, as the navigator numbers it. */
	number: number;
	/**
	 * Every question number this one control answers. Usually just `[number]`,
	 * but a "Choose TWO letters" control answers two numbered questions at once
	 * — so 40 questions can be 38 controls. The navigator counts *questions*,
	 * which is what the student is counting too, so it has to be told.
	 */
	covers?: number[];
	/** Sanitised HTML — the stem, or the text around the gap. */
	promptHtml: string;
	/** For `radio`, `checkbox_n` and `segmented_3`. */
	options?: { value: string; label: string }[];
	/** The word limit, shown under the input: "NO MORE THAN TWO WORDS". */
	hint?: string;
};

/**
 * A run of questions sharing one instruction and one widget — an IELTS
 * "Questions 1–5" block.
 */
export type QuestionGroup = {
	id: string;
	/** "Questions 1–5". */
	heading: string;
	/** The teacher's instruction, sanitised HTML. */
	instructionHtml: string;
	widget: WidgetKey;
	container: ContainerKey;
	/**
	 * The shared option bank for `dropdown_bank`, a summary's word bank, or the
	 * three words `segmented_3` offers — True/False/Not Given for
	 * `identifying_information`, Yes/No/Not Given for `identifying_views_claims`
	 * (`MVP-1.md` §10). Omitted, `segmented_3` falls back to True/False/Not Given.
	 *
	 * ⚠️ The player stores the option's `value` **verbatim** as the student's
	 * answer, so these strings are what `lib/scoring.ts` will compare against.
	 * They are a contract between the importer and scoring, not display text.
	 */
	bank?: { value: string; label: string }[];
	/** How many boxes `checkbox_n` expects ("Choose TWO"). */
	choose?: number;
	questions: PlayerQuestion[];
};

/** One section (Listening) or passage-and-its-questions (Reading). */
export type AttemptSection = {
	/** 1-based. */
	number: number;
	label: string;
	/**
	 * Reading only. GT section 1 can carry two or three short texts, hence a
	 * list rather than one field. Already sanitised; sanitised again on render.
	 */
	passages: { title: string; html: string }[];
	groups: QuestionGroup[];
};

/** A running attempt. Everything the player needs, and nothing it must not have. */
export type AttemptSession = {
	attemptId: string;
	test: TestSummary;
	mode: Mode;

	/**
	 * Seconds left, computed by the server at render. The countdown ticks this
	 * down to draw a clock; it is not authority. On reconnect the player asks
	 * the server again rather than trusting how long the tab was asleep.
	 */
	secondsRemaining: number;
	/** The server's deadline, ISO-8601 UTC. For reconciliation, not for display. */
	expiresAt: string;

	/**
	 * The one audio file for the whole test (`MVP-1.md` D8). Section navigation
	 * never seeks it and never re-requests it — there is one `<audio>` element
	 * for the whole attempt, mounted at the player root.
	 */
	audio: { url: string; durationSeconds: number } | null;

	sections: AttemptSection[];

	/** Answers already saved server-side, so a resumed attempt comes back filled in. */
	answers: Record<string, string | string[]>;
	/** Question numbers the student has flagged to come back to. */
	flagged: number[];
};

/**
 * A test's **type** (mock, class or practice) and **difficulty**, and the rules
 * for changing them from the Test library (M10-17). Pure, so it is unit-tested
 * without a database.
 *
 * Changing a type never rewrites history: every attempt copies `tests.kind`
 * when it starts, and the player runs by that copy (`attemptMode`), so a
 * result keeps the type it was taken under.
 */

export const TEST_KINDS = ["mock", "class", "practice"] as const;
export type TestKind = (typeof TEST_KINDS)[number];

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** Short names, as the chips and badges show them. */
export const KIND_LABEL: Record<TestKind, string> = { mock: "Mock", class: "Class", practice: "Practice" };
export const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };

/** One line on what each type means, for the screens that let staff choose one. */
export const KIND_HINT: Record<TestKind, string> = {
	mock: "A full exam under real rules. Counts towards the band.",
	class: "Set in class. Counts towards the band.",
	practice: "Every student can take it at home, as often as they like. Doesn't count.",
};

export const isTestKind = (value: unknown): value is TestKind => (TEST_KINDS as readonly unknown[]).includes(value);
export const isDifficulty = (value: unknown): value is Difficulty => (DIFFICULTIES as readonly unknown[]).includes(value);

/**
 * How the player runs a test: by the attempt's `kind` (or, in a staff preview,
 * the library's), falling back to the paper's own kind only when the row holds
 * something unknown. Never by `content.json` alone, which keeps whatever the
 * paper was imported as.
 *
 * @param rowKind - `attempts.kind` (copied from `tests.kind` at start) or `tests.kind`.
 * @param contentKind - The kind stored in the paper's `content.json`.
 */
export function attemptMode(rowKind: string, contentKind: TestKind): TestKind {
	return isTestKind(rowKind) ? rowKind : contentKind;
}

/** What staff asked to change. At least one field is set. */
export type DetailsChange = { kind?: TestKind; difficulty?: Difficulty };

/**
 * The columns a change needs to know about each test. `drill` is the one
 * question type a practice set drills (`tests.practice_question_type`), or
 * `null` for a full paper.
 */
export type DetailsRow = { id: string; title: string; kind: string; difficulty: string; status: string; assigned: boolean; drill: string | null };

/** One test's update, ready for the database, and what it was before (for the audit log). */
export type DetailsUpdate = {
	id: string;
	title: string;
	from: { kind: string; difficulty: string };
	set: { kind?: TestKind; difficulty?: Difficulty; practice_question_type?: null };
};

/** The most tests one press may change. */
export const MAX_DETAILS_CHANGE = 100;

/**
 * Reads a change from untrusted input (a form or a client call).
 *
 * @returns The change, or a sentence saying what is wrong with it.
 */
export function parseDetailsChange(input: { kind?: unknown; difficulty?: unknown }): DetailsChange | string {
	const kind = input.kind === "" || input.kind == null ? undefined : input.kind;
	const difficulty = input.difficulty === "" || input.difficulty == null ? undefined : input.difficulty;
	if (kind !== undefined && !isTestKind(kind)) return "Choose Mock, Class or Practice.";
	if (difficulty !== undefined && !isDifficulty(difficulty)) return "Choose Easy, Medium or Hard.";
	if (kind === undefined && difficulty === undefined) return "Choose a type or a difficulty to change.";
	return { ...(kind ? { kind } : {}), ...(difficulty ? { difficulty } : {}) };
}

/**
 * True for a practice set built to drill one question type. Those keep their
 * type: moving one to mock or class would have to wipe the question type it
 * was made for (only practice may carry one), so only its difficulty changes.
 * The user asked on 2026-10-12 to keep them exactly as they are.
 */
export function isDrill(row: Pick<DetailsRow, "kind" | "drill">): boolean {
	return row.kind === "practice" && row.drill !== null;
}

/** How many of the rows keep their type under this change because they are question-type drills. */
export function drillsKept(rows: readonly DetailsRow[], change: DetailsChange): number {
	return change.kind && change.kind !== "practice" ? rows.filter(isDrill).length : 0;
}

/**
 * The updates a change makes: only tests that actually change, each with only
 * the columns that change. A question-type drill never changes type
 * ({@link isDrill}); a full-paper practice test moving to mock or class has no
 * question type to clear, but the update still sets it to null so the
 * database's rule (only practice may carry one) holds whatever was there.
 */
export function planDetailsChange(rows: readonly DetailsRow[], change: DetailsChange): DetailsUpdate[] {
	return rows.flatMap((row) => {
		const set: DetailsUpdate["set"] = {};
		if (change.kind && change.kind !== row.kind && !isDrill(row)) {
			set.kind = change.kind;
			if (change.kind !== "practice") set.practice_question_type = null;
		}
		if (change.difficulty && change.difficulty !== row.difficulty) set.difficulty = change.difficulty;
		if (Object.keys(set).length === 0) return [];
		return [{ id: row.id, title: row.title, from: { kind: row.kind, difficulty: row.difficulty }, set }];
	});
}

/**
 * The warning to show before a change, or `null` when there is nothing to warn
 * about. Making an already-used paper Practice puts it in front of every
 * student at home — the risk `MVP-1.md` §8 keeps the pools apart for.
 */
export function detailsWarning(rows: readonly DetailsRow[], change: DetailsChange): string | null {
	if (change.kind !== "practice") return null;
	const exposed = rows.filter((row) => row.kind !== "practice" && row.status === "published");
	if (exposed.length === 0) return null;
	const used = exposed.filter((row) => row.assigned).length;
	const what = exposed.length === 1 ? "This test" : `These ${exposed.length} tests`;
	const who = used === exposed.length ? (used === 1 ? "It has" : "They have") : used === 1 ? "One of them has" : `${used} of them have`;
	const usedLine = used === 0 ? "" : ` ${who} already been set as a test, so a student who hasn't taken it yet could see the paper first.`;
	return `${what} will appear in every student's Practice at Home straight away.${usedLine}`;
}

/**
 * The sentence after a change, e.g. "Changed 3 tests to Practice, Easy."
 *
 * @param kept - Question-type drills that kept their type ({@link drillsKept}).
 */
export function detailsResultMessage(updates: readonly DetailsUpdate[], change: DetailsChange, asked: number, kept = 0): string {
	const keptLine =
		kept === 0 ? "" : ` ${kept === 1 ? "1 question-type practice set stays" : `${kept} question-type practice sets stay`} Practice.`;
	if (updates.length === 0) {
		if (kept > 0) return `Nothing changed.${keptLine}`;
		return asked === 1 ? "Nothing to change — it already is that." : "Nothing to change — they already are that.";
	}
	const to = [change.kind ? KIND_LABEL[change.kind] : null, change.difficulty ? DIFFICULTY_LABEL[change.difficulty] : null]
		.filter(Boolean)
		.join(", ");
	const skipped = asked - updates.length - kept;
	return `Changed ${updates.length === 1 ? "1 test" : `${updates.length} tests`} to ${to}.${skipped > 0 ? ` ${skipped} already ${skipped === 1 ? "was" : "were"}.` : ""}${keptLine}`;
}

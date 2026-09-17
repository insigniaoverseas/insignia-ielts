/**
 * Student screen view-models — the seam between the database and the screens.
 *
 * Every student screen renders from exactly one of these types. Nothing here is
 * a database row: these are what a screen *shows*, already resolved, already
 * formatted where formatting needs a server (dates, eligibility reasons).
 *
 * The server-only modules in `@/lib/queries` satisfy these types from
 * Supabase. Screens never receive raw database rows.
 *
 * Three rules these types enforce by construction:
 *
 * 1. **No answer key.** There is no field anywhere below that could carry a
 *    correct answer into a client bundle, except `ReviewQuestion.correctAnswer`
 *    — which is only ever populated for an attempt whose result has been
 *    released, and only inside the review screen (`MVP-1.md` §7).
 * 2. **The server owns the clock.** Times are ISO-8601 UTC strings, and
 *    remaining time is `secondsRemaining`, computed server-side. No screen calls
 *    `new Date()` to decide whether something is open.
 * 3. **A lock always states its reason.** `LockedReason` has no "just locked"
 *    member — if a thing cannot be started, the screen can always say why.
 */

/** The two skills MVP 1 tests. Matches `tests.skill`. */
export type Skill = "listening" | "reading";

/** Matches `tests.variant`. `n_a` is every Listening test. */
export type Variant = "academic" | "general" | "n_a";

/** Matches `tests.difficulty`. */
export type Difficulty = "easy" | "medium" | "hard";

/**
 * How a test is being taken. Matches `assignments.mode`.
 *
 * - `mock` — counts towards the student's band. No seeking, no replay.
 * - `class` — sat in the lab, invigilated. Same player rules as `mock`.
 * - `practice` — self-serve at home. Full audio controls, instant feedback.
 */
export type Mode = "mock" | "class" | "practice";

/** Matches `attempts.state`. */
export type AttemptState = "in_progress" | "submitted" | "expired" | "voided";

/**
 * Why a student cannot start a test right now. Every member carries the words
 * the screen shows — a locked card that doesn't say why is a defect
 * (`CLAUDE.md`, "Say what's happening and what to do").
 */
export type LockedReason =
	| { kind: "not_open_yet"; opensAt: string; message: string }
	| { kind: "closed"; closedAt: string; message: string }
	| { kind: "no_attempts_left"; used: number; allowed: number; message: string }
	| { kind: "plan_expired"; expiredOn: string; message: string }
	| { kind: "no_plan"; message: string }
	| { kind: "in_progress_elsewhere"; message: string };

/** The signed-in student, as every screen header needs them. */
export type StudentIdentity = {
	id: string;
	/** First name only — the home screen says "Hi Priya", not "Hi Priya Sharma". */
	firstName: string;
	fullName: string;
	/** Display form, e.g. "+91 98765 43210". Never raw digits. */
	phone: string;
	/** Every batch they are currently in. A student can be promoted into one
	 *  and added to another, so this is a list, not a name. */
	batchNames: string[];
	/** Who to ask when something is wrong — the answer to most support calls. */
	teacherName: string | null;
	branchName: string;
};

/** The student's access window. Drives the banner on every student screen. */
export type PlanStatus = {
	state: "active" | "expiring" | "expired" | "suspended" | "missing";
	/** ISO-8601 UTC. */
	startsOn: string;
	/** ISO-8601 UTC. */
	endsOn: string;
	/** Rendered `Asia/Kolkata`, e.g. "11 September 2026". */
	endsOnLabel: string;
	/** Negative once expired. Server-computed — never from a browser clock. */
	daysRemaining: number;
	/** 0–100, for the progress bar on Profile (13). */
	percentUsed: number;
};

/** One test as it appears in a list or on a card. */
export type TestSummary = {
	id: string;
	title: string;
	skill: Skill;
	variant: Variant;
	difficulty: Difficulty;
	questionCount: number;
	durationMinutes: number;
};

/**
 * A test assigned to this student, with its eligibility already resolved
 * (M2-04). `locked` is `null` exactly when the student may start it now.
 */
export type AssignedTest = {
	assignmentId: string;
	test: TestSummary;
	mode: Mode;
	/** ISO-8601 UTC, or null for "open now". */
	opensAt: string | null;
	/** ISO-8601 UTC, or null for "no closing time". */
	closesAt: string | null;
	/** Short human form of the window, e.g. "Closes today at 6:00 PM". */
	windowLabel: string | null;
	/**
	 * The same deadline split for the Home hero's stat row: a short value and
	 * its caption ("6:00 PM" / "closes today"). Separate from `windowLabel`
	 * because the hero sets the value in 24px mono and the caption in 14px —
	 * one sentence cannot be typeset as both.
	 */
	deadline: { value: string; caption: string } | null;
	attemptsUsed: number;
	attemptsAllowed: number;
	/** Set when an attempt is open and resumable. */
	resumeAttemptId: string | null;
	/** `null` means startable. Anything else must explain itself. */
	locked: LockedReason | null;
};

/** A finished attempt, as it appears in the "Done" list and on Home. */
export type CompletedAttempt = {
	attemptId: string;
	test: TestSummary;
	mode: Mode;
	/** ISO-8601 UTC. */
	submittedAt: string;
	/** Rendered `Asia/Kolkata`, e.g. "2 September". */
	submittedAtLabel: string;
	/**
	 * `null` while the teacher has not released the result. The screen shows
	 * "Your teacher will release this" rather than a number.
	 */
	result: AttemptResult | null;
};

/** A released result. Absent entirely when results are held. */
export type AttemptResult = {
	/** 0–9 in half steps, or `null` when the raw score is below the scale. */
	band: number | null;
	/** Set when `band` is null: the institute's "Below 4" marker (`M0-19`). */
	belowBand: string | null;
	/** Plain-English descriptor, e.g. "Good user". */
	descriptor: string;
	rawScore: number;
	maxScore: number;
	correctCount: number;
	wrongCount: number;
	/** Whole seconds the student actually took. */
	timeTakenSeconds: number;
	timeTakenLabel: string;
	sections: SectionScore[];
};

/** One section's contribution to a result (screen 09). */
export type SectionScore = {
	/** 1-based. */
	number: number;
	label: string;
	correct: number;
	total: number;
};

/** Screen 03 — Student Home. One obvious next action. */
export type StudentHome = {
	student: StudentIdentity;
	plan: PlanStatus;
	/** Today, rendered `Asia/Kolkata`, e.g. "Saturday, 6 September". */
	todayLabel: string;
	/**
	 * The single "Next up" card. `null` when nothing is assigned — the screen
	 * then offers "Practice at home" instead, which is why this is nullable
	 * rather than an empty list.
	 */
	nextUp: AssignedTest | null;
	counts: { testsToDo: number; testsDone: number; mistakesToReview: number };
	/** One friendly line at the foot of the screen. `null` before the first test. */
	lastResult: { band: number | null; belowBand: string | null; skill: Skill; dateLabel: string } | null;
	/** A one-line read on the trend, e.g. "Band is going up". */
	progressHint: string;
};

/** Screen 04 — My Tests. Three tabs, each a list of cards. */
export type MyTests = {
	toDo: AssignedTest[];
	practice: AssignedTest[];
	done: CompletedAttempt[];
};

/** Screen 05 — Pre-test instructions. */
export type PreTestBriefing = {
	assignment: AssignedTest;
	/** 4–5 plain rules. Written server-side so they can vary by mode. */
	rules: string[];
	/** Listening only: a short clip for the headphone check. */
	soundCheckUrl: string | null;
};

/**
 * Band over time, shaped for `BandTrendChart`: one shared timeline, one entry
 * per skill. `bands[i]` lines up with `dateLabels[i]`, and is `null` when that
 * skill was not tested on that date — which is most dates, since a student sits
 * one skill at a time.
 */
export type BandTrend = {
	/** Every date on which any test was taken, oldest first. */
	dateLabels: string[];
	series: { skill: Skill; bands: (number | null)[] }[];
};

/** Screen 11 — My Progress. */
export type MyProgress = {
	trend: BandTrend;
	/** Worst first — this is the "what to practise" list. */
	accuracyByType: { questionType: string; label: string; percent: number; attempted: number }[];
	/** One plain sentence of advice, composed server-side. */
	advice: string;
	testsTaken: number;
	/** `null` until at least one result is released. */
	averageBand: number | null;
};

/** Screen 12 — Practice at home. */
export type PracticeLibrary = {
	/** The one-line rule shown above the list. */
	rulesLine: string;
	items: (AssignedTest & { timesCompleted: number })[];
};

/** Screen 13 — Profile. */
export type StudentProfile = {
	student: StudentIdentity;
	plan: PlanStatus;
	devices: { id: string; label: string; lastUsedLabel: string; current: boolean }[];
};

/**
 * Screen 10 — Review my mistakes.
 *
 * Only ever built for an attempt whose result is released **and** whose
 * assignment allows review. `correctAnswer` below is the one place a correct
 * answer legitimately reaches a screen; it is still assembled server-side and
 * only for questions in this student's own finished attempt (`MVP-1.md` §7).
 */
export type MyMistakes = {
	attemptId: string;
	test: TestSummary;
	summary: { correct: number; wrong: number; total: number };
	questions: ReviewQuestion[];
};

/** One question in the review list. */
export type ReviewQuestion = {
	/** 1-based question number as the student saw it. */
	number: number;
	/** Sanitised HTML — already through `sanitizePassageHtml` on write and render. */
	promptHtml: string;
	questionType: string;
	questionTypeLabel: string;
	correct: boolean;
	/** What the student typed or chose. `null` when they left it blank. */
	givenAnswer: string | null;
	correctAnswer: string;
	/** The "Show why" expander: the sentence that proves it, already sanitised. */
	explanationHtml: string | null;
	/** Listening only: offset into the one audio file, in seconds. */
	audioOffsetSeconds: number | null;
};

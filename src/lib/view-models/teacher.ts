import type { Difficulty, Skill, Variant } from "./student";

/**
 * Teacher and invigilator view-models (screens 14–19, M6 and M7).
 *
 * Same contract as `./student` and `./admin`. One rule is specific to this
 * file: a teacher may see their **own current students'** answers and marks,
 * and nothing else. The types below carry a batch or an assignment as their
 * root precisely so a query that satisfies them is naturally scoped — there is
 * no "all students" shape here to reach for by accident (`MVP-1.md` §13).
 */

/** A batch as the dashboard shows it. */
export type TeacherBatch = {
	id: string;
	name: string;
	studentCount: number;
	/** `null` until somebody in the batch has a released result. */
	averageBand: number | null;
	/** How many results are sitting unreleased. The dashboard's call to action. */
	awaitingRelease: number;
};

/** One row of a batch roster (screen 15). */
export type RosterRow = {
	studentId: string;
	name: string;
	phone: string;
	lastBand: number | null;
	testsDone: number;
	planEndsLabel: string;
	daysRemaining: number;
	lastActiveLabel: string;
};

/** Screen 14 — Teacher dashboard. */
export type TeacherDashboard = {
	teacherName: string;
	batches: TeacherBatch[];
	/** Tests scheduled to run today, soonest first. */
	todaysTests: {
		assignmentId: string;
		testTitle: string;
		skill: Skill;
		batchName: string;
		whenLabel: string;
		/** Set while a session is actually running, so the row can link to the monitor. */
		liveSessionId: string | null;
	}[];
	/**
	 * The work queue. Each item says what it is and where it goes — a dashboard
	 * that lists problems without a destination just makes people feel behind.
	 */
	needsAttention: {
		id: string;
		kind: "release" | "override" | "expiring";
		summary: string;
		href: string;
	}[];
};

/** Screen 15 — Batch view. */
export type BatchView = {
	batchId: string;
	batchName: string;
	roster: RosterRow[];
};

/** A test as the assign flow lists it (screen 16, step 1). */
export type AssignableTest = {
	id: string;
	title: string;
	skill: Skill;
	variant: Variant;
	difficulty: Difficulty;
	questionCount: number;
	durationMinutes: number;
};

/** Screen 16 — Assign a test. Everything the three steps need to offer. */
export type AssignOptions = {
	tests: AssignableTest[];
	batches: { id: string; name: string; studentCount: number }[];
	students: { id: string; name: string; batchName: string | null }[];
};

/** One attempt in the results table (screen 18). */
export type AttemptResultRow = {
	attemptId: string;
	studentId: string;
	studentName: string;
	/** `null` when the attempt expired or was voided — `stateLabel` says which. */
	rawScore: number | null;
	band: number | null;
	bandLabel: string;
	timeTakenLabel: string;
	stateLabel: string;
	released: boolean;
	/**
	 * Anti-cheat signals (M9-01). **Flags, not blocks** — they are shown to a
	 * human who decides, and never used to fail an attempt automatically.
	 */
	flags: string[];
	/** Filled in when a row is expanded to override a mark. */
	answers?: OverridableAnswer[];
};

/**
 * One answer a teacher may re-mark (M6-05).
 *
 * This carries `correctAnswer`, so it is staff-only by construction and must
 * never be reached from a student route. An override always records a note —
 * the next person to look needs to know why a mark was changed by hand.
 */
export type OverridableAnswer = {
	questionNumber: number;
	givenAnswer: string | null;
	correctAnswer: string;
	awarded: number;
	max: number;
	overridden: boolean;
	overrideNote: string | null;
};

/** Screen 18 — Results & release, for one assignment. */
export type AssignmentResults = {
	assignmentId: string;
	testTitle: string;
	skill: Skill;
	batchName: string;
	rows: AttemptResultRow[];
	/** How many students were assigned but have not started. */
	notStarted: number;
};

/** Screen 19 — Class analytics. */
export type ClassAnalytics = {
	batchName: string;
	/** Count of students per half-band, low to high. */
	bandDistribution: { band: number; count: number }[];
	/** Worst first — the answer to "what do I teach tomorrow?". */
	weakestTypes: { questionType: string; label: string; percent: number; attempted: number }[];
	/** The individual questions most students got wrong. */
	mostMissed: { questionNumber: number; testTitle: string; wrongCount: number; total: number }[];
	studentCount: number;
	averageBand: number | null;
};

/** Screen 17 — Live session monitor (M7). One tile per student. */
export type LiveSession = {
	sessionId: string;
	testTitle: string;
	batchName: string;
	/** When the poll last succeeded, rendered `Asia/Kolkata`. */
	lastUpdatedLabel: string;
	students: LiveStudent[];
};

/** One student's tile in the monitor. */
export type LiveStudent = {
	attemptId: string;
	studentId: string;
	name: string;
	state: "not_started" | "in_progress" | "submitted" | "expired";
	/** Server-computed. `null` before they start and after they submit. */
	secondsRemaining: number | null;
	answered: number;
	total: number;
	/** Anti-cheat signals so far. Flags, never blocks. */
	flags: string[];
};

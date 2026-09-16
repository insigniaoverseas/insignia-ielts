import type { Difficulty, Skill, Variant } from "./student";

/**
 * Admin screen view-models (screens 20–27, M5).
 *
 * Same contract as `./student`: what the screen shows, already resolved and
 * already formatted. Staff screens are denser than the student side, but the
 * rules are the same — UTC in, `Asia/Kolkata` out, and nothing here carries an
 * answer key except the one screen whose whole job is editing it.
 */

/** Matches `users.status`. */
export type AccountStatus = "active" | "inactive" | "suspended";

/** Matches `student_plans.status`, as the expiry workqueue groups them. */
export type PlanState = "active" | "expiring" | "expired" | "suspended";

/** A row in the students table (21) and the plans workqueue (24). */
export type StudentRow = {
	id: string;
	name: string;
	/** Display form, e.g. "+91 98765 43210". */
	phone: string;
	batchName: string | null;
	status: AccountStatus;
	planState: PlanState;
	/** Rendered `Asia/Kolkata`, e.g. "21 Sep 2026". */
	planEndsLabel: string;
	/** Negative once expired. Server-computed. */
	daysRemaining: number;
	/** `null` until a result has been released. */
	lastBand: number | null;
	testsTaken: number;
	lastActiveLabel: string;
};

/** Screen 20 — Admin overview. */
export type AdminOverview = {
	stats: {
		activeStudents: number;
		testsThisWeek: number;
		expiringIn7Days: number;
		liveSessions: number;
	};
	/** Deltas are pre-composed sentences — "+12 since last week". */
	deltas: { activeStudents: string; testsThisWeek: string };
	/** The work the screen exists to surface, soonest first. */
	expiringSoon: StudentRow[];
	recentActivity: { id: string; whenLabel: string; actor: string; summary: string }[];
};

/** Screen 21 — Students list. */
export type StudentsList = {
	rows: StudentRow[];
	total: number;
	/** The batches offered in the filter, from what actually exists. */
	batches: { id: string; name: string }[];
};

/** Screen 23 — Student detail drawer. */
export type StudentDetail = {
	student: StudentRow;
	planHistory: { id: string; whenLabel: string; action: string; detail: string; actor: string }[];
	attempts: {
		attemptId: string;
		testTitle: string;
		skill: Skill;
		whenLabel: string;
		/** `null` while held or below the scale — `bandLabel` always has words. */
		band: number | null;
		bandLabel: string;
		state: string;
	}[];
	auditTrail: { id: string; whenLabel: string; actor: string; summary: string }[];
};

/** Screen 24 — Plans & validity, the expiry workqueue. */
export type PlansWorkqueue = {
	expired: StudentRow[];
	expiringThisWeek: StudentRow[];
	expiringThisMonth: StudentRow[];
};

/** Screen 25 — Batches. */
export type BatchRow = {
	id: string;
	name: string;
	branchName: string;
	teacherNames: string[];
	studentCount: number;
	/** `null` for an open-ended batch. */
	startsLabel: string | null;
	endsLabel: string | null;
	status: "active" | "completed" | "archived";
};

/** Screen 26 — Test library. */
export type TestLibraryRow = {
	id: string;
	title: string;
	skill: Skill;
	variant: Variant;
	difficulty: Difficulty;
	questionCount: number;
	status: "draft" | "published" | "archived";
	/** How many of the question keys are filled in — drives "34 of 40". */
	keysEntered: number;
	tags: string[];
	updatedLabel: string;
};

/**
 * Screen 27 — Answer key editor.
 *
 * ⚠️ **The only screen in the product that carries correct answers to a
 * browser**, and only for a user holding `test.publish` (`lib/rbac.ts`). It is
 * a staff screen behind two gates, never reachable from a student route, and
 * the rows below must never be reused by any student-facing view-model.
 */
export type AnswerKeyEditor = {
	testId: string;
	testTitle: string;
	skill: Skill;
	rows: AnswerKeyRow[];
};

/** One question's key. */
export type AnswerKeyRow = {
	number: number;
	questionType: string;
	questionTypeLabel: string;
	/** The canonical answer. Empty string means "not entered yet". */
	answer: string;
	/** Other spellings that also score — "20" and "twenty". */
	acceptedVariants: string[];
	marks: number;
};

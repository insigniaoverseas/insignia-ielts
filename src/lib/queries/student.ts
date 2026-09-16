import "server-only";

import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

import { SESSION_COOKIE } from "@/lib/auth/sessions";
import { QUESTION_TYPES, isQuestionType } from "@/lib/question-types";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDateTime, formatTime, INSTITUTE_TIME_ZONE } from "@/lib/time";
import type {
	AssignedTest,
	AttemptResult,
	CompletedAttempt,
	LockedReason,
	Mode,
	MyProgress,
	MyTests,
	PlanStatus,
	PracticeLibrary,
	PreTestBriefing,
	SectionScore,
	StudentHome,
	StudentIdentity,
	StudentProfile,
	TestSummary,
} from "@/lib/view-models/student";
import {
	daysUntil,
	displayPhone,
	formatDayMonth,
	formatDuration,
	instituteToday,
	queryFailed,
	relativeActivity,
	testSummary,
} from "./shared";

type Client = SupabaseClient<Database>;
type Tables = Database["public"]["Tables"];
type Assignment = Tables["assignments"]["Row"];
type Attempt = Tables["attempts"]["Row"];
type Score = Tables["attempt_scores"]["Row"];
type TestRow = Tables["tests"]["Row"];

type StudentContext = {
	student: StudentIdentity;
	plan: PlanStatus;
};

const TEST_FIELDS =
	"id, title, skill, variant, difficulty, total_questions, duration_seconds, kind, status, practice_question_type" as const;

async function signedInUserId(supabase: Client): Promise<string> {
	const { data } = await supabase.auth.getClaims();
	const id = data?.claims?.sub;
	if (!id) throw new Error("A signed-in user is required.");
	return id;
}

function planStatus(
	row: Tables["student_plans"]["Row"] | null,
): PlanStatus {
	if (!row) {
		return {
			state: "missing",
			startsOn: "",
			endsOn: "",
			endsOnLabel: "No plan set",
			daysRemaining: -1,
			percentUsed: 0,
		};
	}

	const remaining = daysUntil(row.expires_on);
	const total = Math.max(1, Date.parse(`${row.expires_on}T00:00:00Z`) - Date.parse(`${row.starts_on}T00:00:00Z`));
	const used = Math.max(0, Date.parse(`${instituteToday()}T00:00:00Z`) - Date.parse(`${row.starts_on}T00:00:00Z`));
	const state =
		row.status === "suspended"
			? "suspended"
			: remaining < 0 || row.status === "expired"
				? "expired"
				: remaining <= 7
					? "expiring"
					: "active";

	return {
		state,
		startsOn: row.starts_on,
		endsOn: row.expires_on,
		endsOnLabel: formatDate(row.expires_on),
		daysRemaining: remaining,
		percentUsed: Math.min(100, Math.round((used / total) * 100)),
	};
}

async function loadStudentContext(supabase: Client, userId: string): Promise<StudentContext> {
	const [profileResult, planResult, membershipResult] = await Promise.all([
		supabase.from("users").select("id, name, phone, country_code, branch_id").eq("id", userId).maybeSingle(),
		supabase
			.from("student_plans")
			.select("*")
			.eq("student_id", userId)
			.order("expires_on", { ascending: false })
			.limit(1)
			.maybeSingle(),
		supabase
			.from("batch_students")
			.select("batch_id")
			.eq("student_id", userId)
			.is("left_at", null)
			.limit(1)
			.maybeSingle(),
	]);

	if (profileResult.error || !profileResult.data) queryFailed("student profile", profileResult.error);
	if (planResult.error) queryFailed("student plan", planResult.error);
	if (membershipResult.error) queryFailed("student batch membership", membershipResult.error);

	const profile = profileResult.data;
	const batchId = membershipResult.data?.batch_id ?? null;
	const [branchResult, batchResult] = await Promise.all([
		supabase.from("branches").select("name").eq("id", profile.branch_id).maybeSingle(),
		batchId ? supabase.from("batches").select("name").eq("id", batchId).maybeSingle() : Promise.resolve({ data: null, error: null }),
	]);

	if (branchResult.error) queryFailed("student branch", branchResult.error);
	if (batchResult.error) queryFailed("student batch", batchResult.error);

	return {
		student: {
			id: profile.id,
			firstName: profile.name.trim().split(/\s+/)[0] ?? profile.name,
			fullName: profile.name,
			phone: displayPhone(profile.country_code, profile.phone),
			batchName: batchResult.data?.name ?? null,
			// The student RLS policy intentionally hides staff assignments.
			teacherName: null,
			branchName: branchResult.data?.name ?? "Your centre",
		},
		plan: planStatus(planResult.data),
	};
}

function modeFor(kind: string): Mode {
	return kind === "practice" || kind === "class" ? kind : "mock";
}

function planLock(plan: PlanStatus): LockedReason | null {
	if (plan.state === "missing") return { kind: "no_plan", message: "Your teacher needs to add an access plan first." };
	if (plan.state === "suspended") {
		return { kind: "plan_expired", expiredOn: plan.endsOn, message: "Your access is paused. Ask your teacher to restore it." };
	}
	if (plan.state === "expired") {
		return {
			kind: "plan_expired",
			expiredOn: plan.endsOn,
			message: "You can't start this because your access has ended.",
		};
	}
	return null;
}

function assignedTest(
	assignment: Assignment,
	test: TestRow,
	attempts: Attempt[],
	extraAttempts: number,
	plan: PlanStatus,
	now = new Date(),
): AssignedTest | null {
	const summary = testSummary(test);
	if (!summary) return null;
	const ownAttempts = attempts.filter((attempt) => attempt.assignment_id === assignment.id);
	const resume = ownAttempts.find((attempt) => attempt.status === "in_progress") ?? null;
	const allowed = assignment.max_attempts + extraAttempts;
	let locked: LockedReason | null = null;

	if (!resume) locked = planLock(plan);
	if (!resume && !locked && new Date(assignment.available_from) > now) {
		locked = {
			kind: "not_open_yet",
			opensAt: assignment.available_from,
			message: `This opens on ${formatDateTime(assignment.available_from)}.`,
		};
	}
	if (!resume && !locked && assignment.due_by && new Date(assignment.due_by) < now) {
		locked = {
			kind: "closed",
			closedAt: assignment.due_by,
			message: `This closed on ${formatDateTime(assignment.due_by)}.`,
		};
	}
	if (!resume && !locked && ownAttempts.length >= allowed) {
		locked = {
			kind: "no_attempts_left",
			used: ownAttempts.length,
			allowed,
			message: `You've used all ${allowed} ${allowed === 1 ? "attempt" : "attempts"} on this test.`,
		};
	}

	return {
		assignmentId: assignment.id,
		test: summary,
		mode: modeFor(test.kind),
		opensAt: assignment.available_from,
		closesAt: assignment.due_by,
		windowLabel: assignment.due_by ? `Closes ${formatDateTime(assignment.due_by)}` : null,
		deadline: assignment.due_by
			? { value: formatTime(assignment.due_by), caption: `closes ${formatDayMonth(assignment.due_by)}` }
			: null,
		attemptsUsed: ownAttempts.length,
		attemptsAllowed: allowed,
		resumeAttemptId: resume?.id ?? null,
		locked,
	};
}

function practiceTest(test: TestRow, attempts: Attempt[], plan: PlanStatus): AssignedTest | null {
	const summary = testSummary(test);
	if (!summary) return null;
	const ownAttempts = attempts.filter((attempt) => attempt.test_id === test.id && attempt.assignment_id === null);
	const resume = ownAttempts.find((attempt) => attempt.status === "in_progress") ?? null;
	return {
		assignmentId: `practice:${test.id}`,
		test: summary,
		mode: "practice",
		opensAt: null,
		closesAt: null,
		windowLabel: null,
		deadline: null,
		attemptsUsed: ownAttempts.length,
		attemptsAllowed: 99,
		resumeAttemptId: resume?.id ?? null,
		locked: resume ? null : planLock(plan),
	};
}

function sectionScores(raw: Json, test: TestSummary): SectionScore[] {
	if (!Array.isArray(raw)) return [];
	return raw.flatMap((item, index) => {
		if (typeof item !== "object" || item === null || Array.isArray(item)) return [];
		const correct = typeof item.correct === "number" ? item.correct : null;
		const total = typeof item.total === "number" ? item.total : null;
		if (correct === null || total === null) return [];
		return [{ number: index + 1, label: test.skill === "listening" ? `Section ${index + 1}` : `Passage ${index + 1}`, correct, total }];
	});
}

function descriptor(band: number | null): string {
	if (band === null) return "Below the current band scale";
	if (band >= 8) return "Very good user";
	if (band >= 7) return "Good user";
	if (band >= 6) return "Competent user";
	if (band >= 5) return "Modest user";
	return "Developing user";
}

function completedAttempt(attempt: Attempt, test: TestRow, score: Score | null): CompletedAttempt | null {
	const summary = testSummary(test);
	if (!summary || !attempt.submitted_at) return null;
	const result: AttemptResult | null = score
		? {
				band: score.band,
				belowBand: score.band === null && score.below_band !== null ? `Below ${score.below_band}` : null,
				descriptor: descriptor(score.band),
				rawScore: Number(score.raw_score),
				maxScore: summary.questionCount,
				correctCount: Math.round(Number(score.raw_score)),
				wrongCount: Math.max(0, summary.questionCount - Math.round(Number(score.raw_score))),
				timeTakenSeconds: Math.max(0, Math.round((new Date(attempt.submitted_at).getTime() - new Date(attempt.started_at).getTime()) / 1000)),
				timeTakenLabel: formatDuration((new Date(attempt.submitted_at).getTime() - new Date(attempt.started_at).getTime()) / 1000),
				sections: sectionScores(score.section_scores, summary),
			}
		: null;

	return {
		attemptId: attempt.id,
		test: summary,
		mode: modeFor(attempt.kind),
		submittedAt: attempt.submitted_at,
		submittedAtLabel: formatDayMonth(attempt.submitted_at),
		result,
	};
}

/** Screen 04 — assignments, practice catalogue and completed attempts from Supabase. */
export async function getMyTests(): Promise<MyTests> {
	const supabase = await createClient();
	const userId = await signedInUserId(supabase);
	const context = await loadStudentContext(supabase, userId);
	const [assignmentResult, testsResult, attemptsResult, unlocksResult] = await Promise.all([
		supabase.from("assignments").select("*").order("available_from"),
		supabase.from("tests").select(TEST_FIELDS).in("skill", ["listening", "reading"]).order("updated_at", { ascending: false }),
		supabase.from("attempts").select("*").eq("student_id", userId).order("started_at", { ascending: false }),
		supabase.from("assignment_unlocks").select("assignment_id, extra_attempts, until").eq("student_id", userId),
	]);
	if (assignmentResult.error) queryFailed("student assignments", assignmentResult.error);
	if (testsResult.error) queryFailed("student tests", testsResult.error);
	if (attemptsResult.error) queryFailed("student attempts", attemptsResult.error);
	if (unlocksResult.error) queryFailed("student assignment unlocks", unlocksResult.error);

	const tests = (testsResult.data ?? []) as TestRow[];
	const attempts = (attemptsResult.data ?? []) as Attempt[];
	const testsById = new Map(tests.map((test) => [test.id, test]));
	const now = new Date();
	const extras = new Map<string, number>();
	for (const unlock of unlocksResult.data ?? []) {
		if (new Date(unlock.until) > now) extras.set(unlock.assignment_id, (extras.get(unlock.assignment_id) ?? 0) + unlock.extra_attempts);
	}

	const toDo = (assignmentResult.data ?? []).flatMap((assignment) => {
		const test = testsById.get(assignment.test_id);
		if (!test) return [];
		const item = assignedTest(assignment, test, attempts, extras.get(assignment.id) ?? 0, context.plan, now);
		return item ? [item] : [];
	});

	const practice = tests
		.filter((test) => test.kind === "practice" && test.status === "published")
		.flatMap((test) => {
			const item = practiceTest(test, attempts, context.plan);
			return item ? [item] : [];
		});

	const finished = attempts.filter((attempt) => attempt.status !== "in_progress" && attempt.submitted_at);
	const scoreResult = finished.length
		? await supabase.from("attempt_scores").select("*").in("attempt_id", finished.map((attempt) => attempt.id))
		: { data: [] as Score[], error: null };
	if (scoreResult.error) queryFailed("student scores", scoreResult.error);
	const scores = new Map((scoreResult.data ?? []).map((score) => [score.attempt_id, score]));
	const done = finished.flatMap((attempt) => {
		const test = testsById.get(attempt.test_id);
		if (!test) return [];
		const item = completedAttempt(attempt, test, scores.get(attempt.id) ?? null);
		return item ? [item] : [];
	});

	return { toDo, practice, done };
}

/** Screen 03 — the student's real next action and result counts. */
export async function getStudentHome(): Promise<StudentHome> {
	const supabase = await createClient();
	const userId = await signedInUserId(supabase);
	const context = await loadStudentContext(supabase, userId);
	const tests = await getMyTests();
	const released = tests.done.filter((attempt) => attempt.result !== null);
	const last = released[0] ?? null;
	const previous = released[1] ?? null;
	const lastBand = last?.result?.band ?? null;
	const previousBand = previous?.result?.band ?? null;

	return {
		...context,
		todayLabel: new Intl.DateTimeFormat("en-IN", {
			timeZone: INSTITUTE_TIME_ZONE,
			weekday: "long",
			day: "numeric",
			month: "long",
		}).format(new Date()),
		nextUp: tests.toDo.find((item) => item.resumeAttemptId !== null) ?? tests.toDo.find((item) => item.locked === null) ?? tests.toDo[0] ?? null,
		counts: {
			testsToDo: tests.toDo.length,
			testsDone: tests.done.length,
			mistakesToReview: released.reduce((total, attempt) => total + (attempt.result?.wrongCount ?? 0), 0),
		},
		lastResult: last?.result
			? { band: last.result.band, belowBand: last.result.belowBand, skill: last.test.skill, dateLabel: last.submittedAtLabel }
			: null,
		progressHint:
			lastBand !== null && previousBand !== null
				? lastBand > previousBand
					? "Band is going up"
					: lastBand < previousBand
					? "A little more practice will help"
					: "Band is holding steady"
				: tests.done.length === 0
					? "Your first test is waiting"
					: "See your latest results",
	};
}

/** Screen 05 — briefing metadata from the visible assignment or practice test. */
export async function getPreTestBriefing(assignmentId: string): Promise<PreTestBriefing | null> {
	const tests = await getMyTests();
	const assignment = [...tests.toDo, ...tests.practice].find((item) => item.assignmentId === assignmentId) ?? null;
	if (!assignment) return null;
	const listening = assignment.test.skill === "listening";
	const mock = assignment.mode !== "practice";
	return {
		assignment,
		rules: [
			"The timer starts when you press Start, and it will not stop.",
			...(listening && mock ? ["The audio plays once. You cannot rewind it, just like the real test."] : []),
			...(listening && !mock ? ["You can pause and replay the audio as much as you like."] : []),
			"Your answers save by themselves. If the internet drops, keep working.",
			"You can mark a question and come back to it before you finish.",
			"Spelling counts. Write numbers as digits unless the question says otherwise.",
		],
		// Cloudflare/R2 audio delivery is intentionally deferred.
		soundCheckUrl: null,
	};
}

/** Screen 09 — one owned finished attempt; score visibility is decided by RLS. */
export async function getAttemptResult(attemptId: string): Promise<CompletedAttempt | null> {
	const supabase = await createClient();
	const { data: attempt, error } = await supabase.from("attempts").select("*").eq("id", attemptId).maybeSingle();
	if (error) queryFailed("attempt result", error);
	if (!attempt || !attempt.submitted_at) return null;
	const [testResult, scoreResult] = await Promise.all([
		supabase.from("tests").select(TEST_FIELDS).eq("id", attempt.test_id).maybeSingle(),
		supabase.from("attempt_scores").select("*").eq("attempt_id", attempt.id).maybeSingle(),
	]);
	if (testResult.error) queryFailed("attempt test", testResult.error);
	if (scoreResult.error) queryFailed("attempt score", scoreResult.error);
	if (!testResult.data) return null;
	return completedAttempt(attempt, testResult.data as TestRow, scoreResult.data);
}

/** Screen 11 — released scores and question-type accuracy from Supabase. */
export async function getMyProgress(): Promise<MyProgress> {
	const supabase = await createClient();
	const tests = await getMyTests();
	const released = tests.done.filter((attempt): attempt is CompletedAttempt & { result: AttemptResult } => attempt.result !== null).reverse();
	const dates = released.map((attempt) => attempt.submittedAtLabel);
	const trendSkills = (["listening", "reading"] as const).map((skill) => ({
		skill,
		bands: released.map((attempt) => (attempt.test.skill === skill ? attempt.result.band : null)),
	}));

	const ids = released.map((attempt) => attempt.attemptId);
	const markResult = ids.length
		? await supabase.from("answer_marks").select("attempt_id, question_type, is_correct").in("attempt_id", ids)
		: { data: [], error: null };
	if (markResult.error) queryFailed("student answer accuracy", markResult.error);
	const accuracy = new Map<string, { correct: number; total: number }>();
	for (const mark of markResult.data ?? []) {
		const current = accuracy.get(mark.question_type) ?? { correct: 0, total: 0 };
		current.total += 1;
		if (mark.is_correct) current.correct += 1;
		accuracy.set(mark.question_type, current);
	}
	const accuracyByType = [...accuracy.entries()]
		.map(([questionType, value]) => ({
			questionType,
			label: isQuestionType(questionType) ? QUESTION_TYPES[questionType].officialName : questionType.replaceAll("_", " "),
			percent: Math.round((value.correct / value.total) * 100),
			attempted: value.total,
		}))
		.sort((a, b) => a.percent - b.percent);
	const weakest = accuracyByType[0];
	const numericBands = released.flatMap((attempt) => (attempt.result.band === null ? [] : [attempt.result.band]));

	return {
		trend: { dateLabels: dates, series: trendSkills },
		accuracyByType,
		advice: weakest ? `${weakest.label} is costing you the most marks. Practise it twice this week.` : "Finish a released test to see what to practise.",
		testsTaken: tests.done.length,
		averageBand: numericBands.length ? numericBands.reduce((sum, band) => sum + band, 0) / numericBands.length : null,
	};
}

/** Screen 12 — published practice catalogue and real completion counts. */
export async function getPracticeLibrary(): Promise<PracticeLibrary> {
	const tests = await getMyTests();
	return {
		rulesLine: "Practice tests don't count towards your band. Take them as many times as you like.",
		items: tests.practice.map((item) => ({ ...item, timesCompleted: item.attemptsUsed })),
	};
}

/** Screen 13 — identity, plan and live application sessions. */
export async function getStudentProfile(): Promise<StudentProfile> {
	const supabase = await createClient();
	const userId = await signedInUserId(supabase);
	const context = await loadStudentContext(supabase, userId);
	const { data: sessions, error } = await supabase
		.from("user_sessions")
		.select("id, user_agent, last_seen_at, revoked_at")
		.eq("user_id", userId)
		.is("revoked_at", null)
		.order("last_seen_at", { ascending: false });
	if (error) queryFailed("student sessions", error);
	const currentId = (await cookies()).get(SESSION_COOKIE)?.value;
	return {
		...context,
		devices: (sessions ?? []).map((session) => ({
			id: session.id,
			label: session.user_agent ? session.user_agent.split(" ").slice(0, 4).join(" ") : "Unknown browser",
			lastUsedLabel: relativeActivity(session.last_seen_at),
			current: session.id === currentId,
		})),
	};
}

/** Whether review is released and allowed; R2 question/key content lands later. */
export async function getReviewAvailability(attemptId: string): Promise<{ attempt: CompletedAttempt; allowed: boolean } | null> {
	const attempt = await getAttemptResult(attemptId);
	if (!attempt || !attempt.result) return null;
	const supabase = await createClient();
	const { data, error } = await supabase.from("attempts").select("assignment_id").eq("id", attemptId).maybeSingle();
	if (error) queryFailed("review attempt", error);
	if (!data?.assignment_id) return { attempt, allowed: true };
	const { data: assignment, error: assignmentError } = await supabase
		.from("assignments")
		.select("allow_review")
		.eq("id", data.assignment_id)
		.maybeSingle();
	if (assignmentError) queryFailed("review assignment", assignmentError);
	return { attempt, allowed: assignment?.allow_review === true };
}

import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { SESSION_COOKIE } from "@/lib/auth/session-cookie";
import { timeTakenSeconds } from "@/lib/attempts/clock";
import { buildReview } from "@/lib/attempts/review";
import { audioCacheKey } from "@/lib/audio-cache-key";
import { deviceRows } from "@/lib/auth/devices";
import { QUESTION_TYPES, isQuestionType } from "@/lib/question-types";
import type { Database, Json } from "@/lib/supabase/database.types";
import { readAnswerKeyObject, readContentObject } from "@/lib/r2";
import { answerKeyObjectKey, contentObjectKey } from "@/lib/r2-keys";
import { answerKeySchema } from "@/lib/scoring";
import { sanitizePassageHtml } from "@/lib/security/sanitize";
import { createClient } from "@/lib/supabase/server";
import { testContentSchema } from "@/lib/test-content";
import { formatDate, formatDateTime, formatTime, INSTITUTE_TIME_ZONE } from "@/lib/time";
import type {
	AssignedTest,
	AttemptResult,
	CompletedAttempt,
	MistakesLoad,
	LockedReason,
	Mode,
	MyProgress,
	MyTests,
	PlanStatus,
	PracticeLibrary,
	PreTestBriefing,
	SectionScore,
	StudentBundle,
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

/**
 * The student's identity and plan — the header every student screen needs.
 *
 * **One round trip, and one per request.** Both properties are deliberate and
 * both were costing real time:
 *
 * - It used to be two queries, the second waiting on `branch_id` and the batch
 *   ids from the first. Supabase answers in ~235 ms regardless of how much a
 *   query asks for, so a second *sequential* step costs a quarter-second while
 *   a wider single query costs nothing. `branches`, `batch_students → batches`
 *   and `student_plans` are now embedded.
 * - It is wrapped in `cache()` because `getStudentHome` calls it *and* calls
 *   `getMyTests`, which called it again — the same context fetched twice per
 *   page load.
 *
 * Keyed on `userId` alone, so the Supabase client is created inside rather than
 * passed in: a fresh client object as an argument would defeat the memoisation.
 */
const loadStudentContext = cache(async function loadStudentContext(userId: string): Promise<StudentContext> {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from("users")
		.select(
			// `student_plans` reaches `users` twice (student_id and created_by),
			// so the foreign key is named explicitly or PostgREST refuses.
			"id, name, phone, country_code, branches ( name ), batch_students ( batches ( name, status ) ), student_plans!student_plans_student_id_fkey ( * )",
		)
		.eq("id", userId)
		.is("batch_students.left_at", null)
		.order("expires_on", { ascending: false, referencedTable: "student_plans" })
		.limit(1, { referencedTable: "student_plans" })
		.maybeSingle();

	if (error || !data) queryFailed("student profile", error);

	return {
		student: {
			id: data.id,
			firstName: data.name.trim().split(/\s+/)[0] ?? data.name,
			fullName: data.name,
			phone: displayPhone(data.country_code, data.phone),
			// A removed batch isn't theirs any more (M10-14).
			batchNames: data.batch_students.flatMap((row) => (row.batches && row.batches.status !== "archived" ? row.batches.name : [])),
			// The student RLS policy intentionally hides staff assignments.
			teacherName: null,
			branchName: data.branches?.name ?? "Your centre",
		},
		plan: planStatus(data.student_plans[0] ?? null),
	};
});

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
			message: allowed === 1 ? "You've used your 1 attempt on this test." : `You've used all ${allowed} attempts on this test.`,
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
				timeTakenSeconds: timeTakenSeconds({ ...attempt, submitted_at: attempt.submitted_at }),
				timeTakenLabel: formatDuration(timeTakenSeconds({ ...attempt, submitted_at: attempt.submitted_at })),
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

/**
 * Everything the four student tabs read — Home, My Tests, Progress, Profile —
 * in **one** round trip: seven queries sent at the same time, each scoped by
 * the student's own RLS. Memoised for the request, so the layout building the
 * whole bundle ({@link getStudentBundle}) and any loader below share it.
 *
 * Scores ride embedded in the attempts query; answer marks and sessions are
 * filtered to this student explicitly as well as by RLS.
 */
const loadStudentReads = cache(async function loadStudentReads() {
	const supabase = await createClient();
	const userId = await signedInUserId(supabase);
	const [context, assignmentResult, testsResult, attemptsResult, unlocksResult, marksResult, sessionsResult] =
		await Promise.all([
			loadStudentContext(userId),
			supabase.from("assignments").select("*").order("available_from"),
			supabase.from("tests").select(TEST_FIELDS).in("skill", ["listening", "reading"]).order("updated_at", { ascending: false }),
			// RLS applies to the embedded scores too: an unreleased score comes back null.
			supabase.from("attempts").select("*, attempt_scores(*)").eq("student_id", userId).order("started_at", { ascending: false }),
			supabase.from("assignment_unlocks").select("assignment_id, extra_attempts, until").eq("student_id", userId),
			supabase
				.from("answer_marks")
				.select("attempt_id, question_type, is_correct, attempts!inner(student_id)")
				.eq("attempts.student_id", userId),
			supabase
				.from("user_sessions")
				.select("id, user_agent, last_seen_at, revoked_at")
				.eq("user_id", userId)
				.is("revoked_at", null)
				.order("last_seen_at", { ascending: false }),
		]);
	if (assignmentResult.error) queryFailed("student assignments", assignmentResult.error);
	if (testsResult.error) queryFailed("student tests", testsResult.error);
	if (attemptsResult.error) queryFailed("student attempts", attemptsResult.error);
	if (unlocksResult.error) queryFailed("student assignment unlocks", unlocksResult.error);
	if (marksResult.error) queryFailed("student answer accuracy", marksResult.error);
	if (sessionsResult.error) queryFailed("student sessions", sessionsResult.error);

	return {
		context,
		assignments: assignmentResult.data ?? [],
		tests: (testsResult.data ?? []) as TestRow[],
		attempts: attemptsResult.data ?? [],
		unlocks: unlocksResult.data ?? [],
		marks: marksResult.data ?? [],
		sessions: sessionsResult.data ?? [],
	};
});

/** Screen 04 — assignments, practice catalogue and completed attempts. No queries of its own. */
export const getMyTests = cache(async function getMyTests(): Promise<MyTests> {
	const { context, assignments, tests, attempts: attemptRows, unlocks } = await loadStudentReads();

	const attempts: Attempt[] = attemptRows;
	const scores = new Map<string, Score>(
		attemptRows.flatMap((row) => (row.attempt_scores ? [[row.id, row.attempt_scores] as const] : [])),
	);
	const testsById = new Map(tests.map((test) => [test.id, test]));
	const now = new Date();
	const extras = new Map<string, number>();
	for (const unlock of unlocks) {
		if (new Date(unlock.until) > now) extras.set(unlock.assignment_id, (extras.get(unlock.assignment_id) ?? 0) + unlock.extra_attempts);
	}

	const toDo = assignments.flatMap((assignment) => {
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
	const done = finished.flatMap((attempt) => {
		const test = testsById.get(attempt.test_id);
		if (!test) return [];
		const item = completedAttempt(attempt, test, scores.get(attempt.id) ?? null);
		return item ? [item] : [];
	});

	return { toDo, practice, done };
});

/** Screen 03 — the student's real next action and result counts. */
export async function getStudentHome(): Promise<StudentHome> {
	const [{ context }, tests] = await Promise.all([loadStudentReads(), getMyTests()]);
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
			mock
				? "The timer starts when you press Start, and it will not stop — not even if you leave the page."
				: "The timer starts when you press Start. It pauses if you leave, and carries on when you come back.",
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

/** The audio a student may download on screen 05, before Start (M2-06). */
export type PreStartAudio = {
	/** The R2 object's identity. Never sent to the browser as a key. */
	testId: string;
	contentVersion: number;
	/** Where the browser caches it — names the student, so it purges per owner. */
	cacheKey: string;
	ownerId: string;
};

/**
 * Which audio file a student may download from the pre-test screen, or `null`.
 *
 * Only for a Listening test they may start now (or resume), so the download
 * is gated exactly like Start is. The version is the one Start will pin: the
 * test's current `content_version`, or the open attempt's when resuming.
 *
 * @param briefing The result of {@link getPreTestBriefing} for the same ref.
 */
export async function getPreStartAudio(briefing: PreTestBriefing): Promise<PreStartAudio | null> {
	const { assignment } = briefing;
	if (assignment.test.skill !== "listening") return null;
	if (assignment.locked && !assignment.resumeAttemptId) return null;
	const supabase = await createClient();
	const ownerId = await signedInUserId(supabase);
	const [testResult, attemptResult] = await Promise.all([
		supabase.from("tests").select("content_version, audio_duration_seconds").eq("id", assignment.test.id).maybeSingle(),
		assignment.resumeAttemptId
			? supabase
					.from("attempts")
					.select("content_version")
					.eq("id", assignment.resumeAttemptId)
					.eq("student_id", ownerId)
					.maybeSingle()
			: Promise.resolve({ data: null, error: null }),
	]);
	if (testResult.error) queryFailed("pre-start audio test", testResult.error);
	if (attemptResult.error) queryFailed("pre-start audio attempt", attemptResult.error);
	if (!testResult.data?.audio_duration_seconds) return null;
	const contentVersion = attemptResult.data?.content_version ?? testResult.data.content_version;
	return {
		testId: assignment.test.id,
		contentVersion,
		cacheKey: audioCacheKey(ownerId, assignment.test.id, contentVersion),
		ownerId,
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
	const [{ marks }, tests] = await Promise.all([loadStudentReads(), getMyTests()]);
	const released = tests.done.filter((attempt): attempt is CompletedAttempt & { result: AttemptResult } => attempt.result !== null).reverse();
	const dates = released.map((attempt) => attempt.submittedAtLabel);
	const trendSkills = (["listening", "reading"] as const).map((skill) => ({
		skill,
		bands: released.map((attempt) => (attempt.test.skill === skill ? attempt.result.band : null)),
	}));

	// Only released results count, as before the marks joined the shared read.
	const ids = new Set(released.map((attempt) => attempt.attemptId));
	const accuracy = new Map<string, { correct: number; total: number }>();
	for (const mark of marks.filter((row) => ids.has(row.attempt_id))) {
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
	const { context, sessions } = await loadStudentReads();
	const currentId = (await cookies()).get(SESSION_COOKIE)?.value;
	return {
		...context,
		devices: deviceRows(sessions, currentId, (iso) => relativeActivity(iso)),
	};
}

/**
 * The data for all four student tabs at once (Home, My Tests, Progress,
 * Profile), for the student layout to hand to the browser.
 *
 * One round trip to the database ({@link loadStudentReads}); the four view
 * models are then built from those rows with no further queries. Only view
 * models leave the server, never raw rows.
 */
export const getStudentBundle = cache(async function getStudentBundle(): Promise<StudentBundle> {
	const [home, tests, progress, profile] = await Promise.all([
		getStudentHome(),
		getMyTests(),
		getMyProgress(),
		getStudentProfile(),
	]);
	return { home, tests, progress, profile };
});


/**
 * Screen 10 — Review my mistakes (M4-01).
 *
 * The gate is {@link getReviewAvailability}: this student's own finished
 * attempt, its result released, its assignment allowing review. Only then is
 * `key.json` read — through the R2 binding, at the attempt's pinned
 * `content_version` — and joined to the student's answers and the marks the
 * score was built from. Rendered on the server; the page hands a client
 * component only these rows, never the key.
 *
 * @returns `null` when the student may not review this attempt.
 */
export async function getMyMistakes(attemptId: string): Promise<MistakesLoad | null> {
	const review = await getReviewAvailability(attemptId);
	if (!review || !review.allowed) return null;
	const supabase = await createClient();
	const userId = await signedInUserId(supabase);

	const [attemptResult, answersResult, marksResult] = await Promise.all([
		supabase
			.from("attempts")
			.select("test_id, content_version")
			.eq("id", attemptId)
			.eq("student_id", userId)
			.maybeSingle(),
		supabase.from("answers").select("q_number, given_answer").eq("attempt_id", attemptId),
		supabase.from("answer_marks").select("q_number, is_correct").eq("attempt_id", attemptId),
	]);
	if (attemptResult.error) queryFailed("review attempt row", attemptResult.error);
	if (answersResult.error) queryFailed("review answers", answersResult.error);
	if (marksResult.error) queryFailed("review marks", marksResult.error);
	const attempt = attemptResult.data;
	if (!attempt) return null;

	const [keyObject, contentObject] = await Promise.all([
		readAnswerKeyObject(answerKeyObjectKey(attempt.test_id, attempt.content_version)),
		readContentObject(contentObjectKey(attempt.test_id, attempt.content_version)),
	]);
	if (!keyObject || !contentObject) return { problem: "content_missing", attempt: review.attempt };
	const key = answerKeySchema.safeParse(await keyObject.json());
	const content = testContentSchema.safeParse(await contentObject.json());
	if (!key.success || !content.success) {
		console.error("review:", key.success ? content.error?.message : key.error.message);
		return { problem: "content_missing", attempt: review.attempt };
	}

	const built = buildReview(content.data, key.data, answersResult.data ?? [], marksResult.data ?? [], sanitizePassageHtml);
	return {
		mistakes: { attemptId, test: review.attempt.test, summary: built.summary, questions: built.questions },
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

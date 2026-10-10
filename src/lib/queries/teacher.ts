import "server-only";

import { timeTakenSeconds } from "@/lib/attempts/clock";
import { overridableAnswers } from "@/lib/attempts/overrides";
import { readAnswerKeyObject } from "@/lib/r2";
import { answerKeyObjectKey } from "@/lib/r2-keys";
import { answerKeySchema, type AnswerKey } from "@/lib/scoring";
import { QUESTION_TYPES, isQuestionType } from "@/lib/question-types";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatTime } from "@/lib/time";
import type {
	AssignOptions,
	AssignmentResults,
	BatchView,
	ClassAnalytics,
	LiveSession,
	LiveStudent,
	OverridableAnswer,
	TeacherDashboard,
} from "@/lib/view-models/teacher";
import { daysUntil, displayPhone, formatDuration, formatShortDate, instituteToday, queryFailed, relativeActivity, testSummary } from "./shared";

type Tables = Database["public"]["Tables"];
type Attempt = Tables["attempts"]["Row"];

async function actorId(): Promise<{ supabase: Awaited<ReturnType<typeof createClient>>; id: string; name: string }> {
	const supabase = await createClient();
	const { data: auth } = await supabase.auth.getClaims();
	const id = auth?.claims?.sub;
	if (!id) throw new Error("A signed-in user is required.");
	const { data: profile, error } = await supabase.from("users").select("name").eq("id", id).maybeSingle();
	if (error) queryFailed("teacher profile", error);
	return { supabase, id, name: profile?.name ?? "Teacher" };
}

async function visibleBatchIds(supabase: Awaited<ReturnType<typeof createClient>>, teacherId: string): Promise<string[]> {
	const { data, error } = await supabase.from("batch_teachers").select("batch_id").eq("teacher_id", teacherId);
	if (error) queryFailed("teacher batches", error);
	return (data ?? []).map((row) => row.batch_id);
}

function released(resultsRelease: string, releasedAt: string | null): boolean {
	return resultsRelease === "immediate" || (releasedAt !== null && new Date(releasedAt) <= new Date());
}

/** Screen 14 — dashboard assembled entirely from RLS-scoped Supabase rows. */
export async function getTeacherDashboard(): Promise<TeacherDashboard> {
	const { supabase, id, name } = await actorId();
	const batchIds = await visibleBatchIds(supabase, id);

	const [batchesResult, membershipsResult, assignmentsResult, targetsResult, attemptsResult, scoresResult, plansResult] =
		await Promise.all([
			batchIds.length
				? supabase.from("batches").select("id, name").in("id", batchIds).order("name")
				: Promise.resolve({ data: [], error: null }),
			batchIds.length
				? supabase.from("batch_students").select("batch_id, student_id, left_at").in("batch_id", batchIds)
				: Promise.resolve({ data: [], error: null }),
			supabase.from("assignments").select("*"),
			supabase.from("assignment_targets").select("assignment_id, batch_id, student_id"),
			supabase.from("attempts").select("*"),
			supabase.from("attempt_scores").select("attempt_id, band"),
			supabase.from("student_plans").select("student_id, expires_on, status"),
		]);
	if (batchesResult.error) queryFailed("teacher dashboard batches", batchesResult.error);
	if (membershipsResult.error) queryFailed("teacher dashboard students", membershipsResult.error);
	if (assignmentsResult.error) queryFailed("teacher dashboard assignments", assignmentsResult.error);
	if (targetsResult.error) queryFailed("teacher dashboard targets", targetsResult.error);
	if (attemptsResult.error) queryFailed("teacher dashboard attempts", attemptsResult.error);
	if (scoresResult.error) queryFailed("teacher dashboard scores", scoresResult.error);
	if (plansResult.error) queryFailed("teacher dashboard plans", plansResult.error);

	const assignments = assignmentsResult.data ?? [];
	const attempts = (attemptsResult.data ?? []) as Attempt[];
	const testIds = [...new Set(assignments.map((assignment) => assignment.test_id))];
	const testsResult = testIds.length
		? await supabase.from("tests").select("id, title, skill").in("id", testIds)
		: { data: [], error: null };
	if (testsResult.error) queryFailed("teacher dashboard tests", testsResult.error);
	const tests = new Map((testsResult.data ?? []).map((test) => [test.id, test]));
	const scores = new Map((scoresResult.data ?? []).map((score) => [score.attempt_id, score.band]));
	const memberships = (membershipsResult.data ?? []).filter((row) => row.left_at === null);
	const targets = targetsResult.data ?? [];
	const batches = batchesResult.data ?? [];

	const batchCards = batches.map((batch) => {
		const students = memberships.filter((row) => row.batch_id === batch.id).map((row) => row.student_id);
		const studentSet = new Set(students);
		const scoredBands = attempts
			.filter((attempt) => studentSet.has(attempt.student_id))
			.flatMap((attempt) => {
				const band = scores.get(attempt.id);
				return band === null || band === undefined ? [] : [band];
			});
		const assignmentIds = new Set(targets.filter((target) => target.batch_id === batch.id).map((target) => target.assignment_id));
		const awaitingRelease = assignments
			.filter((assignment) => assignmentIds.has(assignment.id) && !released(assignment.results_release, assignment.results_released_at))
			.reduce((count, assignment) => count + attempts.filter((attempt) => attempt.assignment_id === assignment.id && attempt.status !== "in_progress").length, 0);
		return {
			id: batch.id,
			name: batch.name,
			studentCount: students.length,
			averageBand: scoredBands.length ? scoredBands.reduce((sum, band) => sum + band, 0) / scoredBands.length : null,
			awaitingRelease,
		};
	});

	const today = instituteToday();
	const todaysTests = assignments.flatMap((assignment) => {
		const test = tests.get(assignment.test_id);
		if (!test || (test.skill !== "listening" && test.skill !== "reading")) return [];
		const targetBatches = targets.filter((target) => target.assignment_id === assignment.id && target.batch_id).map((target) => target.batch_id!);
		const batch = batches.find((candidate) => targetBatches.includes(candidate.id));
		const isToday = [assignment.available_from, assignment.due_by].some(
			(value) => value && instituteToday(new Date(value)) === today,
		);
		const live = attempts.some((attempt) => attempt.assignment_id === assignment.id && attempt.status === "in_progress");
		if (!isToday && !live) return [];
		return [{
			assignmentId: assignment.id,
			testTitle: test.title,
			skill: test.skill as "listening" | "reading",
			batchName: batch?.name ?? "Individual students",
			whenLabel: live ? `Running now${assignment.due_by ? ` · closes ${formatTime(assignment.due_by)}` : ""}` : formatDateTime(assignment.available_from),
			liveSessionId: live ? assignment.id : null,
		}];
	});

	const needsAttention: TeacherDashboard["needsAttention"] = [];
	for (const assignment of assignments) {
		if (released(assignment.results_release, assignment.results_released_at)) continue;
		const count = attempts.filter((attempt) => attempt.assignment_id === assignment.id && attempt.status !== "in_progress").length;
		if (count > 0) {
			needsAttention.push({
				id: `release:${assignment.id}`,
				kind: "release",
				summary: `${count} ${count === 1 ? "result is" : "results are"} waiting to be released for ${tests.get(assignment.test_id)?.title ?? "a test"}`,
				href: `/teacher/results/${assignment.id}`,
			});
		}
	}
	for (const batch of batches) {
		const students = new Set(memberships.filter((row) => row.batch_id === batch.id).map((row) => row.student_id));
		const expiring = (plansResult.data ?? []).filter((plan) => students.has(plan.student_id) && daysUntil(plan.expires_on) >= 0 && daysUntil(plan.expires_on) <= 7).length;
		if (expiring > 0) needsAttention.push({ id: `expiring:${batch.id}`, kind: "expiring", summary: `${expiring} students in ${batch.name} lose access within a week`, href: `/teacher/batches/${batch.id}` });
	}

	return { teacherName: name.split(/\s+/)[0] ?? name, batches: batchCards, todaysTests, needsAttention };
}

/** Screen 15 — a real batch roster. */
export async function getBatchView(batchId: string): Promise<BatchView | null> {
	const { supabase } = await actorId();
	const { data: batch, error } = await supabase.from("batches").select("id, name").eq("id", batchId).maybeSingle();
	if (error) queryFailed("teacher batch", error);
	if (!batch) return null;
	const membershipResult = await supabase.from("batch_students").select("student_id, left_at").eq("batch_id", batchId);
	if (membershipResult.error) queryFailed("batch roster", membershipResult.error);
	const studentIds = (membershipResult.data ?? []).filter((row) => row.left_at === null).map((row) => row.student_id);
	if (studentIds.length === 0) return { batchId, batchName: batch.name, roster: [] };
	const [usersResult, plansResult, attemptsResult, sessionsResult] = await Promise.all([
		supabase.from("users").select("id, name, phone, country_code").in("id", studentIds).order("name"),
		supabase.from("student_plans").select("student_id, expires_on").in("student_id", studentIds),
		supabase.from("attempts").select("id, student_id, status, submitted_at").in("student_id", studentIds),
		supabase.from("user_sessions").select("user_id, last_seen_at").in("user_id", studentIds),
	]);
	if (usersResult.error) queryFailed("batch students", usersResult.error);
	if (plansResult.error) queryFailed("batch plans", plansResult.error);
	if (attemptsResult.error) queryFailed("batch attempts", attemptsResult.error);
	if (sessionsResult.error) queryFailed("batch sessions", sessionsResult.error);
	const attemptIds = (attemptsResult.data ?? []).map((attempt) => attempt.id);
	const scoresResult = attemptIds.length
		? await supabase.from("attempt_scores").select("attempt_id, band").in("attempt_id", attemptIds)
		: { data: [], error: null };
	if (scoresResult.error) queryFailed("batch scores", scoresResult.error);
	const scores = new Map((scoresResult.data ?? []).map((score) => [score.attempt_id, score.band]));
	return {
		batchId,
		batchName: batch.name,
		roster: (usersResult.data ?? []).map((user) => {
			const plans = (plansResult.data ?? []).filter((plan) => plan.student_id === user.id).sort((a, b) => b.expires_on.localeCompare(a.expires_on));
			const plan = plans[0] ?? null;
			const attempts = (attemptsResult.data ?? []).filter((attempt) => attempt.student_id === user.id && attempt.status !== "in_progress");
			const last = [...attempts].sort((a, b) => (b.submitted_at ?? "").localeCompare(a.submitted_at ?? "")).find((attempt) => scores.has(attempt.id));
			const session = (sessionsResult.data ?? []).filter((item) => item.user_id === user.id).sort((a, b) => b.last_seen_at.localeCompare(a.last_seen_at))[0];
			return {
				studentId: user.id,
				name: user.name,
				phone: displayPhone(user.country_code, user.phone),
				lastBand: last ? scores.get(last.id) ?? null : null,
				testsDone: attempts.length,
				planEndsLabel: plan ? formatShortDate(plan.expires_on) : "No plan",
				daysRemaining: plan ? daysUntil(plan.expires_on) : -1,
				lastActiveLabel: relativeActivity(session?.last_seen_at ?? null),
			};
		}),
	};
}

/**
 * Screen 16 — what the Assign steps can offer.
 *
 * Scope is RLS's, not a hand-written filter: a teacher sees the batches they
 * teach and those batches' students, an admin their centre, the Owner every
 * centre. Students outside any batch are included — an admin assigning to one
 * person should not have to put them in a batch first. `createAssignment`
 * re-checks all of it server-side; this list only shapes the screen.
 */
export async function getAssignOptions(): Promise<AssignOptions> {
	const supabase = await createClient();
	const [testsResult, batchesResult, membershipsResult, usersResult] = await Promise.all([
		supabase.from("tests").select("id, title, skill, variant, difficulty, total_questions, duration_seconds").eq("status", "published").in("skill", ["listening", "reading"]).order("title"),
		supabase.from("batches").select("id, name").eq("status", "active").order("name"),
		supabase.from("batch_students").select("batch_id, student_id").is("left_at", null),
		supabase.from("users").select("id, name, status, roles ( key )").eq("status", "active").order("name"),
	]);
	if (testsResult.error) queryFailed("assignable tests", testsResult.error);
	if (batchesResult.error) queryFailed("assignable batches", batchesResult.error);
	if (membershipsResult.error) queryFailed("assignable students", membershipsResult.error);
	if (usersResult.error) queryFailed("assignable student names", usersResult.error);
	const batches = batchesResult.data ?? [];
	const batchNames = new Map(batches.map((batch) => [batch.id, batch.name]));
	const memberships = (membershipsResult.data ?? []).filter((row) => batchNames.has(row.batch_id));
	return {
		tests: (testsResult.data ?? []).flatMap((test) => {
			const summary = testSummary(test);
			return summary ? [summary] : [];
		}),
		batches: batches.map((batch) => ({ id: batch.id, name: batch.name, studentCount: memberships.filter((row) => row.batch_id === batch.id).length })),
		students: (usersResult.data ?? [])
			.filter((user) => user.roles?.key === "student")
			.map((user) => {
				const membership = memberships.find((row) => row.student_id === user.id);
				return {
					id: user.id,
					name: user.name,
					batchId: membership?.batch_id ?? null,
					batchName: membership ? batchNames.get(membership.batch_id) ?? null : null,
				};
			}),
	};
}

/** Screen 18 — assignment results; correct answer keys remain in R2. */
export async function getAssignmentResults(assignmentId: string): Promise<AssignmentResults | null> {
	const { supabase } = await actorId();
	const { data: assignment, error } = await supabase.from("assignments").select("*").eq("id", assignmentId).maybeSingle();
	if (error) queryFailed("assignment results", error);
	if (!assignment) return null;
	const [testResult, targetsResult, attemptsResult] = await Promise.all([
		supabase.from("tests").select("id, title, skill, total_questions").eq("id", assignment.test_id).maybeSingle(),
		supabase.from("assignment_targets").select("batch_id, student_id").eq("assignment_id", assignmentId),
		supabase.from("attempts").select("*").eq("assignment_id", assignmentId),
	]);
	if (testResult.error) queryFailed("assignment test", testResult.error);
	if (targetsResult.error) queryFailed("assignment targets", targetsResult.error);
	if (attemptsResult.error) queryFailed("assignment attempts", attemptsResult.error);
	if (!testResult.data || (testResult.data.skill !== "listening" && testResult.data.skill !== "reading")) return null;
	const targets = targetsResult.data ?? [];
	const batchIds = targets.flatMap((target) => (target.batch_id ? [target.batch_id] : []));
	const membershipsResult = batchIds.length
		? await supabase.from("batch_students").select("batch_id, student_id, left_at").in("batch_id", batchIds)
		: { data: [], error: null };
	if (membershipsResult.error) queryFailed("assignment batch students", membershipsResult.error);
	const targetStudents = new Set([
		...targets.flatMap((target) => (target.student_id ? [target.student_id] : [])),
		...(membershipsResult.data ?? []).filter((row) => row.left_at === null).map((row) => row.student_id),
	]);
	const attempts = (attemptsResult.data ?? []) as Attempt[];
	const studentIds = [...new Set([...targetStudents, ...attempts.map((attempt) => attempt.student_id)])];
	const attemptIds = attempts.map((attempt) => attempt.id);
	const [usersResult, scoresResult, batchesResult] = await Promise.all([
		studentIds.length ? supabase.from("users").select("id, name").in("id", studentIds) : Promise.resolve({ data: [], error: null }),
		attemptIds.length ? supabase.from("attempt_scores").select("attempt_id, raw_score, band, below_band").in("attempt_id", attemptIds) : Promise.resolve({ data: [], error: null }),
		batchIds.length ? supabase.from("batches").select("id, name").in("id", batchIds) : Promise.resolve({ data: [], error: null }),
	]);
	if (usersResult.error) queryFailed("result students", usersResult.error);
	if (scoresResult.error) queryFailed("result scores", scoresResult.error);
	if (batchesResult.error) queryFailed("result batches", batchesResult.error);
	const users = new Map((usersResult.data ?? []).map((user) => [user.id, user.name]));
	const scores = new Map((scoresResult.data ?? []).map((score) => [score.attempt_id, score]));
	const isReleased = released(assignment.results_release, assignment.results_released_at);
	const reMarkable = await overridableByAttempt(
		supabase,
		assignment.test_id,
		attempts.filter((attempt) => attempt.status !== "in_progress" && scores.has(attempt.id)),
	);
	return {
		assignmentId,
		maxScore: testResult.data.total_questions,
		release: {
			mode: assignment.results_release as "immediate" | "scheduled" | "manual",
			released: isReleased,
			// Institute time, server-formatted (non-negotiable 9).
			whenLabel: assignment.results_released_at ? formatDateTime(assignment.results_released_at) : null,
		},
		testTitle: testResult.data.title,
		skill: testResult.data.skill,
		batchName: (batchesResult.data ?? []).map((batch) => batch.name).join(", ") || "Individual students",
		rows: attempts.filter((attempt) => attempt.status !== "in_progress").map((attempt) => {
			const score = scores.get(attempt.id);
			const elapsed = attempt.submitted_at ? timeTakenSeconds({ ...attempt, submitted_at: attempt.submitted_at }) : 0;
			return {
				attemptId: attempt.id,
				studentId: attempt.student_id,
				studentName: users.get(attempt.student_id) ?? "Unknown student",
				rawScore: score ? Number(score.raw_score) : null,
				band: score?.band ?? null,
				bandLabel: score?.band !== null && score?.band !== undefined ? score.band.toFixed(1) : score?.below_band ? `Below ${score.below_band}` : "—",
				timeTakenLabel: attempt.status === "expired" ? "Ran out of time" : formatDuration(elapsed),
				stateLabel: attempt.status === "expired" ? "Expired" : "Submitted",
				released: isReleased,
				answers: reMarkable.get(attempt.id),
				flags: attempt.tab_switches > 0 ? [`Left the tab ${attempt.tab_switches} ${attempt.tab_switches === 1 ? "time" : "times"}`] : [],
			};
		}),
		notStarted: Math.max(0, targetStudents.size - new Set(attempts.map((attempt) => attempt.student_id)).size),
	};
}

/**
 * Each finished attempt's wrong (or already overridden) answers beside the
 * key, for screen 18's re-mark rows (M6-05). Staff-only: the key is read
 * through the R2 binding here, on the server, at each attempt's pinned
 * version. A missing or unreadable key leaves that attempt without rows
 * rather than failing the page.
 */
async function overridableByAttempt(
	supabase: Awaited<ReturnType<typeof actorId>>["supabase"],
	testId: string,
	finished: readonly Pick<Attempt, "id" | "content_version">[],
): Promise<Map<string, OverridableAnswer[]>> {
	const result = new Map<string, OverridableAnswer[]>();
	if (finished.length === 0) return result;
	const ids = finished.map((attempt) => attempt.id);
	const [answersResult, marksResult] = await Promise.all([
		supabase.from("answers").select("attempt_id, q_number, given_answer").in("attempt_id", ids),
		supabase.from("answer_marks").select("attempt_id, q_number, is_correct, marks_awarded, overridden_by, override_note").in("attempt_id", ids),
	]);
	if (answersResult.error) queryFailed("re-mark answers", answersResult.error);
	if (marksResult.error) queryFailed("re-mark marks", marksResult.error);

	const keys = new Map<number, AnswerKey | null>();
	for (const version of new Set(finished.map((attempt) => attempt.content_version))) {
		const object = await readAnswerKeyObject(answerKeyObjectKey(testId, version));
		const parsed = object ? answerKeySchema.safeParse(await object.json()) : null;
		keys.set(version, parsed?.success ? parsed.data : null);
	}
	for (const attempt of finished) {
		const key = keys.get(attempt.content_version);
		if (!key) continue;
		result.set(
			attempt.id,
			overridableAnswers(
				key,
				(answersResult.data ?? []).filter((row) => row.attempt_id === attempt.id),
				(marksResult.data ?? []).filter((row) => row.attempt_id === attempt.id),
			),
		);
	}
	return result;
}

/** Screen 19 — class aggregates from scores and answer marks. */
export async function getClassAnalytics(batchId: string): Promise<ClassAnalytics | null> {
	const batch = await getBatchView(batchId);
	if (!batch) return null;
	const { supabase } = await actorId();
	const studentIds = batch.roster.map((student) => student.studentId);
	if (studentIds.length === 0) return { batchName: batch.batchName, bandDistribution: [], weakestTypes: [], mostMissed: [], studentCount: 0, averageBand: null };
	const attemptsResult = await supabase.from("attempts").select("id, test_id").in("student_id", studentIds);
	if (attemptsResult.error) queryFailed("class attempts", attemptsResult.error);
	const attemptIds = (attemptsResult.data ?? []).map((attempt) => attempt.id);
	const [scoresResult, marksResult] = await Promise.all([
		attemptIds.length ? supabase.from("attempt_scores").select("attempt_id, band").in("attempt_id", attemptIds) : Promise.resolve({ data: [], error: null }),
		attemptIds.length ? supabase.from("answer_marks").select("attempt_id, q_number, question_type, is_correct").in("attempt_id", attemptIds) : Promise.resolve({ data: [], error: null }),
	]);
	if (scoresResult.error) queryFailed("class scores", scoresResult.error);
	if (marksResult.error) queryFailed("class answer marks", marksResult.error);
	const bands = (scoresResult.data ?? []).flatMap((score) => (score.band === null ? [] : [score.band]));
	const distribution = new Map<number, number>();
	for (const band of bands) distribution.set(band, (distribution.get(band) ?? 0) + 1);
	const byType = new Map<string, { correct: number; total: number }>();
	for (const mark of marksResult.data ?? []) {
		const value = byType.get(mark.question_type) ?? { correct: 0, total: 0 };
		value.total += 1;
		if (mark.is_correct) value.correct += 1;
		byType.set(mark.question_type, value);
	}
	const attemptsById = new Map((attemptsResult.data ?? []).map((attempt) => [attempt.id, attempt]));
	const testIds = [...new Set((attemptsResult.data ?? []).map((attempt) => attempt.test_id))];
	const testsResult = testIds.length ? await supabase.from("tests").select("id, title").in("id", testIds) : { data: [], error: null };
	if (testsResult.error) queryFailed("class tests", testsResult.error);
	const tests = new Map((testsResult.data ?? []).map((test) => [test.id, test.title]));
	const missed = new Map<string, { questionNumber: number; testTitle: string; wrongCount: number; total: number }>();
	for (const mark of marksResult.data ?? []) {
		const attempt = attemptsById.get(mark.attempt_id);
		if (!attempt) continue;
		const key = `${attempt.test_id}:${mark.q_number}`;
		const value = missed.get(key) ?? { questionNumber: mark.q_number, testTitle: tests.get(attempt.test_id) ?? "Test", wrongCount: 0, total: 0 };
		value.total += 1;
		if (!mark.is_correct) value.wrongCount += 1;
		missed.set(key, value);
	}
	return {
		batchName: batch.batchName,
		bandDistribution: [...distribution.entries()].sort(([a], [b]) => a - b).map(([band, count]) => ({ band, count })),
		weakestTypes: [...byType.entries()].map(([questionType, value]) => ({ questionType, label: isQuestionType(questionType) ? QUESTION_TYPES[questionType].officialName : questionType.replaceAll("_", " "), percent: Math.round((value.correct / value.total) * 100), attempted: value.total })).sort((a, b) => a.percent - b.percent),
		mostMissed: [...missed.values()].sort((a, b) => b.wrongCount - a.wrongCount).slice(0, 10),
		studentCount: studentIds.length,
		averageBand: bands.length ? bands.reduce((sum, band) => sum + band, 0) / bands.length : null,
	};
}

/**
 * The tiles of screen 17: one per attempt on the assignment, with the server's
 * time remaining and how many questions have a saved answer.
 *
 * This is what the monitor polls every 10 seconds (M7-01), so it reads only
 * what changes — attempts and answers — and leaves the title, batch and roster
 * to {@link getLiveSession}'s first load. Runs under the invigilator's RLS:
 * attempts outside the batches they teach are simply not returned.
 *
 * @returns `null` when the assignment is not visible to the caller.
 */
export async function getLiveStudents(sessionId: string): Promise<LiveStudent[] | null> {
	const { supabase } = await actorId();
	const [assignmentResult, attemptsResult] = await Promise.all([
		supabase.from("assignments").select("test_id").eq("id", sessionId).maybeSingle(),
		supabase
			.from("attempts")
			.select("id, student_id, status, expires_at, tab_switches")
			.eq("assignment_id", sessionId),
	]);
	if (assignmentResult.error) queryFailed("live assignment", assignmentResult.error);
	if (attemptsResult.error) queryFailed("live attempts", attemptsResult.error);
	const assignment = assignmentResult.data;
	if (!assignment) return null;
	const attempts = attemptsResult.data ?? [];
	const attemptIds = attempts.map((attempt) => attempt.id);
	const studentIds = [...new Set(attempts.map((attempt) => attempt.student_id))];
	const [answersResult, studentsResult, testResult] = await Promise.all([
		attemptIds.length
			? supabase.from("answers").select("attempt_id, q_number").in("attempt_id", attemptIds)
			: Promise.resolve({ data: [], error: null }),
		studentIds.length
			? supabase.from("users").select("id, name").in("id", studentIds)
			: Promise.resolve({ data: [], error: null }),
		supabase.from("tests").select("total_questions").eq("id", assignment.test_id).maybeSingle(),
	]);
	if (answersResult.error) queryFailed("live answers", answersResult.error);
	if (studentsResult.error) queryFailed("live students", studentsResult.error);
	if (testResult.error) queryFailed("live test", testResult.error);
	const studentNames = new Map((studentsResult.data ?? []).map((student) => [student.id, student.name]));
	const answered = new Map<string, Set<number>>();
	for (const answer of answersResult.data ?? []) {
		const set = answered.get(answer.attempt_id) ?? new Set<number>();
		set.add(answer.q_number);
		answered.set(answer.attempt_id, set);
	}
	const now = Date.now();
	return attempts.map((attempt) => ({
		attemptId: attempt.id,
		studentId: attempt.student_id,
		name: studentNames.get(attempt.student_id) ?? "Student",
		state: attempt.status === "submitted" || attempt.status === "expired" ? attempt.status : "in_progress",
		secondsRemaining:
			attempt.status === "in_progress"
				? Math.max(0, Math.floor((new Date(attempt.expires_at).getTime() - now) / 1000))
				: null,
		answered: answered.get(attempt.id)?.size ?? 0,
		total: testResult.data?.total_questions ?? 0,
		flags:
			attempt.tab_switches > 0
				? [`Left the tab ${attempt.tab_switches} ${attempt.tab_switches === 1 ? "time" : "times"}`]
				: [],
	}));
}

/** Screen 17 — an assignment-backed live monitor: the header, then {@link getLiveStudents}. */
export async function getLiveSession(sessionId: string): Promise<LiveSession | null> {
	const [results, students] = await Promise.all([getAssignmentResults(sessionId), getLiveStudents(sessionId)]);
	if (!results || !students) return null;
	return {
		sessionId,
		testTitle: results.testTitle,
		batchName: results.batchName,
		lastUpdatedLabel: "just now",
		students,
	};
}

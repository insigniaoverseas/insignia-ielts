import "server-only";

import type {
	AssignedTest,
	CompletedAttempt,
	MyMistakes,
	MyProgress,
	MyTests,
	PlanStatus,
	PracticeLibrary,
	PreTestBriefing,
	StudentHome,
	StudentIdentity,
	StudentProfile,
	TestSummary,
} from "@/lib/view-models/student";

/*
 * Mock student data (M2 screens, built ahead of the queries).
 *
 * This is the ONLY file the screens' data comes from. When the real queries
 * land, each `get*` function below is reimplemented against Supabase and every
 * screen keeps working unchanged — that is the whole point of the split.
 *
 * `server-only` is deliberate: it makes the compiler reject any attempt to pull
 * this (and later, the real queries that replace it) into a client component.
 */

/** Which variant of a screen to render. Dev-only: driven by `?state=` (see the README). */
export type Scenario = "default" | "empty" | "expired" | "held" | "first_time";

const STUDENT: StudentIdentity = {
	id: "00000000-0000-4000-8000-000000000001",
	firstName: "Priya",
	fullName: "Priya Sharma",
	phone: "+91 98765 43210",
	batchName: "Morning Batch A",
	teacherName: "Anita Desai",
	branchName: "Insignia — Karol Bagh",
};

const PLAN_ACTIVE: PlanStatus = {
	state: "expiring",
	startsOn: "2026-06-11T00:00:00Z",
	endsOn: "2026-09-21T18:29:59Z",
	endsOnLabel: "21 September 2026",
	daysRemaining: 5,
	percentUsed: 82,
};

const PLAN_EXPIRED: PlanStatus = {
	state: "expired",
	startsOn: "2026-03-01T00:00:00Z",
	endsOn: "2026-09-01T18:29:59Z",
	endsOnLabel: "1 September 2026",
	daysRemaining: -15,
	percentUsed: 100,
};

const LISTENING_MOCK_2: TestSummary = {
	id: "t-listening-mock-2",
	title: "Listening Mock Test 2",
	skill: "listening",
	variant: "n_a",
	difficulty: "medium",
	questionCount: 40,
	durationMinutes: 30,
};

const READING_MOCK_3: TestSummary = {
	id: "t-reading-ac-3",
	title: "Academic Reading Mock Test 3",
	skill: "reading",
	variant: "academic",
	difficulty: "hard",
	questionCount: 40,
	durationMinutes: 60,
};

const LISTENING_PRACTICE_1: TestSummary = {
	id: "t-listening-practice-1",
	title: "Listening Practice — Section 1 Forms",
	skill: "listening",
	variant: "n_a",
	difficulty: "easy",
	questionCount: 10,
	durationMinutes: 10,
};

const READING_PRACTICE_TFNG: TestSummary = {
	id: "t-reading-practice-tfng",
	title: "Reading Practice — True / False / Not Given",
	skill: "reading",
	variant: "academic",
	difficulty: "medium",
	questionCount: 13,
	durationMinutes: 20,
};

const NEXT_UP: AssignedTest = {
	assignmentId: "a-001",
	test: LISTENING_MOCK_2,
	mode: "mock",
	opensAt: "2026-09-16T03:30:00Z",
	closesAt: "2026-09-16T12:30:00Z",
	windowLabel: "Closes today at 6:00 PM",
	deadline: { value: "6:00 PM", caption: "closes today" },
	attemptsUsed: 0,
	attemptsAllowed: 1,
	resumeAttemptId: null,
	locked: null,
};

const LOCKED_NOT_OPEN: AssignedTest = {
	assignmentId: "a-002",
	test: READING_MOCK_3,
	mode: "mock",
	opensAt: "2026-09-21T03:30:00Z",
	closesAt: "2026-09-21T12:30:00Z",
	windowLabel: "Opens Monday at 9:00 AM",
	deadline: { value: "Mon 9:00 AM", caption: "opens" },
	attemptsUsed: 0,
	attemptsAllowed: 1,
	resumeAttemptId: null,
	locked: {
		kind: "not_open_yet",
		opensAt: "2026-09-21T03:30:00Z",
		message: "This opens on Monday at 9:00 AM.",
	},
};

const LOCKED_NO_ATTEMPTS: AssignedTest = {
	assignmentId: "a-003",
	test: { ...LISTENING_MOCK_2, id: "t-listening-mock-1", title: "Listening Mock Test 1" },
	mode: "mock",
	opensAt: null,
	closesAt: null,
	windowLabel: null,
	deadline: null,
	attemptsUsed: 2,
	attemptsAllowed: 2,
	resumeAttemptId: null,
	locked: {
		kind: "no_attempts_left",
		used: 2,
		allowed: 2,
		message: "You've used all 2 attempts on this test.",
	},
};

const PRACTICE_LISTENING: AssignedTest = {
	assignmentId: "a-p01",
	test: LISTENING_PRACTICE_1,
	mode: "practice",
	opensAt: null,
	closesAt: null,
	windowLabel: null,
	deadline: null,
	attemptsUsed: 2,
	attemptsAllowed: 99,
	resumeAttemptId: null,
	locked: null,
};

const PRACTICE_READING: AssignedTest = {
	assignmentId: "a-p02",
	test: READING_PRACTICE_TFNG,
	mode: "practice",
	opensAt: null,
	closesAt: null,
	windowLabel: null,
	deadline: null,
	attemptsUsed: 0,
	attemptsAllowed: 99,
	resumeAttemptId: null,
	locked: null,
};

const DONE_READING: CompletedAttempt = {
	attemptId: "at-101",
	test: READING_MOCK_3,
	mode: "mock",
	submittedAt: "2026-09-02T11:05:00Z",
	submittedAtLabel: "2 September",
	result: {
		band: 6.5,
		belowBand: null,
		descriptor: "Competent user",
		rawScore: 30,
		maxScore: 40,
		correctCount: 30,
		wrongCount: 10,
		timeTakenSeconds: 3421,
		timeTakenLabel: "57 min 1 sec",
		sections: [
			{ number: 1, label: "Passage 1", correct: 11, total: 13 },
			{ number: 2, label: "Passage 2", correct: 10, total: 13 },
			{ number: 3, label: "Passage 3", correct: 9, total: 14 },
		],
	},
};

const DONE_LISTENING: CompletedAttempt = {
	attemptId: "at-102",
	test: { ...LISTENING_MOCK_2, id: "t-listening-mock-1", title: "Listening Mock Test 1" },
	mode: "mock",
	submittedAt: "2026-08-19T09:40:00Z",
	submittedAtLabel: "19 August",
	result: {
		band: 6.0,
		belowBand: null,
		descriptor: "Competent user",
		rawScore: 26,
		maxScore: 40,
		correctCount: 26,
		wrongCount: 14,
		timeTakenSeconds: 1800,
		timeTakenLabel: "30 min",
		sections: [
			{ number: 1, label: "Section 1", correct: 8, total: 10 },
			{ number: 2, label: "Section 2", correct: 7, total: 10 },
			{ number: 3, label: "Section 3", correct: 6, total: 10 },
			{ number: 4, label: "Section 4", correct: 5, total: 10 },
		],
	},
};

/** A submitted attempt whose teacher has not released the result yet. */
const DONE_HELD: CompletedAttempt = {
	attemptId: "at-103",
	test: LISTENING_MOCK_2,
	mode: "mock",
	submittedAt: "2026-09-15T05:30:00Z",
	submittedAtLabel: "15 September",
	result: null,
};

/** Screen 03 — Student Home. */
export async function getStudentHome(scenario: Scenario = "default"): Promise<StudentHome> {
	const base: StudentHome = {
		student: STUDENT,
		plan: PLAN_ACTIVE,
		todayLabel: "Wednesday, 16 September",
		nextUp: NEXT_UP,
		counts: { testsToDo: 2, testsDone: 6, mistakesToReview: 8 },
		lastResult: { band: 6.5, belowBand: null, skill: "reading", dateLabel: "2 September" },
		progressHint: "Band is going up",
	};

	if (scenario === "empty") {
		return { ...base, nextUp: null, counts: { ...base.counts, testsToDo: 0 } };
	}
	if (scenario === "expired") {
		return {
			...base,
			plan: PLAN_EXPIRED,
			nextUp: {
				...NEXT_UP,
				locked: {
					kind: "plan_expired",
					expiredOn: PLAN_EXPIRED.endsOn,
					message: "You can't start this because your access has ended.",
				},
			},
		};
	}
	if (scenario === "first_time") {
		return {
			...base,
			plan: { ...PLAN_ACTIVE, state: "active", daysRemaining: 88, percentUsed: 4 },
			counts: { testsToDo: 1, testsDone: 0, mistakesToReview: 0 },
			lastResult: null,
			progressHint: "Your first test is waiting",
		};
	}
	return base;
}

/** Screen 04 — My Tests. */
export async function getMyTests(scenario: Scenario = "default"): Promise<MyTests> {
	if (scenario === "empty") {
		return { toDo: [], practice: [PRACTICE_LISTENING, PRACTICE_READING], done: [] };
	}
	return {
		toDo: [NEXT_UP, LOCKED_NOT_OPEN, LOCKED_NO_ATTEMPTS],
		practice: [PRACTICE_LISTENING, PRACTICE_READING],
		done: scenario === "held" ? [DONE_HELD, DONE_READING, DONE_LISTENING] : [DONE_READING, DONE_LISTENING],
	};
}

/** Screen 05 — Pre-test instructions. */
export async function getPreTestBriefing(assignmentId: string): Promise<PreTestBriefing | null> {
	const assignment = [NEXT_UP, LOCKED_NOT_OPEN, PRACTICE_LISTENING, PRACTICE_READING].find(
		(a) => a.assignmentId === assignmentId,
	);
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
		soundCheckUrl: listening ? "/sound-check.mp3" : null,
	};
}

/** Screen 09 — Result, for one finished attempt. */
export async function getAttemptResult(attemptId: string): Promise<CompletedAttempt | null> {
	return [DONE_READING, DONE_LISTENING, DONE_HELD].find((a) => a.attemptId === attemptId) ?? null;
}

/** Screen 11 — My Progress. */
export async function getMyProgress(scenario: Scenario = "default"): Promise<MyProgress> {
	if (scenario === "empty") {
		return {
			trend: { dateLabels: [], series: [] },
			accuracyByType: [],
			advice: "",
			testsTaken: 0,
			averageBand: null,
		};
	}
	return {
		trend: {
			dateLabels: ["12 Jul", "26 Jul", "9 Aug", "19 Aug", "24 Aug", "2 Sep"],
			series: [
				{ skill: "listening", bands: [5.0, null, 5.5, 6.0, null, null] },
				{ skill: "reading", bands: [null, 5.5, null, null, 6.0, 6.5] },
			],
		},
		accuracyByType: [
			{ questionType: "identifying_information", label: "True / False / Not Given", percent: 41, attempted: 27 },
			{ questionType: "matching_headings", label: "Matching headings", percent: 52, attempted: 21 },
			{ questionType: "summary_completion", label: "Summary completion", percent: 63, attempted: 19 },
			{ questionType: "mcq_single", label: "Multiple choice", percent: 74, attempted: 34 },
			{ questionType: "note_completion", label: "Note completion", percent: 81, attempted: 26 },
			{ questionType: "short_answer", label: "Short answer", percent: 88, attempted: 17 },
		],
		advice: "True / False / Not Given is costing you the most marks. Practise it twice this week.",
		testsTaken: 6,
		averageBand: 5.8,
	};
}

/** Screen 12 — Practice at home. */
export async function getPracticeLibrary(scenario: Scenario = "default"): Promise<PracticeLibrary> {
	const rulesLine = "Practice tests don't count towards your band. Take them as many times as you like.";
	if (scenario === "empty") return { rulesLine, items: [] };
	return {
		rulesLine,
		items: [
			{ ...PRACTICE_LISTENING, timesCompleted: 2 },
			{ ...PRACTICE_READING, timesCompleted: 0 },
			{
				...PRACTICE_READING,
				assignmentId: "a-p03",
				test: {
					...READING_PRACTICE_TFNG,
					id: "t-reading-practice-headings",
					title: "Reading Practice — Matching Headings",
					difficulty: "hard",
					questionCount: 8,
					durationMinutes: 15,
				},
				timesCompleted: 1,
			},
			{
				...PRACTICE_LISTENING,
				assignmentId: "a-p04",
				test: {
					...LISTENING_PRACTICE_1,
					id: "t-listening-practice-map",
					title: "Listening Practice — Maps and Plans",
					difficulty: "hard",
					questionCount: 10,
					durationMinutes: 12,
				},
				timesCompleted: 0,
			},
		],
	};
}

/** Screen 13 — Profile. */
export async function getStudentProfile(scenario: Scenario = "default"): Promise<StudentProfile> {
	return {
		student: STUDENT,
		plan: scenario === "expired" ? PLAN_EXPIRED : PLAN_ACTIVE,
		devices: [
			{ id: "d-1", label: "Chrome on Android", lastUsedLabel: "Today at 9:12 AM", current: true },
			{ id: "d-2", label: "Chrome on Windows — Karol Bagh lab", lastUsedLabel: "2 September", current: false },
		],
	};
}

/** Screen 10 — Review my mistakes. */
export async function getMyMistakes(attemptId: string): Promise<MyMistakes | null> {
	const attempt = [DONE_READING, DONE_LISTENING].find((a) => a.attemptId === attemptId);
	if (!attempt) return null;

	return {
		attemptId: attempt.attemptId,
		test: attempt.test,
		summary: { correct: 32, wrong: 8, total: 40 },
		questions: [
			{
				number: 3,
				promptHtml: "The museum was built before the town hall.",
				questionType: "identifying_information",
				questionTypeLabel: "True / False / Not Given",
				correct: false,
				givenAnswer: "True",
				correctAnswer: "Not Given",
				explanationHtml:
					"<p>The passage gives the museum's date but never dates the town hall, so the two cannot be compared.</p>",
				audioOffsetSeconds: null,
			},
			{
				number: 7,
				promptHtml: "The recording says the course fee is <strong>____</strong> per term.",
				questionType: "note_completion",
				questionTypeLabel: "Note completion",
				correct: false,
				givenAnswer: "450",
				correctAnswer: "£450",
				explanationHtml: "<p>The currency symbol is part of the answer when the note shows one.</p>",
				audioOffsetSeconds: 148,
			},
			{
				number: 12,
				promptHtml: "Which <strong>two</strong> facilities are free for members?",
				questionType: "mcq_multi",
				questionTypeLabel: "Choose two",
				correct: false,
				givenAnswer: null,
				correctAnswer: "B, D",
				explanationHtml: null,
				audioOffsetSeconds: 302,
			},
			{
				number: 18,
				promptHtml: "The writer believes remote work will replace offices entirely.",
				questionType: "identifying_views_claims",
				questionTypeLabel: "Yes / No / Not Given",
				correct: true,
				givenAnswer: "No",
				correctAnswer: "No",
				explanationHtml: "<p>The writer calls the idea “overstated” in the final paragraph.</p>",
				audioOffsetSeconds: null,
			},
		],
	};
}

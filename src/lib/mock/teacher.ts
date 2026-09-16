import "server-only";

import type {
	AssignOptions,
	AssignmentResults,
	BatchView,
	ClassAnalytics,
	LiveSession,
	TeacherDashboard,
} from "@/lib/view-models/teacher";

/* Teacher fixtures (M6, M7). Replaced by `lib/queries/teacher.ts`. */

const NAMES = [
	"Priya Sharma", "Rahul Menon", "Aisha Khan", "Vikram Patel", "Neha Rao",
	"Arjun Singh", "Sana Iqbal", "Karan Nair", "Divya Joshi", "Imran Bose",
	"Meera Das", "Rohit Verma", "Fatima Ali", "Sameer Gupta", "Anjali Pillai",
	"Nikhil Reddy", "Zoya Ahmed", "Tarun Malhotra", "Kavya Iyer", "Dev Kapoor",
];

/** Deterministic, so screenshots don't churn. */
function phone(i: number) {
	const n = String(9800000000 + i * 137137);
	return `+91 ${n.slice(0, 5)} ${n.slice(5)}`;
}

/** Screen 14 — Teacher dashboard. */
export async function getTeacherDashboard(): Promise<TeacherDashboard> {
	return {
		teacherName: "Anita",
		batches: [
			{ id: "b-0", name: "Morning Batch A", studentCount: 24, averageBand: 6.2, awaitingRelease: 28 },
			{ id: "b-1", name: "Morning Batch B", studentCount: 19, averageBand: 5.8, awaitingRelease: 0 },
			{ id: "b-3", name: "Weekend Batch", studentCount: 8, averageBand: null, awaitingRelease: 0 },
		],
		todaysTests: [
			{
				assignmentId: "a-001",
				testTitle: "Listening Mock Test 2",
				skill: "listening",
				batchName: "Morning Batch A",
				whenLabel: "Running now · closes 6:00 PM",
				liveSessionId: "sess-1",
			},
			{
				assignmentId: "a-004",
				testTitle: "Academic Reading Mock Test 3",
				skill: "reading",
				batchName: "Morning Batch B",
				whenLabel: "4:00 PM today",
				liveSessionId: null,
			},
		],
		needsAttention: [
			{ id: "n1", kind: "release", summary: "28 results for Listening Mock Test 2 are waiting to be released", href: "/results/a-001" },
			{ id: "n2", kind: "override", summary: "3 answers flagged for a second look in Academic Reading Mock Test 3", href: "/results/a-002" },
			{ id: "n3", kind: "expiring", summary: "4 students in Morning Batch A lose access within a week", href: "/batches/b-0" },
		],
	};
}

/** Screen 15 — Batch view. */
export async function getBatchView(batchId: string): Promise<BatchView | null> {
	const names: Record<string, string> = {
		"b-0": "Morning Batch A",
		"b-1": "Morning Batch B",
		"b-3": "Weekend Batch",
	};
	const batchName = names[batchId];
	if (!batchName) return null;

	const size = batchId === "b-0" ? 16 : batchId === "b-1" ? 12 : 6;
	const bands = [5.0, 5.5, 6.0, 6.5, 7.0, 7.5, null];
	const days = [3, 5, 6, 19, 40, 63, 88, -2];

	return {
		batchId,
		batchName,
		roster: Array.from({ length: size }, (_, i) => ({
			studentId: `s-${String(i).padStart(3, "0")}`,
			name: NAMES[i % NAMES.length],
			phone: phone(i),
			lastBand: bands[i % bands.length],
			testsDone: (i * 3) % 12,
			planEndsLabel: ["19 Sep 2026", "21 Sep 2026", "22 Sep 2026", "5 Oct 2026", "26 Oct 2026", "18 Nov 2026", "13 Dec 2026", "14 Sep 2026"][i % 8],
			daysRemaining: days[i % days.length],
			lastActiveLabel: ["Today", "Yesterday", "2 days ago", "Last week", "3 weeks ago"][i % 5],
		})),
	};
}

/** Screen 16 — Assign a test. */
export async function getAssignOptions(): Promise<AssignOptions> {
	return {
		tests: [
			{ id: "t-listening-mock-1", title: "Listening Mock Test 1", skill: "listening", variant: "n_a", difficulty: "medium", questionCount: 40, durationMinutes: 30 },
			{ id: "t-listening-mock-2", title: "Listening Mock Test 2", skill: "listening", variant: "n_a", difficulty: "medium", questionCount: 40, durationMinutes: 30 },
			{ id: "t-reading-ac-3", title: "Academic Reading Mock Test 3", skill: "reading", variant: "academic", difficulty: "hard", questionCount: 40, durationMinutes: 60 },
			{ id: "t-reading-gt-1", title: "General Training Reading Test 1", skill: "reading", variant: "general", difficulty: "easy", questionCount: 40, durationMinutes: 60 },
			{ id: "t-listening-practice-1", title: "Listening Practice — Section 1 Forms", skill: "listening", variant: "n_a", difficulty: "easy", questionCount: 10, durationMinutes: 10 },
		],
		batches: [
			{ id: "b-0", name: "Morning Batch A", studentCount: 24 },
			{ id: "b-1", name: "Morning Batch B", studentCount: 19 },
			{ id: "b-3", name: "Weekend Batch", studentCount: 8 },
		],
		students: NAMES.slice(0, 12).map((name, i) => ({
			id: `s-${String(i).padStart(3, "0")}`,
			name,
			batchName: ["Morning Batch A", "Morning Batch B", "Weekend Batch"][i % 3],
		})),
	};
}

/** Screen 18 — Results & release. */
export async function getAssignmentResults(assignmentId: string): Promise<AssignmentResults | null> {
	if (!assignmentId.startsWith("a-")) return null;

	const rows = Array.from({ length: 14 }, (_, i) => {
		const expired = i === 11;
		const raw = expired ? null : 18 + ((i * 7) % 21);
		const band = raw === null ? null : Math.min(9, Math.round((3.5 + raw / 8) * 2) / 2);
		return {
			attemptId: `at-${200 + i}`,
			studentId: `s-${String(i).padStart(3, "0")}`,
			studentName: NAMES[i % NAMES.length],
			rawScore: raw,
			band,
			bandLabel: band === null ? "—" : band.toFixed(1),
			timeTakenLabel: expired ? "Ran out of time" : `${25 + (i % 6)} min`,
			stateLabel: expired ? "Expired" : "Submitted",
			released: i < 3,
			flags: i === 4 ? ["Left the tab 3 times"] : i === 9 ? ["Left the tab 11 times", "Pasted an answer"] : [],
			answers:
				i === 4
					? [
							{ questionNumber: 7, givenAnswer: "450", correctAnswer: "£450", awarded: 0, max: 1, overridden: false, overrideNote: null },
							{ questionNumber: 19, givenAnswer: "colour", correctAnswer: "color", awarded: 0, max: 1, overridden: false, overrideNote: null },
							{ questionNumber: 23, givenAnswer: "two weeks", correctAnswer: "2 weeks", awarded: 0, max: 1, overridden: false, overrideNote: null },
						]
					: undefined,
		};
	});

	return {
		assignmentId,
		testTitle: "Listening Mock Test 2",
		skill: "listening",
		batchName: "Morning Batch A",
		rows,
		notStarted: 10,
	};
}

/** Screen 19 — Class analytics. */
export async function getClassAnalytics(batchId: string): Promise<ClassAnalytics | null> {
	const names: Record<string, string> = { "b-0": "Morning Batch A", "b-1": "Morning Batch B", "b-3": "Weekend Batch" };
	if (!names[batchId]) return null;

	return {
		batchName: names[batchId],
		bandDistribution: [
			{ band: 4.5, count: 1 }, { band: 5.0, count: 2 }, { band: 5.5, count: 4 },
			{ band: 6.0, count: 7 }, { band: 6.5, count: 5 }, { band: 7.0, count: 3 },
			{ band: 7.5, count: 2 },
		],
		weakestTypes: [
			{ questionType: "identifying_information", label: "True / False / Not Given", percent: 44, attempted: 312 },
			{ questionType: "matching_headings", label: "Matching headings", percent: 51, attempted: 208 },
			{ questionType: "summary_completion", label: "Summary completion", percent: 58, attempted: 192 },
			{ questionType: "note_completion", label: "Note completion", percent: 72, attempted: 288 },
			{ questionType: "mcq_single", label: "Multiple choice", percent: 79, attempted: 264 },
		],
		mostMissed: [
			{ questionNumber: 23, testTitle: "Listening Mock Test 2", wrongCount: 21, total: 24 },
			{ questionNumber: 7, testTitle: "Listening Mock Test 2", wrongCount: 19, total: 24 },
			{ questionNumber: 31, testTitle: "Listening Mock Test 2", wrongCount: 17, total: 24 },
			{ questionNumber: 12, testTitle: "Listening Mock Test 2", wrongCount: 15, total: 24 },
			{ questionNumber: 38, testTitle: "Listening Mock Test 2", wrongCount: 14, total: 24 },
		],
		studentCount: 24,
		averageBand: 6.2,
	};
}

/** Screen 17 — Live session monitor. */
export async function getLiveSession(sessionId: string): Promise<LiveSession | null> {
	if (!sessionId.startsWith("sess-")) return null;

	const states = ["in_progress", "in_progress", "submitted", "in_progress", "not_started", "expired"] as const;
	return {
		sessionId,
		testTitle: "Listening Mock Test 2",
		batchName: "Morning Batch A",
		lastUpdatedLabel: "just now",
		students: Array.from({ length: 18 }, (_, i) => {
			const state = states[i % states.length];
			return {
				attemptId: `at-${300 + i}`,
				studentId: `s-${String(i).padStart(3, "0")}`,
				name: NAMES[i % NAMES.length],
				state,
				secondsRemaining:
					state === "in_progress" ? 60 * (4 + ((i * 5) % 22)) + (i * 7) % 60 : null,
				answered: state === "not_started" ? 0 : state === "submitted" ? 40 : 8 + ((i * 3) % 28),
				total: 40,
				// A flag only makes sense once they've actually opened the test.
				flags:
					state === "not_started"
						? []
						: i === 3
							? ["Left the tab 3 times"]
							: i === 9
								? ["Left the tab 11 times"]
								: [],
			};
		}),
	};
}

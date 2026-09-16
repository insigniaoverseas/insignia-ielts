import "server-only";

import type {
	AdminOverview,
	AnswerKeyEditor,
	BatchRow,
	PlansWorkqueue,
	StudentDetail,
	StudentRow,
	StudentsList,
	TestLibraryRow,
	UsersAndRoles,
	AuditLog,
	AuditEntry,
} from "@/lib/view-models/admin";

/*
 * Admin fixtures (M5). Replaced by `lib/queries/admin.ts`; see
 * `lib/mock/README.md`.
 */

const FIRST = ["Priya", "Rahul", "Aisha", "Vikram", "Neha", "Arjun", "Sana", "Karan", "Divya", "Imran"];
const LAST = ["Sharma", "Menon", "Khan", "Patel", "Rao", "Singh", "Iqbal", "Nair", "Joshi", "Bose"];
const BATCHES = ["Morning Batch A", "Morning Batch B", "Evening Batch A", "Weekend Batch"];

/** Deterministic so screenshots and reviews don't churn between runs. */
function student(i: number): StudentRow {
	const days = [-22, -9, -2, 3, 5, 6, 11, 19, 40, 63, 88, 120][i % 12];
	const planState = days < 0 ? "expired" : days <= 7 ? "expiring" : "active";
	const bands = [5.0, 5.5, 6.0, 6.5, 7.0, 7.5, null];
	return {
		id: `s-${String(i).padStart(3, "0")}`,
		name: `${FIRST[i % FIRST.length]} ${LAST[(i * 3) % LAST.length]}`,
		// Indian mobiles are 10 digits, shown 5+5 — the form staff read them in.
		phone: `+91 ${String(9800000000 + i * 137137).slice(0, 5)} ${String(9800000000 + i * 137137).slice(5)}`,
		batchName: BATCHES[i % BATCHES.length],
		status: i % 11 === 7 ? "suspended" : "active",
		planState,
		planEndsLabel: [
			"25 Aug 2026", "7 Sep 2026", "14 Sep 2026", "19 Sep 2026", "21 Sep 2026", "22 Sep 2026",
			"27 Sep 2026", "5 Oct 2026", "26 Oct 2026", "18 Nov 2026", "13 Dec 2026", "14 Jan 2027",
		][i % 12],
		daysRemaining: days,
		lastBand: bands[i % bands.length],
		testsTaken: (i * 3) % 14,
		lastActiveLabel: ["Today", "Yesterday", "2 days ago", "Last week", "3 weeks ago"][i % 5],
	};
}

const STUDENTS: StudentRow[] = Array.from({ length: 48 }, (_, i) => student(i));

/** Screen 20 — Admin overview. */
export async function getAdminOverview(): Promise<AdminOverview> {
	return {
		stats: {
			activeStudents: 312,
			testsThisWeek: 148,
			expiringIn7Days: STUDENTS.filter((s) => s.daysRemaining >= 0 && s.daysRemaining <= 7).length,
			liveSessions: 2,
		},
		deltas: { activeStudents: "+12 since last week", testsThisWeek: "+31 since last week" },
		expiringSoon: STUDENTS.filter((s) => s.daysRemaining >= 0 && s.daysRemaining <= 7).sort(
			(a, b) => a.daysRemaining - b.daysRemaining,
		),
		recentActivity: [
			{ id: "a1", whenLabel: "09:41", actor: "Anita Desai", summary: "Released results for Listening Mock Test 2 (28 students)" },
			{ id: "a2", whenLabel: "09:12", actor: "You", summary: "Extended 6 plans by 3 months" },
			{ id: "a3", whenLabel: "Yesterday, 18:30", actor: "Ravi Kumar", summary: "Invited 14 students to Evening Batch A" },
			{ id: "a4", whenLabel: "Yesterday, 16:02", actor: "Anita Desai", summary: "Published Academic Reading Mock Test 4" },
			{ id: "a5", whenLabel: "Yesterday, 11:47", actor: "You", summary: "Moved 3 students to Weekend Batch" },
		],
	};
}

/** Screen 21 — Students list. */
export async function getStudentsList(query?: {
	search?: string;
	batch?: string;
	status?: string;
}): Promise<StudentsList> {
	let rows = STUDENTS;
	if (query?.search) {
		const q = query.search.toLowerCase();
		rows = rows.filter((r) => r.name.toLowerCase().includes(q) || r.phone.includes(q));
	}
	if (query?.batch && query.batch !== "all") rows = rows.filter((r) => r.batchName === query.batch);
	if (query?.status && query.status !== "all") rows = rows.filter((r) => r.planState === query.status);

	return {
		rows: rows.slice(0, 25),
		total: rows.length,
		batches: BATCHES.map((name, i) => ({ id: `b-${i}`, name })),
	};
}

/** Screen 23 — Student detail drawer. */
export async function getStudentDetail(id: string): Promise<StudentDetail | null> {
	const s = STUDENTS.find((x) => x.id === id);
	if (!s) return null;
	return {
		student: s,
		planHistory: [
			{ id: "p1", whenLabel: "11 Jun 2026", action: "Created", detail: "3 months, ends 11 Sep 2026", actor: "Ravi Kumar" },
			{ id: "p2", whenLabel: "2 Sep 2026", action: "Extended", detail: "+10 days, ends 21 Sep 2026 — “missed classes, illness”", actor: "You" },
		],
		attempts: [
			{ attemptId: "at-101", testTitle: "Academic Reading Mock Test 3", skill: "reading", whenLabel: "2 Sep 2026", band: 6.5, bandLabel: "6.5", state: "Released" },
			{ attemptId: "at-102", testTitle: "Listening Mock Test 1", skill: "listening", whenLabel: "19 Aug 2026", band: 6.0, bandLabel: "6.0", state: "Released" },
			{ attemptId: "at-103", testTitle: "Listening Mock Test 2", skill: "listening", whenLabel: "15 Sep 2026", band: null, bandLabel: "Held — not released", state: "Submitted" },
		],
		auditTrail: [
			{ id: "u1", whenLabel: "2 Sep 2026, 09:12", actor: "You", summary: "Extended plan by 10 days" },
			{ id: "u2", whenLabel: "14 Aug 2026, 17:40", actor: "Anita Desai", summary: "Moved to Morning Batch A" },
			{ id: "u3", whenLabel: "11 Jun 2026, 10:03", actor: "Ravi Kumar", summary: "Invitation accepted" },
		],
	};
}

/** Screen 24 — Plans & validity. */
export async function getPlansWorkqueue(): Promise<PlansWorkqueue> {
	return {
		expired: STUDENTS.filter((s) => s.daysRemaining < 0),
		expiringThisWeek: STUDENTS.filter((s) => s.daysRemaining >= 0 && s.daysRemaining <= 7),
		expiringThisMonth: STUDENTS.filter((s) => s.daysRemaining > 7 && s.daysRemaining <= 31),
	};
}

/** Screen 25 — Batches. */
export async function getBatches(): Promise<BatchRow[]> {
	return [
		{ id: "b-0", name: "Morning Batch A", branchName: "Karol Bagh", teacherNames: ["Anita Desai"], studentCount: 24, startsLabel: "1 Jun 2026", endsLabel: "30 Sep 2026", status: "active" },
		{ id: "b-1", name: "Morning Batch B", branchName: "Karol Bagh", teacherNames: ["Anita Desai", "Ravi Kumar"], studentCount: 19, startsLabel: "1 Jul 2026", endsLabel: "31 Oct 2026", status: "active" },
		{ id: "b-2", name: "Evening Batch A", branchName: "Lajpat Nagar", teacherNames: ["Ravi Kumar"], studentCount: 31, startsLabel: "15 Jun 2026", endsLabel: null, status: "active" },
		{ id: "b-3", name: "Weekend Batch", branchName: "Karol Bagh", teacherNames: [], studentCount: 8, startsLabel: "6 Sep 2026", endsLabel: "20 Dec 2026", status: "active" },
		{ id: "b-4", name: "Spring Intensive", branchName: "Karol Bagh", teacherNames: ["Anita Desai"], studentCount: 0, startsLabel: "1 Mar 2026", endsLabel: "30 Apr 2026", status: "completed" },
	];
}

/** Screen 26 — Test library. */
export async function getTestLibrary(): Promise<TestLibraryRow[]> {
	return [
		{ id: "t-listening-mock-1", title: "Listening Mock Test 1", skill: "listening", variant: "n_a", difficulty: "medium", questionCount: 40, status: "published", keysEntered: 40, tags: ["Cambridge 17"], updatedLabel: "12 Aug 2026" },
		{ id: "t-listening-mock-2", title: "Listening Mock Test 2", skill: "listening", variant: "n_a", difficulty: "medium", questionCount: 40, status: "published", keysEntered: 40, tags: ["Cambridge 17"], updatedLabel: "28 Aug 2026" },
		{ id: "t-reading-ac-3", title: "Academic Reading Mock Test 3", skill: "reading", variant: "academic", difficulty: "hard", questionCount: 40, status: "published", keysEntered: 40, tags: ["Cambridge 18"], updatedLabel: "30 Aug 2026" },
		{ id: "t-reading-ac-4", title: "Academic Reading Mock Test 4", skill: "reading", variant: "academic", difficulty: "medium", questionCount: 40, status: "draft", keysEntered: 34, tags: [], updatedLabel: "Yesterday" },
		{ id: "t-reading-gt-1", title: "General Training Reading Test 1", skill: "reading", variant: "general", difficulty: "easy", questionCount: 40, status: "draft", keysEntered: 0, tags: ["GT"], updatedLabel: "Today" },
		{ id: "t-listening-practice-1", title: "Listening Practice — Section 1 Forms", skill: "listening", variant: "n_a", difficulty: "easy", questionCount: 10, status: "published", keysEntered: 10, tags: ["practice"], updatedLabel: "3 Jul 2026" },
	];
}

/** Screen 27 — Answer key editor. See the warning on `AnswerKeyEditor`. */
export async function getAnswerKey(testId: string): Promise<AnswerKeyEditor | null> {
	const test = (await getTestLibrary()).find((t) => t.id === testId);
	if (!test) return null;

	const TYPES: [string, string][] = [
		["note_completion", "Note completion"],
		["mcq_single", "Multiple choice"],
		["matching", "Matching"],
		["short_answer", "Short answer"],
	];
	const SAMPLES = ["Wentworth", "Station", "SW1 4QP", "£450", "B", "morning", "A", "twenty", "", ""];

	return {
		testId: test.id,
		testTitle: test.title,
		skill: test.skill,
		rows: Array.from({ length: test.questionCount }, (_, i) => {
			const [questionType, questionTypeLabel] = TYPES[Math.floor(i / 10) % TYPES.length];
			const answer = i < test.keysEntered ? SAMPLES[i % SAMPLES.length] || `answer ${i + 1}` : "";
			return {
				number: i + 1,
				questionType,
				questionTypeLabel,
				answer,
				acceptedVariants: answer === "£450" ? ["450", "450 pounds"] : answer === "twenty" ? ["20"] : [],
				marks: 1,
			};
		}),
	};
}

/** Screen 28 — Users & roles. */
export async function getUsersAndRoles(): Promise<UsersAndRoles> {
	const roles = [
		{ key: "super_admin", label: "Owner", userCount: 1 },
		{ key: "admin", label: "Admin", userCount: 1 },
		{ key: "teacher", label: "Teacher", userCount: 2 },
		{ key: "invigilator", label: "Invigilator", userCount: 1 },
	];

	/* Mirrors the seeded `roles.permissions`. The real screen reads that table —
	   the matrix is data, never a hardcoded grid in the UI. */
	const P = (all?: string | null, admin?: string | null, teacher?: string | null, invig?: string | null) => ({
		super_admin: all ?? null,
		admin: admin ?? null,
		teacher: teacher ?? null,
		invigilator: invig ?? null,
	});

	return {
		users: [
			{ id: "u-1", name: "Rajender Gaur", email: "owner@example.com", roleKey: "super_admin", roleLabel: "Owner", branchName: "Karol Bagh", status: "active", lastActiveLabel: "Today" },
			{ id: "u-2", name: "Ravi Kumar", email: "ravi@example.com", roleKey: "admin", roleLabel: "Admin", branchName: "Karol Bagh", status: "active", lastActiveLabel: "Today" },
			{ id: "u-3", name: "Anita Desai", email: "anita@example.com", roleKey: "teacher", roleLabel: "Teacher", branchName: "Karol Bagh", status: "active", lastActiveLabel: "Yesterday" },
			{ id: "u-4", name: "Suresh Iyer", email: "suresh@example.com", roleKey: "invigilator", roleLabel: "Invigilator", branchName: "Lajpat Nagar", status: "active", lastActiveLabel: "Last week" },
			{ id: "u-5", name: "Farah Sheikh", email: "farah@example.com", roleKey: "teacher", roleLabel: "Teacher", branchName: "Lajpat Nagar", status: "inactive", lastActiveLabel: "3 months ago" },
		],
		roles,
		matrix: [
			{ permission: "attempt:take", label: "Take tests", byRole: P() },
			{ permission: "session:invigilate", label: "Run a live session", byRole: P("all", "branch", null, "branch") },
			{ permission: "assignment:manage", label: "Assign tests", byRole: P("all", "branch", "batch") },
			{ permission: "results:release", label: "Release results", byRole: P("all", "branch", "batch") },
			{ permission: "mark:override", label: "Change a mark", byRole: P("all", "branch", "batch") },
			{ permission: "test:author", label: "Write tests and keys", byRole: P("all", "all", "all") },
			{ permission: "test:publish", label: "Publish a test", byRole: P("all", "all") },
			{ permission: "band_scale:edit", label: "Edit band scales", byRole: P("all", "all") },
			{ permission: "student:manage", label: "Manage students and plans", byRole: P("all", "branch") },
			{ permission: "staff:manage", label: "Manage teachers", byRole: P("all", "branch") },
			{ permission: "admin:manage", label: "Manage admins", byRole: P("all") },
			{ permission: "role:change", label: "Change someone's role", byRole: P("all") },
			{ permission: "audit:read", label: "Read the audit log", byRole: P("all", "branch") },
		],
	};
}

/** Screen 29 — Audit log. */
export async function getAuditLog(query?: { action?: string }): Promise<AuditLog> {
	const ACTIONS = [
		{ value: "plan.extend", label: "Plan extended" },
		{ value: "results.release", label: "Results released" },
		{ value: "mark.override", label: "Mark changed" },
		{ value: "invitation.create", label: "Invitation sent" },
		{ value: "test.publish", label: "Test published" },
		{ value: "role.change", label: "Role changed" },
	];

	const raw: AuditEntry[] = [
		{ id: "e1", whenLabel: "16 Sep 2026, 09:41", actorName: "Anita Desai", actorRole: "Teacher", action: "results.release", actionLabel: "Results released", target: "Listening Mock Test 2 · Morning Batch A", detail: "28 attempts" },
		{ id: "e2", whenLabel: "16 Sep 2026, 09:12", actorName: "Rajender Gaur", actorRole: "Owner", action: "plan.extend", actionLabel: "Plan extended", target: "6 students", detail: "+3 months — “fee cycle moved”" },
		{ id: "e3", whenLabel: "15 Sep 2026, 18:30", actorName: "Ravi Kumar", actorRole: "Admin", action: "invitation.create", actionLabel: "Invitation sent", target: "14 students · Evening Batch A", detail: "Bulk CSV import" },
		{ id: "e4", whenLabel: "15 Sep 2026, 16:02", actorName: "Anita Desai", actorRole: "Teacher", action: "test.publish", actionLabel: "Test published", target: "Academic Reading Mock Test 4", detail: "40 of 40 keys entered" },
		{ id: "e5", whenLabel: "15 Sep 2026, 14:20", actorName: "Anita Desai", actorRole: "Teacher", action: "mark.override", actionLabel: "Mark changed", target: "Neha Rao · question 7", detail: "0 → 1 — “£ sign not required by the key”" },
		{ id: "e6", whenLabel: "12 Sep 2026, 11:05", actorName: null, actorRole: null, action: "role.change", actionLabel: "Role changed", target: "Farah Sheikh", detail: "Teacher → Invigilator" },
	];

	const entries = query?.action && query.action !== "all" ? raw.filter((e) => e.action === query.action) : raw;
	return { entries, total: entries.length, actions: ACTIONS };
}

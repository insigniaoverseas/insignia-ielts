import "server-only";

import { PERMISSIONS, parsePermissions } from "@/lib/permissions";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/time";
import type {
	AdminOverview,
	AuditEntry,
	AuditLog,
	BatchDetail,
	BatchRow,
	PlanState,
	PlansWorkqueue,
	StudentDetail,
	StudentRow,
	StudentsList,
	TestLibraryRow,
	UsersAndRoles,
} from "@/lib/view-models/admin";
import { daysUntil, displayPhone, formatShortDate, queryFailed, relativeActivity } from "./shared";

type Tables = Database["public"]["Tables"];
type User = Tables["users"]["Row"];
type Plan = Tables["student_plans"]["Row"];
type Attempt = Tables["attempts"]["Row"];

const ACTION_LABEL: Record<string, string> = {
	"auth.sign_in": "Signed in",
	"auth.sign_out": "Signed out",
	"invitation.create": "Invitation sent",
	"invitation.revoke": "Invitation revoked",
	"invitation.resend": "Invitation resent",
	"plan.extend": "Plan extended",
	"results.release": "Results released",
	"mark.override": "Mark changed",
	"test.publish": "Test published",
	"role.change": "Role changed",
	"session.revoke": "Session revoked",
};

const PERMISSION_LABEL: Record<string, string> = {
	"attempt:take": "Take tests",
	"session:invigilate": "Run a live session",
	"assignment:manage": "Assign tests",
	"results:release": "Release results",
	"mark:override": "Change a mark",
	"test:author": "Write tests and keys",
	"test:publish": "Publish a test",
	"band_scale:edit": "Edit band scales",
	"student:manage": "Manage students and plans",
	"staff:manage": "Manage teachers",
	"admin:manage": "Manage admins",
	"role:change": "Change someone's role",
	"audit:read": "Read the audit log",
};

function newestBy<T>(rows: T[], key: (row: T) => string): T | null {
	return [...rows].sort((a, b) => key(b).localeCompare(key(a)))[0] ?? null;
}

function planState(plan: Plan | null, user: User): { state: PlanState; days: number; label: string } {
	if (user.status === "suspended" || plan?.status === "suspended") {
		return { state: "suspended", days: -1, label: plan ? formatShortDate(plan.expires_on) : "Paused" };
	}
	if (!plan) return { state: "expired", days: -1, label: "No plan" };
	const days = daysUntil(plan.expires_on);
	return {
		state: days < 0 || plan.status === "expired" ? "expired" : days <= 7 ? "expiring" : "active",
		days,
		label: formatShortDate(plan.expires_on),
	};
}

async function allStudentRows(): Promise<{
	rows: StudentRow[];
	batchIdByStudent: Map<string, string>;
}> {
	const supabase = await createClient();
	const { data: studentRole, error: roleError } = await supabase.from("roles").select("id").eq("key", "student").maybeSingle();
	if (roleError) queryFailed("student role", roleError);
	if (!studentRole) return { rows: [], batchIdByStudent: new Map() };

	const [usersResult, plansResult, membershipsResult, batchesResult, attemptsResult, scoresResult, sessionsResult] =
		await Promise.all([
			supabase.from("users").select("*").eq("role_id", studentRole.id).order("name"),
			supabase.from("student_plans").select("*").order("expires_on", { ascending: false }),
			supabase.from("batch_students").select("batch_id, student_id, left_at"),
			supabase.from("batches").select("id, name"),
			supabase.from("attempts").select("id, student_id, status, submitted_at"),
			supabase.from("attempt_scores").select("attempt_id, band"),
			supabase.from("user_sessions").select("user_id, last_seen_at"),
		]);
	if (usersResult.error) queryFailed("students", usersResult.error);
	if (plansResult.error) queryFailed("student plans", plansResult.error);
	if (membershipsResult.error) queryFailed("batch memberships", membershipsResult.error);
	if (batchesResult.error) queryFailed("batches", batchesResult.error);
	if (attemptsResult.error) queryFailed("student attempts", attemptsResult.error);
	if (scoresResult.error) queryFailed("student scores", scoresResult.error);
	if (sessionsResult.error) queryFailed("student sessions", sessionsResult.error);

	const users = (usersResult.data ?? []) as User[];
	const plans = (plansResult.data ?? []) as Plan[];
	const attempts = (attemptsResult.data ?? []) as Pick<Attempt, "id" | "student_id" | "status" | "submitted_at">[];
	const scoreByAttempt = new Map((scoresResult.data ?? []).map((score) => [score.attempt_id, score.band]));
	const batchById = new Map((batchesResult.data ?? []).map((batch) => [batch.id, batch.name]));
	const activeMemberships = (membershipsResult.data ?? []).filter((membership) => membership.left_at === null);
	const membershipByStudent = new Map(activeMemberships.map((membership) => [membership.student_id, membership.batch_id]));
	const latestSession = new Map<string, string>();
	for (const session of sessionsResult.data ?? []) {
		const existing = latestSession.get(session.user_id);
		if (!existing || session.last_seen_at > existing) latestSession.set(session.user_id, session.last_seen_at);
	}

	return {
		batchIdByStudent: membershipByStudent,
		rows: users.map((user) => {
			const currentPlan = newestBy(plans.filter((plan) => plan.student_id === user.id), (plan) => plan.expires_on);
			const access = planState(currentPlan, user);
			const finished = attempts.filter((attempt) => attempt.student_id === user.id && attempt.status !== "in_progress");
			const lastScored = newestBy(
				finished.filter((attempt) => scoreByAttempt.has(attempt.id)),
				(attempt) => attempt.submitted_at ?? "",
			);
			const batchId = membershipByStudent.get(user.id);
			return {
				id: user.id,
				name: user.name,
				phone: displayPhone(user.country_code, user.phone),
				batchName: batchId ? batchById.get(batchId) ?? null : null,
				status: user.status === "inactive" || user.status === "suspended" ? user.status : "active",
				planState: access.state,
				planEndsLabel: access.label,
				daysRemaining: access.days,
				lastBand: lastScored ? scoreByAttempt.get(lastScored.id) ?? null : null,
				testsTaken: finished.length,
				lastActiveLabel: relativeActivity(latestSession.get(user.id) ?? null),
			};
		}),
	};
}

function jsonDetail(meta: Json): string {
	if (typeof meta !== "object" || meta === null || Array.isArray(meta)) return "";
	return Object.entries(meta)
		.map(([key, value]) => `${key.replaceAll("_", " ")}: ${typeof value === "string" ? value : JSON.stringify(value)}`)
		.join(" · ");
}

async function auditEntries(limit = 100): Promise<AuditEntry[]> {
	const supabase = await createClient();
	const { data: logs, error } = await supabase.from("audit_log").select("*").order("at", { ascending: false }).limit(limit);
	if (error) queryFailed("audit log", error);
	const actorIds = [...new Set((logs ?? []).flatMap((log) => (log.actor_id ? [log.actor_id] : [])))];
	const actorResult = actorIds.length
		? await supabase.from("users").select("id, name, role_id").in("id", actorIds)
		: { data: [], error: null };
	if (actorResult.error) queryFailed("audit actors", actorResult.error);
	const roleIds = [...new Set((actorResult.data ?? []).map((actor) => actor.role_id))];
	const roleResult = roleIds.length
		? await supabase.from("roles").select("id, name").in("id", roleIds)
		: { data: [], error: null };
	if (roleResult.error) queryFailed("audit actor roles", roleResult.error);
	const roles = new Map((roleResult.data ?? []).map((role) => [role.id, role.name]));
	const actors = new Map((actorResult.data ?? []).map((actor) => [actor.id, actor]));

	return (logs ?? []).map((log) => {
		const actor = log.actor_id ? actors.get(log.actor_id) : null;
		return {
			id: log.id,
			whenLabel: formatDateTime(log.at),
			actorName: actor?.name ?? null,
			actorRole: actor ? roles.get(actor.role_id) ?? null : null,
			action: log.action,
			actionLabel: ACTION_LABEL[log.action] ?? log.action.replaceAll(".", " "),
			target: `${log.entity}${log.entity_id ? ` · ${log.entity_id}` : ""}`,
			detail: jsonDetail(log.meta),
		};
	});
}

/** Screen 20 — live counts and recent audited activity. */
export async function getAdminOverview(): Promise<AdminOverview> {
	const supabase = await createClient();
	const [{ rows }, attemptsResult, recentActivity] = await Promise.all([
		allStudentRows(),
		supabase.from("attempts").select("status, started_at, expires_at"),
		auditEntries(5),
	]);
	if (attemptsResult.error) queryFailed("overview attempts", attemptsResult.error);
	const weekAgo = Date.now() - 7 * 86_400_000;
	const attempts = attemptsResult.data ?? [];
	return {
		stats: {
			activeStudents: rows.filter((row) => row.status === "active" && row.planState !== "expired" && row.planState !== "suspended").length,
			testsThisWeek: attempts.filter((attempt) => new Date(attempt.started_at).getTime() >= weekAgo).length,
			expiringIn7Days: rows.filter((row) => row.daysRemaining >= 0 && row.daysRemaining <= 7).length,
			liveSessions: attempts.filter((attempt) => attempt.status === "in_progress" && new Date(attempt.expires_at) > new Date()).length,
		},
		deltas: { activeStudents: "Current total", testsThisWeek: "Last 7 days" },
		expiringSoon: rows
			.filter((row) => row.daysRemaining >= 0 && row.daysRemaining <= 7)
			.sort((a, b) => a.daysRemaining - b.daysRemaining),
		recentActivity: recentActivity.map((entry) => ({
			id: entry.id,
			whenLabel: entry.whenLabel,
			actor: entry.actorName ?? "Account deleted",
			summary: `${entry.actionLabel}${entry.detail ? ` — ${entry.detail}` : ""}`,
		})),
	};
}

/** Screen 21 — scoped student directory and real filters. */
export async function getStudentsList(query?: { search?: string; batch?: string; status?: string }): Promise<StudentsList> {
	const supabase = await createClient();
	const [{ rows: allRows, batchIdByStudent }, batchesResult] = await Promise.all([
		allStudentRows(),
		supabase.from("batches").select("id, name").order("name"),
	]);
	if (batchesResult.error) queryFailed("student filters", batchesResult.error);
	let rows = allRows;
	if (query?.search?.trim()) {
		const needle = query.search.trim().toLowerCase();
		rows = rows.filter((row) => row.name.toLowerCase().includes(needle) || row.phone.toLowerCase().includes(needle));
	}
	if (query?.batch && query.batch !== "all") rows = rows.filter((row) => batchIdByStudent.get(row.id) === query.batch);
	if (query?.status && query.status !== "all") rows = rows.filter((row) => row.planState === query.status);
	return { rows: rows.slice(0, 25), total: rows.length, batches: batchesResult.data ?? [] };
}

/** Screen 23 — one RLS-visible student and their Supabase history. */
export async function getStudentDetail(id: string): Promise<StudentDetail | null> {
	const supabase = await createClient();
	const { rows } = await allStudentRows();
	const student = rows.find((row) => row.id === id);
	if (!student) return null;
	const [plansResult, attemptsResult, logs] = await Promise.all([
		supabase.from("student_plans").select("id").eq("student_id", id),
		supabase.from("attempts").select("*").eq("student_id", id).order("started_at", { ascending: false }),
		auditEntries(200),
	]);
	if (plansResult.error) queryFailed("student plans", plansResult.error);
	if (attemptsResult.error) queryFailed("student attempts", attemptsResult.error);
	const planIds = (plansResult.data ?? []).map((plan) => plan.id);
	const historyResult = planIds.length
		? await supabase.from("plan_history").select("*").in("plan_id", planIds).order("at")
		: { data: [], error: null };
	if (historyResult.error) queryFailed("plan history", historyResult.error);
	const actorIds = [...new Set((historyResult.data ?? []).flatMap((row) => (row.actor_id ? [row.actor_id] : [])))];
	const actorsResult = actorIds.length
		? await supabase.from("users").select("id, name").in("id", actorIds)
		: { data: [], error: null };
	if (actorsResult.error) queryFailed("plan history actors", actorsResult.error);
	const actors = new Map((actorsResult.data ?? []).map((actor) => [actor.id, actor.name]));
	const attempts = (attemptsResult.data ?? []) as Attempt[];
	const testIds = [...new Set(attempts.map((attempt) => attempt.test_id))];
	const attemptIds = attempts.map((attempt) => attempt.id);
	const [testsResult, scoresResult] = await Promise.all([
		testIds.length
			? supabase.from("tests").select("id, title, skill").in("id", testIds)
			: Promise.resolve({ data: [], error: null }),
		attemptIds.length
			? supabase.from("attempt_scores").select("attempt_id, band, below_band").in("attempt_id", attemptIds)
			: Promise.resolve({ data: [], error: null }),
	]);
	if (testsResult.error) queryFailed("student attempt tests", testsResult.error);
	if (scoresResult.error) queryFailed("student attempt scores", scoresResult.error);
	const tests = new Map((testsResult.data ?? []).map((test) => [test.id, test]));
	const scores = new Map((scoresResult.data ?? []).map((score) => [score.attempt_id, score]));

	return {
		student,
		planHistory: (historyResult.data ?? []).map((item) => ({
			id: item.id,
			whenLabel: formatShortDate(item.at),
			action: item.action.charAt(0).toUpperCase() + item.action.slice(1),
			detail: [item.old_expiry ? `from ${formatShortDate(item.old_expiry)}` : null, item.new_expiry ? `to ${formatShortDate(item.new_expiry)}` : null, item.reason].filter(Boolean).join(" · "),
			actor: item.actor_id ? actors.get(item.actor_id) ?? "Account deleted" : "System",
		})),
		attempts: attempts.flatMap((attempt) => {
			const test = tests.get(attempt.test_id);
			if (!test || (test.skill !== "listening" && test.skill !== "reading")) return [];
			const score = scores.get(attempt.id);
			return [{
				attemptId: attempt.id,
				testTitle: test.title,
				skill: test.skill,
				whenLabel: formatShortDate(attempt.submitted_at ?? attempt.started_at),
				band: score?.band ?? null,
				bandLabel: score?.band !== null && score?.band !== undefined ? score.band.toFixed(1) : score?.below_band ? `Below ${score.below_band}` : "Held — not released",
				state: attempt.status.charAt(0).toUpperCase() + attempt.status.slice(1).replaceAll("_", " "),
			}];
		}),
		auditTrail: logs
			.filter((entry) => entry.target.includes(id))
			.map((entry) => ({ id: entry.id, whenLabel: entry.whenLabel, actor: entry.actorName ?? "Account deleted", summary: `${entry.actionLabel}${entry.detail ? ` — ${entry.detail}` : ""}` })),
	};
}

/** Screen 24 — expiry workqueue. */
export async function getPlansWorkqueue(): Promise<PlansWorkqueue> {
	const { rows } = await allStudentRows();
	return {
		expired: rows.filter((row) => row.planState === "expired"),
		expiringThisWeek: rows.filter((row) => row.daysRemaining >= 0 && row.daysRemaining <= 7),
		expiringThisMonth: rows.filter((row) => row.daysRemaining > 7 && row.daysRemaining <= 31),
	};
}

/** Screen 25 — batches, staffing and active membership counts. */
export async function getBatches(): Promise<BatchRow[]> {
	const supabase = await createClient();
	const [batchesResult, branchesResult, teachersResult, membershipsResult, usersResult] = await Promise.all([
		supabase.from("batches").select("*").order("name"),
		supabase.from("branches").select("id, name"),
		supabase.from("batch_teachers").select("batch_id, teacher_id"),
		supabase.from("batch_students").select("batch_id, left_at"),
		supabase.from("users").select("id, name"),
	]);
	if (batchesResult.error) queryFailed("batches", batchesResult.error);
	if (branchesResult.error) queryFailed("batch branches", branchesResult.error);
	if (teachersResult.error) queryFailed("batch teachers", teachersResult.error);
	if (membershipsResult.error) queryFailed("batch students", membershipsResult.error);
	if (usersResult.error) queryFailed("batch people", usersResult.error);
	const branches = new Map((branchesResult.data ?? []).map((branch) => [branch.id, branch.name]));
	const users = new Map((usersResult.data ?? []).map((user) => [user.id, user.name]));
	return (batchesResult.data ?? []).map((batch) => ({
		id: batch.id,
		name: batch.name,
		branchName: branches.get(batch.branch_id) ?? "Unknown centre",
		teacherNames: (teachersResult.data ?? []).filter((row) => row.batch_id === batch.id).flatMap((row) => users.get(row.teacher_id) ?? []),
		studentCount: (membershipsResult.data ?? []).filter((row) => row.batch_id === batch.id && row.left_at === null).length,
		startsLabel: batch.starts_on ? formatShortDate(batch.starts_on) : null,
		endsLabel: batch.ends_on ? formatShortDate(batch.ends_on) : null,
		status: batch.status === "completed" || batch.status === "archived" ? batch.status : "active",
	}));
}

/** Screen 26 — Supabase catalogue metadata; key contents remain private in R2. */
export async function getTestLibrary(): Promise<TestLibraryRow[]> {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("tests")
		.select("id, title, skill, variant, difficulty, total_questions, status, tags, updated_at")
		.in("skill", ["listening", "reading"])
		.order("updated_at", { ascending: false });
	if (error) queryFailed("test library", error);
	return (data ?? []).flatMap((test) => {
		if (!(["listening", "reading"] as string[]).includes(test.skill)) return [];
		if (!(["academic", "general", "n_a"] as string[]).includes(test.variant)) return [];
		if (!(["easy", "medium", "hard"] as string[]).includes(test.difficulty)) return [];
		if (!(["draft", "published", "archived"] as string[]).includes(test.status)) return [];
		return [{
			id: test.id,
			title: test.title,
			skill: test.skill as TestLibraryRow["skill"],
			variant: test.variant as TestLibraryRow["variant"],
			difficulty: test.difficulty as TestLibraryRow["difficulty"],
			questionCount: test.total_questions,
			status: test.status as TestLibraryRow["status"],
			keysEntered: null,
			tags: test.tags,
			updatedLabel: formatShortDate(test.updated_at),
		}];
	});
}

/** One test's safe metadata for the deferred R2 answer-key screen. */
export async function getAnswerKeyMetadata(testId: string): Promise<{ id: string; title: string; skill: "listening" | "reading" } | null> {
	const supabase = await createClient();
	const { data, error } = await supabase.from("tests").select("id, title, skill").eq("id", testId).maybeSingle();
	if (error) queryFailed("answer-key test", error);
	if (!data || (data.skill !== "listening" && data.skill !== "reading")) return null;
	return { id: data.id, title: data.title, skill: data.skill };
}

/** Screen 28 — staff and the permission matrix stored in `roles.permissions`. */
export async function getUsersAndRoles(): Promise<UsersAndRoles> {
	const supabase = await createClient();
	const [rolesResult, usersResult, branchesResult, sessionsResult] = await Promise.all([
		supabase.from("roles").select("id, key, name, permissions").order("created_at"),
		supabase.from("users").select("id, name, email, role_id, branch_id, status").order("name"),
		supabase.from("branches").select("id, name"),
		supabase.from("user_sessions").select("user_id, last_seen_at"),
	]);
	if (rolesResult.error) queryFailed("roles", rolesResult.error);
	if (usersResult.error) queryFailed("staff users", usersResult.error);
	if (branchesResult.error) queryFailed("staff branches", branchesResult.error);
	if (sessionsResult.error) queryFailed("staff sessions", sessionsResult.error);
	const roles = rolesResult.data ?? [];
	const roleById = new Map(roles.map((role) => [role.id, role]));
	const branches = new Map((branchesResult.data ?? []).map((branch) => [branch.id, branch.name]));
	const lastSeen = new Map<string, string>();
	for (const session of sessionsResult.data ?? []) {
		const current = lastSeen.get(session.user_id);
		if (!current || session.last_seen_at > current) lastSeen.set(session.user_id, session.last_seen_at);
	}
	const staff = (usersResult.data ?? []).filter((user) => roleById.get(user.role_id)?.key !== "student");
	return {
		users: staff.map((user) => {
			const role = roleById.get(user.role_id);
			return {
				id: user.id,
				name: user.name,
				email: user.email,
				roleKey: role?.key ?? "unknown",
				roleLabel: role?.name ?? "Unknown",
				branchName: branches.get(user.branch_id) ?? "Unknown centre",
				status: user.status === "inactive" || user.status === "suspended" ? user.status : "active",
				lastActiveLabel: relativeActivity(lastSeen.get(user.id) ?? null),
			};
		}),
		roles: roles
			.filter((role) => role.key !== "student")
			.map((role) => ({ key: role.key, label: role.name, userCount: staff.filter((user) => user.role_id === role.id).length })),
		matrix: PERMISSIONS.map((permission) => ({
			permission,
			label: PERMISSION_LABEL[permission] ?? permission,
			byRole: Object.fromEntries(roles.map((role) => [role.key, parsePermissions(role.permissions)[permission] ?? null])),
		})),
	};
}

/** Screen 29 — RLS-scoped audit records. */
export async function getAuditLog(query?: { action?: string }): Promise<AuditLog> {
	const all = await auditEntries(500);
	const entries = query?.action && query.action !== "all" ? all.filter((entry) => entry.action === query.action) : all;
	const actions = [...new Set(all.map((entry) => entry.action))]
		.sort()
		.map((action) => ({ value: action, label: ACTION_LABEL[action] ?? action.replaceAll(".", " ") }));
	return { entries, total: entries.length, actions };
}

/**
 * Screen 25b — one batch, with the fields its edit form posts back.
 *
 * **One round trip.** This was three: the batch, then its branch/teachers/
 * members, then the members' names — each step waiting on ids from the last.
 * Supabase costs ~235 ms per *sequential* step and almost nothing for a wider
 * query, so the branch, teachers, memberships and student names are embedded.
 *
 * RLS decides visibility: an admin sees their own centre's batches, the Owner
 * sees every one. A batch outside that returns no row, which the page turns
 * into a 404 rather than "forbidden" — the two are indistinguishable to
 * someone guessing IDs, and that is the point.
 */
export async function getBatchDetail(batchId: string): Promise<BatchDetail | null> {
	const supabase = await createClient();

	const { data: batch, error } = await supabase
		.from("batches")
		.select(
			"id, name, starts_on, ends_on, status, branches ( name ), batch_teachers ( teacher_id ), batch_students ( left_at, users ( id, name ) )",
		)
		.eq("id", batchId)
		.is("batch_students.left_at", null)
		.maybeSingle();

	if (error) queryFailed("batch", error);
	if (!batch) return null;

	return {
		id: batch.id,
		name: batch.name,
		branchName: batch.branches?.name ?? "Unknown centre",
		startsOn: batch.starts_on,
		endsOn: batch.ends_on,
		status: batch.status === "completed" || batch.status === "archived" ? batch.status : "active",
		teacherIds: batch.batch_teachers.map((row) => row.teacher_id),
		students: batch.batch_students
			.flatMap((row) => (row.users ? [{ id: row.users.id, name: row.users.name }] : []))
			.sort((a, b) => a.name.localeCompare(b.name)),
	};
}

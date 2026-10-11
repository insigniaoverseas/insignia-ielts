import "server-only";

import { cache } from "react";

import { lockedAccounts } from "@/lib/auth/lockout";
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
import { daysUntil, displayPhone, formatShortDate, instituteToday, lockedUntilLabel, queryFailed, relativeActivity } from "./shared";

type Tables = Database["public"]["Tables"];
type User = Tables["users"]["Row"];
type Plan = Tables["student_plans"]["Row"];
type Attempt = Tables["attempts"]["Row"];

const ACTION_LABEL: Record<string, string> = {
	"auth.sign_in": "Signed in",
	"auth.sign_out": "Signed out",
	"auth.password_reset": "Password reset",
	"auth.password_change": "Password changed",
	"invitation.create": "Invitation sent",
	"invitation.revoke": "Invitation revoked",
	"invitation.resend": "Invitation resent",
	"privacy.accept": "Agreed to the privacy notice",
	"plan.extend": "Plan extended",
	"results.release": "Results released",
	"mark.override": "Mark changed",
	"test.publish": "Test published",
	"test.unpublish": "Test moved back to draft",
	"role.change": "Role changed",
	"session.revoke": "Session revoked",
	"user.suspend": "Staff member suspended",
	"user.reactivate": "Staff member reactivated",
	"test.key_edit": "Answer key changed",
	"auth.reset_sent": "Password reset link sent",
	"auth.unlock": "Sign-in unlocked",
	"auth.code_sent": "Sign-in code emailed",
	"user.phone_change": "Phone number changed",
	"attempt.extra_time": "Gave a student extra time",
	"attempt.force_submit": "Handed in a student's test",
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

/**
 * Every RLS-visible student with plan, batch, last band and activity.
 *
 * One round trip: the student role is matched inside the users query rather
 * than looked up first. Memoised, because Overview, Students and Plans all
 * read it and the admin layout builds them together.
 */
const allStudentRows = cache(async function allStudentRows(): Promise<{
	rows: StudentRow[];
	batchIdByStudent: Map<string, string>;
}> {
	const supabase = await createClient();

	const [usersResult, plansResult, membershipsResult, batchesResult, attemptsResult, scoresResult, sessionsResult] =
		await Promise.all([
			supabase.from("users").select("*, roles!inner(key)").eq("roles.key", "student").order("name"),
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
				email: user.email,
				phone: displayPhone(user.country_code, user.phone),
				batchId: batchId ?? null,
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
});

function jsonDetail(meta: Json): string {
	if (typeof meta !== "object" || meta === null || Array.isArray(meta)) return "";
	return Object.entries(meta)
		.map(([key, value]) => `${key.replaceAll("_", " ")}: ${typeof value === "string" ? value : JSON.stringify(value)}`)
		.join(" · ");
}

/**
 * Every user this admin can see, with their role's name — the names behind
 * audit rows and plan-history entries. Memoised: one read serves both.
 */
const visibleUsers = cache(async function visibleUsers() {
	const supabase = await createClient();
	const { data, error } = await supabase.from("users").select("id, name, roles ( name )");
	if (error) queryFailed("audit actors", error);
	return new Map((data ?? []).map((user) => [user.id, user]));
});

/** How many audit rows the log screen shows; Overview shows the newest few of the same read. */
const AUDIT_LIMIT = 500;

/**
 * The newest audit rows with who did them.
 *
 * One round trip: `audit_log.actor_id` has no foreign key (staff can be
 * erased, the trail cannot — M0-10), so names cannot be embedded; instead the
 * visible users and their role names are read *alongside* the log rather than
 * after it. Memoised for the request: Overview and the audit screen share it.
 */
const auditEntries = cache(async function auditEntries(): Promise<AuditEntry[]> {
	const supabase = await createClient();
	const [logsResult, actors] = await Promise.all([
		supabase.from("audit_log").select("*").order("at", { ascending: false }).limit(AUDIT_LIMIT),
		visibleUsers(),
	]);
	if (logsResult.error) queryFailed("audit log", logsResult.error);
	const logs = logsResult.data;

	return (logs ?? []).map((log) => {
		const actor = log.actor_id ? actors.get(log.actor_id) : null;
		return {
			id: log.id,
			whenLabel: formatDateTime(log.at),
			actorName: actor?.name ?? null,
			actorRole: actor?.roles?.name ?? null,
			action: log.action,
			actionLabel: ACTION_LABEL[log.action] ?? log.action.replaceAll(".", " "),
			target: `${log.entity}${log.entity_id ? ` · ${log.entity_id}` : ""}`,
			detail: jsonDetail(log.meta),
		};
	});
});

/** Screen 20 — live counts and recent audited activity. */
export async function getAdminOverview(): Promise<AdminOverview> {
	const supabase = await createClient();
	const [{ rows }, attemptsResult, recentActivity] = await Promise.all([
		allStudentRows(),
		supabase.from("attempts").select("status, started_at, expires_at"),
		auditEntries().then((all) => all.slice(0, 5)),
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

/**
 * Screen 21 — every visible student, unfiltered. The search and filters run in
 * the browser over this (`filterStudents` in `lib/staff-filters.ts`), so
 * changing one needs no round trip.
 */
export async function getStudentsList(): Promise<StudentsList> {
	const supabase = await createClient();
	const [{ rows }, batchesResult] = await Promise.all([
		allStudentRows(),
		supabase.from("batches").select("id, name").order("name"),
	]);
	if (batchesResult.error) queryFailed("student filters", batchesResult.error);
	return { rows, total: rows.length, batches: batchesResult.data ?? [] };
}

/**
 * Screen 23 — one RLS-visible student and their Supabase history.
 *
 * One round trip (was five, each waiting on ids from the last): plan history
 * is reached through its plan, and each attempt's test and score ride along
 * embedded.
 */
export async function getStudentDetail(id: string): Promise<StudentDetail | null> {
	const supabase = await createClient();
	const [{ rows }, historyResult, attemptsResult, logs, users] = await Promise.all([
		allStudentRows(),
		supabase.from("plan_history").select("*, student_plans!inner(student_id)").eq("student_plans.student_id", id).order("at"),
		supabase
			.from("attempts")
			.select("*, tests ( id, title, skill ), attempt_scores ( attempt_id, band, below_band )")
			.eq("student_id", id)
			.order("started_at", { ascending: false }),
		auditEntries(),
		visibleUsers(),
	]);
	const student = rows.find((row) => row.id === id);
	if (!student) return null;
	const locked = await lockedAccounts([student.email]);
	if (historyResult.error) queryFailed("plan history", historyResult.error);
	if (attemptsResult.error) queryFailed("student attempts", attemptsResult.error);
	const actors = new Map([...users].map(([userId, user]) => [userId, user.name]));
	const attemptRows = attemptsResult.data ?? [];
	const attempts: Attempt[] = attemptRows;
	const tests = new Map(attemptRows.flatMap((row) => (row.tests ? [[row.tests.id, row.tests] as const] : [])));
	const scores = new Map(attemptRows.flatMap((row) => (row.attempt_scores ? [[row.id, row.attempt_scores] as const] : [])));

	return {
		student,
		lockedUntilLabel: lockedUntilLabel(locked, student.email),
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
		today: instituteToday(),
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
		.select("id, title, skill, variant, difficulty, kind, total_questions, status, tags, updated_at")
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
			kind: (["mock", "class", "practice"].includes(test.kind) ? test.kind : "mock") as TestLibraryRow["kind"],
			questionCount: test.total_questions,
			status: test.status as TestLibraryRow["status"],
			tags: test.tags,
			updatedLabel: formatShortDate(test.updated_at),
		}];
	});
}

/** Screen 28 — staff and the permission matrix stored in `roles.permissions`. */
export async function getUsersAndRoles(): Promise<UsersAndRoles> {
	const supabase = await createClient();
	const [rolesResult, usersResult, branchesResult, sessionsResult, invitesResult] = await Promise.all([
		supabase.from("roles").select("id, key, name, permissions").order("created_at"),
		supabase.from("users").select("id, name, email, role_id, branch_id, status").order("name"),
		supabase.from("branches").select("id, name"),
		supabase.from("user_sessions").select("user_id, last_seen_at"),
		supabase.from("invitations").select("id, email, name, role_id, expires_at, created_at").eq("status", "pending").order("created_at", { ascending: false }),
	]);
	if (rolesResult.error) queryFailed("roles", rolesResult.error);
	if (invitesResult.error) queryFailed("staff invitations", invitesResult.error);
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
		pendingInvites: (invitesResult.data ?? [])
			.filter((invite) => {
				const key = roleById.get(invite.role_id)?.key;
				return key !== undefined && key !== "student";
			})
			.map((invite) => ({
				id: invite.id,
				name: invite.name ?? invite.email,
				email: invite.email,
				roleKey: roleById.get(invite.role_id)?.key ?? "unknown",
				roleLabel: roleById.get(invite.role_id)?.name ?? "Unknown",
				sentLabel: relativeActivity(invite.created_at),
				expired: new Date(invite.expires_at) <= new Date(),
			})),
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

/** Screen 29 — the newest RLS-scoped audit rows, unfiltered; the action filter runs in the browser. */
export async function getAuditLog(): Promise<AuditLog> {
	const all = await auditEntries();
	const actions = [...new Set(all.map((entry) => entry.action))]
		.sort()
		.map((action) => ({ value: action, label: ACTION_LABEL[action] ?? action.replaceAll(".", " ") }));
	return { entries: all, total: all.length, actions };
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

	const targets = await supabase
		.from("assignment_targets")
		.select("assignment_id", { count: "exact", head: true })
		.eq("batch_id", batchId);
	if (targets.error) queryFailed("batch assignments", targets.error);

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
		assignedTestCount: targets.count ?? 0,
	};
}

import "server-only";

import { recordAudit } from "@/lib/audit";
import { validateAssignment, type AssignField, type AssignInput } from "@/lib/assignment-input";
import type { Actor, Scope } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Creating an assignment (M6-03, screen 16).
 *
 * `assignments` and `assignment_targets` are `select`-only to API roles, so the
 * write runs through the secret key — but only after `requirePermission`, and
 * only for batches and students this actor could reach anyway:
 *
 * - `batch` scope (a teacher): batches they teach, and students currently in one.
 * - `branch` scope (an admin): batches and students at their own centre.
 * - `all` (the Owner): anywhere, but one assignment stays in one centre.
 *
 * RLS remains the gate on everyone reading it afterwards — `assigned_to_me`
 * is what lets a student see it.
 */

export type { AssignInput } from "@/lib/assignment-input";

export type AssignOutcome =
	| { ok: true; id: string; message: string }
	| { ok: false; message: string; field?: AssignField };

const TRY_AGAIN = "Something went wrong. Nothing was assigned. Try again.";

/**
 * Validates and stores one assignment with its targets, then audits it.
 *
 * Results reach students as the teacher chose: straight away, at a set time,
 * or when they press Release on screen 18 (`releaseResults`).
 *
 * @param actor From `requirePermission("assignment:manage")`.
 * @param scope That permission's scope.
 */
export async function createAssignment(actor: Actor, scope: Scope, input: AssignInput): Promise<AssignOutcome> {
	const checked = validateAssignment(input, new Date());
	if (!checked.ok) return checked;

	const db = createAdminClient();

	const { data: test, error: testError } = await db
		.from("tests")
		.select("id, title, status, skill")
		.eq("id", checked.testId)
		.maybeSingle();
	if (testError) {
		console.error("assign test lookup failed:", testError.message);
		return { ok: false, message: TRY_AGAIN };
	}
	if (!test || test.status !== "published" || (test.skill !== "listening" && test.skill !== "reading")) {
		return { ok: false, message: "That test isn't available to assign. Pick another.", field: "test" };
	}

	const branches = new Set<string>();

	// ── Batches ──
	if (checked.batchIds.length > 0) {
		const { data: batches, error } = await db
			.from("batches")
			.select("id, branch_id, status")
			.in("id", checked.batchIds);
		if (error) {
			console.error("assign batch lookup failed:", error.message);
			return { ok: false, message: TRY_AGAIN };
		}
		const usable = (batches ?? []).filter(
			(batch) => batch.status === "active" && (scope !== "branch" || batch.branch_id === actor.branchId),
		);
		if (usable.length !== checked.batchIds.length) {
			return { ok: false, message: "One of those batches can't be given a test. Reload the page.", field: "who" };
		}
		if (scope === "batch") {
			const taught = await taughtBatchIds(db, actor.id);
			if (taught === null) return { ok: false, message: TRY_AGAIN };
			if (!checked.batchIds.every((id) => taught.has(id))) {
				return { ok: false, message: "You can only assign to batches you teach.", field: "who" };
			}
		}
		for (const batch of usable) branches.add(batch.branch_id);
	}

	// ── Individual students ──
	if (checked.studentIds.length > 0) {
		const { data: people, error } = await db
			.from("users")
			.select("id, branch_id, status, roles ( key )")
			.in("id", checked.studentIds);
		if (error) {
			console.error("assign student lookup failed:", error.message);
			return { ok: false, message: TRY_AGAIN };
		}
		const usable = (people ?? []).filter(
			(person) =>
				person.status === "active" &&
				person.roles?.key === "student" &&
				(scope !== "branch" || person.branch_id === actor.branchId),
		);
		if (usable.length !== checked.studentIds.length) {
			return { ok: false, message: "Pick active students at your centre.", field: "who" };
		}
		if (scope === "batch") {
			const taught = await taughtBatchIds(db, actor.id);
			if (taught === null) return { ok: false, message: TRY_AGAIN };
			const { data: rows, error: rowsError } = await db
				.from("batch_students")
				.select("batch_id, student_id")
				.in("student_id", checked.studentIds)
				.is("left_at", null);
			if (rowsError) {
				console.error("assign membership lookup failed:", rowsError.message);
				return { ok: false, message: TRY_AGAIN };
			}
			const reachable = new Set((rows ?? []).filter((row) => taught.has(row.batch_id)).map((row) => row.student_id));
			if (!checked.studentIds.every((id) => reachable.has(id))) {
				return { ok: false, message: "You can only assign to students in batches you teach.", field: "who" };
			}
		}
		for (const person of usable) if (person.branch_id) branches.add(person.branch_id);
	}

	if (branches.size !== 1) {
		return { ok: false, message: "Pick students from one centre at a time.", field: "who" };
	}
	const [branchId] = branches;

	const { data: created, error: insertError } = await db
		.from("assignments")
		.insert({
			test_id: test.id,
			branch_id: branchId,
			...(checked.availableFrom ? { available_from: checked.availableFrom } : {}),
			due_by: checked.dueBy,
			max_attempts: checked.maxAttempts,
			allow_review: checked.allowReview,
			results_release: checked.resultsRelease,
			results_released_at: checked.resultsReleasedAt,
			created_by: actor.id,
		})
		.select("id")
		.single();
	if (insertError || !created) {
		console.error("assignment insert failed:", insertError?.message);
		return { ok: false, message: TRY_AGAIN };
	}

	const targets = [
		...checked.batchIds.map((batchId) => ({ assignment_id: created.id, batch_id: batchId })),
		...checked.studentIds.map((studentId) => ({ assignment_id: created.id, student_id: studentId })),
	];
	const { error: targetError } = await db.from("assignment_targets").insert(targets);
	if (targetError) {
		console.error("assignment targets insert failed:", targetError.message);
		// An assignment with no targets reaches nobody but still shows to staff; take it back.
		await db.from("assignments").delete().eq("id", created.id);
		return { ok: false, message: TRY_AGAIN };
	}

	await recordAudit({
		actorId: actor.id,
		branchId,
		action: "assignment.create",
		entity: "assignment",
		entityId: created.id,
		meta: {
			test_id: test.id,
			title: test.title,
			batches: checked.batchIds.length,
			students: checked.studentIds.length,
			due_by: checked.dueBy,
			max_attempts: checked.maxAttempts,
		},
	});

	return { ok: true, id: created.id, message: `${test.title} was assigned.` };
}

/** The batches a teacher teaches, or `null` when the lookup failed. */
async function taughtBatchIds(db: ReturnType<typeof createAdminClient>, teacherId: string): Promise<Set<string> | null> {
	const { data, error } = await db.from("batch_teachers").select("batch_id").eq("teacher_id", teacherId);
	if (error) {
		console.error("taught batch lookup failed:", error.message);
		return null;
	}
	return new Set((data ?? []).map((row) => row.batch_id));
}

export type ReleaseOutcome = { ok: true; message: string } | { ok: false; message: string };

/**
 * Releases an assignment's results to its students now (M6-05, screen 18).
 *
 * Release is **per assignment** — the database's release gate is
 * `assignments.results_released_at`, read by the RLS on `attempt_scores` and
 * `answer_marks` — so one press lets every student on it see their band.
 *
 * Scope: the assignment is read through the actor's **own RLS client** first.
 * A teacher outside its batches gets no row, so cannot release it. The write
 * then goes through the secret key (`assignments` is select-only to API
 * roles) and is audited.
 *
 * A `scheduled` release can be brought forward; it is never pushed back.
 *
 * @param actor From `requirePermission("results:release")`.
 */
export async function releaseResults(actor: Actor, assignmentId: string): Promise<ReleaseOutcome> {
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(assignmentId)) {
		return { ok: false, message: "That test couldn't be found." };
	}
	const { data: assignment, error } = await (await createClient())
		.from("assignments")
		.select("id, branch_id, results_release, results_released_at")
		.eq("id", assignmentId)
		.maybeSingle();
	if (error) throw error;
	if (!assignment) return { ok: false, message: "That test couldn't be found." };

	const now = new Date();
	const alreadyOut =
		assignment.results_release === "immediate" ||
		(assignment.results_released_at !== null && new Date(assignment.results_released_at) <= now);
	if (alreadyOut) return { ok: false, message: "These results are already out." };

	const { error: updateError } = await createAdminClient()
		.from("assignments")
		.update({ results_released_at: now.toISOString(), released_by: actor.id })
		.eq("id", assignment.id);
	if (updateError) {
		console.error("release results failed:", updateError.message);
		return { ok: false, message: "Something went wrong. Nothing was released. Try again." };
	}

	await recordAudit({
		actorId: actor.id,
		branchId: assignment.branch_id,
		action: "results.release",
		entity: "assignment",
		entityId: assignment.id,
		meta: { was: assignment.results_release, scheduled_for: assignment.results_released_at },
	});
	return { ok: true, message: "Results released. Students can see their band now." };
}

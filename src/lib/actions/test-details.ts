"use server";

import { revalidatePath } from "next/cache";

import { recordAudit } from "@/lib/audit";
import { ForbiddenError, requirePermission } from "@/lib/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import {
	MAX_DETAILS_CHANGE,
	detailsResultMessage,
	drillsKept,
	parseDetailsChange,
	planDetailsChange,
	type DetailsRow,
} from "@/lib/test-details";
import type { FormState } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Changes the **type** (mock, class, practice) and/or **difficulty** of one or
 * more tests, from the Test library (M10-17).
 *
 * The same permission as publishing: deciding which pool a paper sits in —
 * above all making it Practice, which every student can open at home — is the
 * publisher's call. Each test is updated only if it still holds the values the
 * plan was made from, so two people changing it at once can't cross over; each
 * change is audited with its before and after. Results already taken keep
 * their type (`attempts.kind` is a copy made at start).
 *
 * @param testIds - The tests to change (at most {@link MAX_DETAILS_CHANGE}).
 * @param input - `kind` and/or `difficulty`; an empty value means "leave as is".
 */
export async function changeTestDetailsAction(
	testIds: string[],
	input: { kind?: string; difficulty?: string },
): Promise<FormState> {
	try {
		const { actor } = await requirePermission("test:publish");

		const ids = [...new Set(Array.isArray(testIds) ? testIds : [])].filter((id) => typeof id === "string" && UUID.test(id));
		if (ids.length === 0) return { ok: false, message: "Pick at least one test." };
		if (ids.length > MAX_DETAILS_CHANGE) return { ok: false, message: `Change at most ${MAX_DETAILS_CHANGE} tests at a time.` };

		const change = parseDetailsChange(input ?? {});
		if (typeof change === "string") return { ok: false, message: change };

		const admin = createAdminClient();
		const [testsResult, assignmentsResult] = await Promise.all([
			admin.from("tests").select("id, title, kind, difficulty, status, practice_question_type").in("id", ids),
			admin.from("assignments").select("test_id").in("test_id", ids),
		]);
		if (testsResult.error) throw testsResult.error;
		if (assignmentsResult.error) throw assignmentsResult.error;
		if ((testsResult.data ?? []).length !== ids.length) return { ok: false, message: "One of those tests couldn't be found. Reload the page." };

		const assigned = new Set((assignmentsResult.data ?? []).map((row) => row.test_id));
		const rows: DetailsRow[] = (testsResult.data ?? []).map(({ practice_question_type, ...row }) => ({
			...row,
			assigned: assigned.has(row.id),
			drill: practice_question_type,
		}));
		const updates = planDetailsChange(rows, change);
		// Question-type practice sets keep their type; only their difficulty can change.
		const kept = drillsKept(rows, change);

		let changed = 0;
		for (const update of updates) {
			const { data, error } = await admin
				.from("tests")
				.update(update.set)
				.eq("id", update.id)
				.eq("kind", update.from.kind)
				.eq("difficulty", update.from.difficulty)
				.select("id");
			if (error) throw error;
			if (!data?.length) continue; // Someone else changed it first; theirs stands.
			changed += 1;
			await recordAudit({
				actorId: actor.id,
				branchId: actor.branchId,
				action: "test.details",
				entity: "test",
				entityId: update.id,
				meta: {
					title: update.title,
					from: update.from,
					to: { kind: update.set.kind ?? update.from.kind, difficulty: update.set.difficulty ?? update.from.difficulty },
					assigned: assigned.has(update.id),
				},
			});
		}

		revalidatePath("/admin/library");
		for (const id of ids) revalidatePath(`/admin/library/${id}/answer-key`);
		revalidatePath("/teacher/assign");
		revalidatePath("/practice");

		if (changed < updates.length) {
			return { ok: false, message: `${detailsResultMessage(updates.slice(0, changed), change, ids.length, kept)} Some tests changed while you were looking — reload the page and check them.` };
		}
		return { ok: true, message: detailsResultMessage(updates, change, ids.length, kept) };
	} catch (error) {
		if (error instanceof ForbiddenError) return { ok: false, message: "You don't have permission to change tests." };
		console.error("change test details failed:", error);
		return { ok: false, message: "Something went wrong. Reload the page to see which tests changed." };
	}
}

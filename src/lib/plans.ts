import "server-only";

import { recordAudit } from "@/lib/audit";
import type { Actor } from "@/lib/permissions";
import { extendedExpiry, type ExtensionRequest } from "@/lib/plan-extension";
import { instituteToday } from "@/lib/queries/shared";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Extending students' plans (screen 24, M5-06).
 *
 * **Scope** comes from the actor's own RLS client: the plans are read through
 * it first, so an admin only ever sees — and therefore only extends — plans
 * at their own centre. A student whose plan the actor cannot see is refused
 * outright rather than silently skipped, so a stale page cannot extend half a
 * selection without saying so.
 *
 * The current plan is the one with the latest end date, the same rule the
 * students list and the workqueue use. Writes go through the secret key
 * (`student_plans` and `plan_history` are select-only to API roles); each
 * extension adds a `plan_history` row with the reason and an audit row.
 */

export type ExtensionOutcome = { ok: true; message: string } | { ok: false; message: string };

type PlanRow = { id: string; student_id: string; expires_on: string; status: string };

/**
 * @param actor From `requirePermission("student:manage")`.
 * @param request Already checked by `validateExtension`.
 */
export async function extendPlans(actor: Actor, request: Extract<ExtensionRequest, { ok: true }>): Promise<ExtensionOutcome> {
	const { data, error } = await (await createClient())
		.from("student_plans")
		.select("id, student_id, expires_on, status")
		.in("student_id", request.studentIds);
	if (error) throw error;
	const plans = (data ?? []) as PlanRow[];

	const current = new Map<string, PlanRow>();
	for (const plan of plans) {
		const seen = current.get(plan.student_id);
		if (!seen || plan.expires_on > seen.expires_on) current.set(plan.student_id, plan);
	}
	const missing = request.studentIds.filter((id) => !current.has(id));
	if (missing.length > 0) {
		return {
			ok: false,
			message:
				missing.length === 1
					? "One of those students has no plan to extend. Set one up from their page first."
					: `${missing.length} of those students have no plan to extend. Set them up first.`,
		};
	}

	const today = instituteToday();
	const admin = createAdminClient();
	let extended = 0;
	for (const studentId of request.studentIds) {
		const plan = current.get(studentId)!;
		const newExpiry = extendedExpiry(plan.expires_on, today, request.months);
		// A lapsed plan comes back to life; a paused one stays paused — pausing
		// is a separate decision, and extending must not quietly undo it.
		const status = plan.status === "expired" ? "active" : plan.status;

		const { error: updateError } = await admin
			.from("student_plans")
			.update({ expires_on: newExpiry, status })
			.eq("id", plan.id)
			.eq("expires_on", plan.expires_on);
		if (updateError) {
			console.error(`extend plan ${plan.id} failed:`, updateError.message);
			continue;
		}
		await admin.from("plan_history").insert({
			plan_id: plan.id,
			action: "extend",
			old_expiry: plan.expires_on,
			new_expiry: newExpiry,
			reason: request.reason,
			actor_id: actor.id,
		});
		await recordAudit({
			actorId: actor.id,
			branchId: actor.branchId,
			action: "plan.extend",
			entity: "student_plan",
			entityId: plan.id,
			meta: { student_id: studentId, old_expiry: plan.expires_on, new_expiry: newExpiry, months: request.months, reason: request.reason },
		});
		extended += 1;
	}

	if (extended === 0) return { ok: false, message: "Something went wrong. No plans were extended. Try again." };
	const failed = request.studentIds.length - extended;
	return {
		ok: true,
		message:
			`Extended ${extended} ${extended === 1 ? "plan" : "plans"} by ${request.months} ${request.months === 1 ? "month" : "months"}.` +
			(failed > 0 ? ` ${failed} could not be changed — try those again.` : ""),
	};
}

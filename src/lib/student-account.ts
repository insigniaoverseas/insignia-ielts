import "server-only";

import { recordAudit } from "@/lib/audit";
import { requestPasswordReset } from "@/lib/auth/password-reset";
import type { Actor } from "@/lib/permissions";
import { normaliseIndianMobile } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * The account actions on a student's page (screen 23, M5-05).
 *
 * **Scope** comes from the actor's own RLS client: the student is read
 * through it first, so an admin can only act on students at their centre.
 * Profile writes go through the secret key — `users` is read-only to API
 * roles — and are audited.
 *
 * There is still no way for staff to *set* a password. Getting a locked-out
 * student back in means sending them the same reset link they could request
 * themselves; they choose the new password.
 */

type Outcome = { ok: true; message: string } | { ok: false; message: string };

async function studentInScope(studentId: string) {
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(studentId)) return null;
	const { data, error } = await (await createClient())
		.from("users")
		.select("id, name, email, phone, branch_id, status, roles ( key )")
		.eq("id", studentId)
		.maybeSingle();
	if (error) throw error;
	return data && data.roles?.key === "student" ? data : null;
}

/** Changes a student's phone number. Stored as ten digits plus `+91`, like invitations. */
export async function changeStudentPhone(actor: Actor, studentId: string, input: string): Promise<Outcome> {
	const student = await studentInScope(studentId);
	if (!student) return { ok: false, message: "That student couldn't be found." };
	const phone = normaliseIndianMobile(input);
	if (!phone) return { ok: false, message: "That isn't a 10-digit Indian mobile number." };
	if (phone === student.phone) return { ok: false, message: "That's already their number." };

	const { error } = await createAdminClient().from("users").update({ phone, country_code: "+91" }).eq("id", student.id);
	if (error) {
		console.error("change phone failed:", error.message);
		return { ok: false, message: "Something went wrong. The number wasn't changed." };
	}
	await recordAudit({
		actorId: actor.id,
		branchId: student.branch_id,
		action: "user.phone_change",
		entity: "user",
		entityId: student.id,
		meta: { from: student.phone, to: phone },
	});
	return { ok: true, message: `Phone number changed to +91 ${phone.slice(0, 5)} ${phone.slice(5)}.` };
}

/**
 * Emails the student a password reset link — the same one `/forgot` sends,
 * with the same rate limits. A suspended or inactive account gets nothing,
 * as with `/forgot`; the message says so here, because staff need to know.
 */
export async function sendStudentPasswordReset(actor: Actor, studentId: string): Promise<Outcome> {
	const student = await studentInScope(studentId);
	if (!student) return { ok: false, message: "That student couldn't be found." };
	if (student.status !== "active") return { ok: false, message: "Their account isn't active, so no link was sent." };

	await requestPasswordReset(student.email);
	await recordAudit({
		actorId: actor.id,
		branchId: student.branch_id,
		action: "auth.reset_sent",
		entity: "user",
		entityId: student.id,
		meta: { by_staff: true },
	});
	return { ok: true, message: `A link to choose a new password is on its way to ${student.email}. It works for an hour.` };
}

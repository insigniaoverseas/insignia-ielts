import "server-only";

import { recordAudit } from "@/lib/audit";
import { clearSignInFailures, lockedAccounts } from "@/lib/auth/lockout";
import { requestPasswordReset } from "@/lib/auth/password-reset";
import { CODE_TTL_MINUTES } from "@/lib/auth/sign-in-code-rules";
import { emailRequestProblem } from "@/lib/auth/sign-in-messages";
import { requestSignInCode } from "@/lib/auth/sign-in-code";
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
 * There is still no way for staff to *set* a password. A student locked out
 * by wrong guesses who still knows it is let straight back in with
 * {@link unlockStudentSignIn}; one who has forgotten it gets the same reset
 * link they could request themselves, and chooses the new password.
 *
 * Teachers reach {@link unlockStudentSignIn} too, for their own students — RLS
 * only lets them read those — because the login screen tells a locked-out
 * student to ask their teacher.
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

	const outcome = await requestPasswordReset(student.email);
	if (outcome !== "sent") return { ok: false, message: emailRequestProblem(outcome) ?? "The email couldn't be sent." };
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

/**
 * Lifts a student's sign-in lock now, instead of in up to fifteen minutes.
 *
 * Clears the per-account counter only. The per-IP counter is left alone: a
 * lab's machine working through other people's accounts is not this student's
 * problem to clear, and not one teacher's to forgive. Audited either way, and
 * an account that wasn't locked says so — so the teacher knows to look for a
 * forgotten password instead.
 */
export async function unlockStudentSignIn(actor: Actor, studentId: string): Promise<Outcome> {
	const student = await studentInScope(studentId);
	if (!student) return { ok: false, message: "That student couldn't be found." };

	const firstName = student.name.split(" ")[0] || student.name;
	const wasLocked = (await lockedAccounts([student.email])).size > 0;
	await clearSignInFailures(student.email);
	await recordAudit({
		actorId: actor.id,
		branchId: student.branch_id,
		action: "auth.unlock",
		entity: "user",
		entityId: student.id,
		meta: { was_locked: wasLocked },
	});

	return wasLocked
		? { ok: true, message: `Unlocked. ${firstName} can sign in again now.` }
		: {
				ok: true,
				message: `${firstName} wasn't locked out. If they've forgotten their password, they can tap "Forgotten your password?" on the sign-in page.`,
			};
}

/**
 * Emails the student a six-digit sign-in code (M10-10) — the same one they
 * could ask for under "Sign in without a password", with the same limits.
 * Unlike the student's own screen, staff are told what happened, so they know
 * whether to tell the student to check their phone.
 */
export async function sendStudentSignInCode(actor: Actor, studentId: string): Promise<Outcome> {
	const student = await studentInScope(studentId);
	if (!student) return { ok: false, message: "That student couldn't be found." };
	if (student.status !== "active") return { ok: false, message: "Their account isn't active, so no code was sent." };

	const firstName = student.name.split(" ")[0] || student.name;
	switch (await requestSignInCode(student.email, actor.id)) {
		case "sent":
			return {
				ok: true,
				message: `A sign-in code is on its way to ${student.email}. It works for ${CODE_TTL_MINUTES} minutes. ${firstName} taps "Sign in without a password" and types it in.`,
			};
		case "too_many":
			return { ok: false, message: "Three codes were already sent in the last 15 minutes. Ask them to use the newest one, or try again shortly." };
		case "no_account":
		case "switched_off":
			return { ok: false, message: "Their account isn't active, so no code was sent." };
		default:
			return { ok: false, message: "The email couldn't be sent. Please try again." };
	}
}

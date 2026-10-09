"use server";

import { redirect } from "next/navigation";

import { rowsForValue } from "@/lib/attempts/answers";
import { finishAttempt } from "@/lib/attempts/finish";
import { isOverdue, secondsLeft } from "@/lib/attempts/clock";
import { getOwnedAttempt } from "@/lib/attempts/load";
import { sessionState } from "@/lib/auth/sessions";
import { getPreTestBriefing } from "@/lib/queries/student";
import { ForbiddenError, requirePermission } from "@/lib/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { AttemptSaveResult, SaveAnswerInput, StartAttemptState } from "./types";

/**
 * The attempt lifecycle's Server Actions (M2-07): start or resume, autosave,
 * and submit. Every one re-checks `attempt:take`, that the session is still
 * live (a student signed in elsewhere is stopped here, not just on the next
 * page load), and that the attempt is the caller's own.
 *
 * Answers are written with the **student's RLS client**, so the database
 * itself refuses a write into someone else's attempt, after submit, or after
 * `expires_at`. Only the state changes the API deliberately withholds from
 * students — creating the attempt row and closing it — use the secret-key
 * client, after those checks.
 */

/** The session cookie no longer names a live session: signed in elsewhere, or revoked. */
class SessionEndedError extends Error {}

async function liveActor() {
	const { actor } = await requirePermission("attempt:take");
	if ((await sessionState(actor.id)) !== "live") throw new SessionEndedError("session_ended");
	return actor;
}

/**
 * Starts the test behind a briefing reference (an assignment id, or
 * `practice:{testId}`), or resumes the open attempt on it, then opens it.
 * Eligibility — plan, window, attempts left — is `getPreTestBriefing`'s, the
 * same rules the student saw on the card, so they cannot disagree.
 */
export async function startAttemptAction(_previous: StartAttemptState, formData: FormData): Promise<StartAttemptState> {
	const ref = String(formData.get("ref") ?? "");
	let attemptId: string;
	try {
		const actor = await liveActor();
		const briefing = await getPreTestBriefing(ref);
		if (!briefing) return { message: "This test isn't available to you." };
		const { assignment } = briefing;

		if (assignment.resumeAttemptId) {
			attemptId = assignment.resumeAttemptId;
			// Its time ran out while nobody had it open: close it, show the result.
			const open = await getOwnedAttempt(attemptId, actor.id);
			if (open && isOverdue(open)) await finishAttempt(open, "expired");
		} else {
			if (assignment.locked) return { message: assignment.locked.message };
			const practice = ref.startsWith("practice:");
			const admin = createAdminClient();
			// kind, content_version, started_at and expires_at are overwritten by
			// the attempts_before_insert trigger from the test itself.
			const { data, error } = await admin
				.from("attempts")
				.insert({
					test_id: assignment.test.id,
					assignment_id: practice ? null : assignment.assignmentId,
					student_id: actor.id,
					kind: assignment.mode,
					content_version: 1,
					expires_at: new Date(Date.now() + 60_000).toISOString(),
				})
				.select("id")
				.single();
			if (error) {
				// A double tap: the unique index allows one open attempt per test.
				if (error.code === "23505") {
					const { data: open } = await (await createClient())
						.from("attempts")
						.select("id")
						.eq("student_id", actor.id)
						.eq("test_id", assignment.test.id)
						.eq("status", "in_progress")
						.maybeSingle();
					if (!open) throw error;
					attemptId = open.id;
				} else {
					throw error;
				}
			} else {
				attemptId = data.id;
				await admin.from("attempt_events").insert({ attempt_id: attemptId, type: "start", meta: {} });
			}
		}
	} catch (error) {
		if (error instanceof SessionEndedError) redirect("/login?ended=1");
		if (error instanceof ForbiddenError) {
			return { message: "You can't start tests from this account." };
		}
		console.error("start attempt failed:", error);
		return { message: "Something went wrong starting your test. Please try again." };
	}
	redirect(`/attempt/${attemptId}`);
}

const validNumber = (n: unknown, max: number): n is number => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= max;

/**
 * Autosave. Writes the rows for one control (or one flag) through the
 * student's own RLS client. A stale revision — a save that arrived after a
 * newer one — is reported as fine: the newer value already won.
 */
export async function saveAnswerAction(input: SaveAnswerInput): Promise<AttemptSaveResult> {
	try {
		const actor = await liveActor();
		if (!validNumber(input.sectionNo, 10) || !validNumber(input.number, 200) || !validNumber(input.revision, 2_000_000_000)) {
			return { ok: false, reason: "invalid" };
		}
		const covers = input.covers ?? [input.number];
		if (covers.length < 1 || covers.length > 10 || covers.some((n) => !validNumber(n, 200)) || covers[0] !== input.number) {
			return { ok: false, reason: "invalid" };
		}

		const attempt = await getOwnedAttempt(input.attemptId, actor.id);
		if (!attempt) return { ok: false, reason: "invalid" };
		if (attempt.status !== "in_progress") return { ok: false, reason: "closed" };
		if (isOverdue(attempt)) return { ok: false, reason: "time_up" };

		const control = { id: "", number: input.number, covers, sectionNo: input.sectionNo };
		const writes: { q_number: number; section_no: number; given_answer?: string | null; flagged?: boolean }[] =
			input.value !== undefined ? rowsForValue(control, input.value) : [];
		if (input.flag && validNumber(input.flag.qNumber, 200)) {
			const existing = writes.find((w) => w.q_number === input.flag!.qNumber);
			if (existing) existing.flagged = input.flag.flagged;
			else writes.push({ q_number: input.flag.qNumber, section_no: input.sectionNo, flagged: input.flag.flagged });
		}

		const supabase = await createClient();
		for (const write of writes) {
			const changes = {
				...(write.given_answer !== undefined ? { given_answer: write.given_answer } : {}),
				...(write.flagged !== undefined ? { flagged: write.flagged } : {}),
				revision: input.revision,
			};
			const updated = await supabase
				.from("answers")
				.update(changes)
				.eq("attempt_id", attempt.id)
				.eq("q_number", write.q_number)
				.select("q_number");
			if (updated.error) {
				// 40001 is the trigger's stale-revision refusal: a newer save won.
				if (updated.error.code === "40001") continue;
				return failure(updated.error);
			}
			if (updated.data.length > 0) continue;
			const inserted = await supabase.from("answers").insert({
				attempt_id: attempt.id,
				q_number: write.q_number,
				section_no: write.section_no,
				given_answer: write.given_answer ?? null,
				flagged: write.flagged ?? false,
				revision: input.revision,
			});
			if (inserted.error?.code === "23505") {
				// Another save created the row first: apply this one over it.
				const retried = await supabase.from("answers").update(changes).eq("attempt_id", attempt.id).eq("q_number", write.q_number);
				if (retried.error && retried.error.code !== "40001") return failure(retried.error);
			} else if (inserted.error) {
				return failure(inserted.error);
			}
		}
		return { ok: true, secondsRemaining: secondsLeft(attempt) };
	} catch (error) {
		if (error instanceof SessionEndedError) return { ok: false, reason: "session_ended" };
		if (error instanceof ForbiddenError) return { ok: false, reason: "invalid" };
		console.error("save answer failed:", error);
		return { ok: false, reason: "error" };
	}
}

/**
 * The 30-second check (M2-08): the server's seconds left, so the countdown is
 * corrected rather than trusted; whether the session is still live; and —
 * if the deadline has passed — the attempt is closed here, on the server
 * clock, whatever the browser shows.
 */
export async function heartbeatAction(attemptId: string): Promise<AttemptSaveResult> {
	try {
		const actor = await liveActor();
		const attempt = await getOwnedAttempt(attemptId, actor.id);
		if (!attempt) return { ok: false, reason: "invalid" };
		if (attempt.status !== "in_progress") return { ok: false, reason: "closed" };
		if (isOverdue(attempt)) {
			await finishAttempt(attempt, "expired");
			return { ok: false, reason: "time_up" };
		}
		return { ok: true, secondsRemaining: secondsLeft(attempt) };
	} catch (error) {
		if (error instanceof SessionEndedError) return { ok: false, reason: "session_ended" };
		if (error instanceof ForbiddenError) return { ok: false, reason: "invalid" };
		console.error("heartbeat failed:", error);
		return { ok: false, reason: "error" };
	}
}

/** Maps a database refusal to what the player should do about it. */
function failure(error: { code?: string; message: string }): AttemptSaveResult {
	// 42501: the trigger's "time is up" / "attempt is submitted", or RLS.
	if (error.code === "42501") return { ok: false, reason: /time is up/i.test(error.message) ? "time_up" : "closed" };
	console.error("answer write refused:", error.message);
	return { ok: false, reason: "error" };
}

/**
 * Submits the attempt and sends the student to their result. If the server
 * clock has already passed `expires_at` the attempt is closed as `expired`
 * instead — whatever the browser believed. Either way it is marked.
 */
export async function submitAttemptAction(attemptId: string): Promise<{ ok: false; message: string } | never> {
	try {
		const actor = await liveActor();
		const attempt = await getOwnedAttempt(attemptId, actor.id);
		if (!attempt) return { ok: false, message: "This test could not be found." };
		await finishAttempt(attempt, isOverdue(attempt) ? "expired" : "submitted");
	} catch (error) {
		if (error instanceof SessionEndedError) redirect("/login?ended=1");
		if (error instanceof ForbiddenError) {
			return { ok: false, message: "You can't submit from this account." };
		}
		console.error("submit attempt failed:", error);
		return { ok: false, message: "Your answers are saved, but we couldn't finish the test. Try again." };
	}
	redirect(`/results/${attemptId}`);
}

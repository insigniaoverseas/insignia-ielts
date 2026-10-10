import "server-only";

import { recordAudit } from "@/lib/audit";
import { applyKeyEdits, type KeyEdit } from "@/lib/key-edits";
import { rescoreAttempts } from "@/lib/attempts/rescore";
import type { Actor, Scope } from "@/lib/permissions";
import { readAnswerKeyObject, writeAnswerKeyObject } from "@/lib/r2";
import { answerKeyObjectKey } from "@/lib/r2-keys";
import { getPreviewRow } from "@/lib/queries/test-preview";
import { selectAll } from "@/lib/queries/shared";
import { answerKeySchema } from "@/lib/scoring";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Saving the answer key editor (M5-09, screen 27).
 *
 * Only a control's **answers and accepted spellings** can change here — not
 * marks, word limits or the questions, which are the test's structure and
 * need a re-import (a new content version). The edited key must still pass
 * `answerKeySchema`, the same check the importer applies.
 *
 * Then every **finished** attempt on this version is re-marked against the
 * corrected key (the user's choice, 2026-10-10), keeping any mark a teacher
 * gave by hand. Attempts still in progress need nothing: they are marked from
 * `key.json` when they finish, which is now the corrected one.
 */

export type { KeyEdit } from "@/lib/key-edits";

export type KeyEditOutcome = { ok: true; message: string } | { ok: false; message: string };

/**
 * Applies the editor's changes to a test's `key.json` in place, then re-marks
 * every finished attempt on that content version (teacher-given marks kept).
 *
 * Assumes the caller already holds `test:author` (`scope` is that permission's
 * scope); an `own`-scoped author may change only tests they created. Audited
 * as `test.key_edit` with each change.
 *
 * @returns A sentence for the editor — what was saved and how many finished
 *   tests were re-marked — or why nothing was saved. Throws only on an
 *   unexpected database or storage error.
 */
export async function updateAnswerKey(
	actor: Actor,
	scope: Scope,
	testId: string,
	edits: readonly KeyEdit[],
): Promise<KeyEditOutcome> {
	if (edits.length === 0) return { ok: false, message: "Nothing has changed." };
	if (edits.length > 200) return { ok: false, message: "That's more questions than a test has. Reload the page." };

	// RLS: only a test this author can see.
	const row = await getPreviewRow(testId);
	if (!row) return { ok: false, message: "That test couldn't be found." };
	// `test:author` at "own" scope (a teacher) covers only tests they created —
	// RLS still lets them *read* every published test, so check it here.
	if (scope === "own") {
		const { data: owner, error: ownerError } = await createAdminClient().from("tests").select("created_by").eq("id", row.id).single();
		if (ownerError) throw ownerError;
		if (owner.created_by !== actor.id) return { ok: false, message: "You can only change answer keys for tests you created." };
	}
	const objectKey = answerKeyObjectKey(row.id, row.content_version);
	const object = await readAnswerKeyObject(objectKey);
	if (!object) return { ok: false, message: "This test's answer key isn't in storage. Import the test again." };
	const parsed = answerKeySchema.safeParse(await object.json());
	if (!parsed.success) return { ok: false, message: "The stored answer key can't be read. Import the test again." };
	const key = parsed.data;

	const applied = applyKeyEdits(key, edits);
	if (!applied.ok) return applied;
	const { changes } = applied;
	if (changes.length === 0) return { ok: false, message: "Nothing has changed." };

	const checked = answerKeySchema.safeParse(applied.key);
	if (!checked.success) {
		const issue = checked.error.issues[0];
		return { ok: false, message: `That key isn't valid: ${issue?.message ?? "check the answers"}.` };
	}
	await writeAnswerKeyObject(objectKey, `${JSON.stringify(checked.data, null, 2)}\n`);

	const finished = await selectAll("key edit attempts", (from, to) =>
		createAdminClient()
			.from("attempts")
			.select("id")
			.eq("test_id", row.id)
			.eq("content_version", row.content_version)
			.in("status", ["submitted", "expired"])
			.order("id")
			.range(from, to),
	);
	const rescored = await rescoreAttempts(finished.map((a) => a.id), checked.data);
	const bandsChanged = [...rescored.values()].filter((r) => r.before.band !== r.after.band || r.before.raw !== r.after.raw).length;

	await recordAudit({
		actorId: actor.id,
		branchId: actor.branchId,
		action: "test.key_edit",
		entity: "test",
		entityId: row.id,
		meta: { content_version: row.content_version, changes, remarked: rescored.size, scores_changed: bandsChanged },
	});

	const saved = `Saved ${changes.length} ${changes.length === 1 ? "answer" : "answers"}.`;
	if (rescored.size === 0) return { ok: true, message: `${saved} Nobody has finished this test yet.` };
	return {
		ok: true,
		message: `${saved} Re-marked ${rescored.size} finished ${rescored.size === 1 ? "test" : "tests"}; ${bandsChanged} ${
			bandsChanged === 1 ? "score" : "scores"
		} changed.`,
	};
}

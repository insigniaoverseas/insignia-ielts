"use server";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { revalidatePath } from "next/cache";

import { recordAudit } from "@/lib/audit";
import { getAnswerKeyView } from "@/lib/queries/answer-key";
import { getPreviewRow } from "@/lib/queries/test-preview";
import { audioObjectKey } from "@/lib/r2-keys";
import { ForbiddenError, requirePermission } from "@/lib/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FormState } from "./types";

/**
 * Publishing a test, and taking an unused one back to draft (M5-08).
 *
 * Both hold `test:publish` (Owner and Admin). `tests` is read-only to API
 * roles, so the status change is written with the secret-key client — but only
 * after the permission check, after the row has been read through the actor's
 * own RLS-scoped client (a test they cannot see cannot be published), and with
 * an audit row.
 *
 * Publishing is refused unless the test is actually takeable: questions and
 * answer key readable in R2, every numbered question keyed, and the MP3
 * present for Listening. The database's `tests_published_is_complete` CHECK is
 * the last line; this is the one that explains itself.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function refresh(testId: string) {
	revalidatePath("/admin/library");
	revalidatePath(`/admin/library/${testId}/answer-key`);
}

/** Publishes a complete draft so teachers can assign it. */
export async function publishTestAction(testId: string): Promise<FormState> {
	try {
		const { actor } = await requirePermission("test:publish");
		if (!UUID.test(testId)) return { ok: false, message: "That test could not be found." };

		const row = await getPreviewRow(testId);
		if (!row) return { ok: false, message: "That test could not be found." };

		if (row.status === "published") return { ok: true, message: "This test is already published." };
		if (row.status !== "draft") return { ok: false, message: "Only a draft can be published." };

		// Completeness, checked against what is really in R2.
		const key = await getAnswerKeyView(testId);
		if (!key || "problem" in key) {
			return { ok: false, message: "This test's questions or answer key are missing from storage. Import it again." };
		}
		if (key.entered < key.total) {
			return { ok: false, message: `${key.total - key.entered} questions have no answer yet. Every question needs one.` };
		}
		if (key.total !== row.total_questions) {
			return {
				ok: false,
				message: `The answer key has ${key.total} questions but the test says ${row.total_questions}. Import it again.`,
			};
		}
		if (row.skill === "listening") {
			const audio = await getCloudflareContext().env.AUDIO_BUCKET.head(audioObjectKey(row.id, row.content_version));
			if (!audio) return { ok: false, message: "This Listening test has no recording in storage. Import it again." };
		}

		const { data: updated, error } = await createAdminClient()
			.from("tests")
			.update({ status: "published", published_at: new Date().toISOString() })
			.eq("id", testId)
			.eq("status", "draft")
			.select("id");
		if (error) throw error;
		if (!updated?.length) return { ok: false, message: "This test changed while you were looking. Reload the page." };

		await recordAudit({
			actorId: actor.id,
			branchId: actor.branchId,
			action: "test.publish",
			entity: "test",
			entityId: testId,
			meta: { title: row.title, skill: row.skill, content_version: row.content_version, questions: key.total },
		});
		refresh(testId);
		return { ok: true, message: "Published. Teachers can now assign this test." };
	} catch (error) {
		if (error instanceof ForbiddenError) return { ok: false, message: "You don't have permission to publish tests." };
		console.error("publish test failed:", error);
		return { ok: false, message: "Something went wrong. The test is still a draft." };
	}
}

/**
 * Takes a published test back to draft — only while nothing depends on it.
 * Once a test is assigned or attempted, students and results point at it, so
 * pulling it would strand them; that needs archiving, which is not built.
 */
export async function unpublishTestAction(testId: string): Promise<FormState> {
	try {
		const { actor } = await requirePermission("test:publish");
		if (!UUID.test(testId)) return { ok: false, message: "That test could not be found." };

		const row = await getPreviewRow(testId);
		if (!row) return { ok: false, message: "That test could not be found." };

		const admin = createAdminClient();
		const [assignments, attempts] = await Promise.all([
			admin.from("assignments").select("id", { count: "exact", head: true }).eq("test_id", testId),
			admin.from("attempts").select("id", { count: "exact", head: true }).eq("test_id", testId),
		]);
		if (assignments.error) throw assignments.error;
		if (attempts.error) throw attempts.error;
		if ((assignments.count ?? 0) > 0 || (attempts.count ?? 0) > 0) {
			return {
				ok: false,
				message: "This test has been assigned or taken, so it can't go back to draft.",
			};
		}

		const { data: updated, error } = await admin
			.from("tests")
			.update({ status: "draft", published_at: null })
			.eq("id", testId)
			.eq("status", "published")
			.select("id");
		if (error) throw error;
		if (!updated?.length) return { ok: false, message: "This test isn't published. Reload the page." };

		await recordAudit({
			actorId: actor.id,
			branchId: actor.branchId,
			action: "test.unpublish",
			entity: "test",
			entityId: testId,
			meta: { title: row.title },
		});
		refresh(testId);
		return { ok: true, message: "Back to draft. Teachers can no longer assign it." };
	} catch (error) {
		if (error instanceof ForbiddenError) return { ok: false, message: "You don't have permission to publish tests." };
		console.error("unpublish test failed:", error);
		return { ok: false, message: "Something went wrong. Nothing was changed." };
	}
}

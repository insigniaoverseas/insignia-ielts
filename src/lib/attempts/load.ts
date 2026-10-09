import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import { readContentObject, signUrl } from "@/lib/r2";
import { audioObjectKey, contentObjectKey, parseR2ObjectKey } from "@/lib/r2-keys";
import type { AttemptObjectAccess } from "@/lib/r2-keys";
import { queryFailed, testSummary } from "@/lib/queries/shared";
import { sanitizeAttemptSession } from "@/lib/security/sanitize-attempt";
import { createClient } from "@/lib/supabase/server";
import { testContentSchema, toAttemptSections } from "@/lib/test-content";
import type { AttemptSession } from "@/lib/view-models/attempt";
import { playerStateFromRows } from "./answers";
import { secondsLeft } from "./clock";

/** The attempt columns the lifecycle needs. */
export type OwnedAttempt = {
	id: string;
	test_id: string;
	assignment_id: string | null;
	student_id: string;
	kind: string;
	content_version: number;
	status: "in_progress" | "submitted" | "expired" | "voided";
	started_at: string;
	expires_at: string;
	submitted_at: string | null;
};

const ATTEMPT_FIELDS =
	"id, test_id, assignment_id, student_id, kind, content_version, status, started_at, expires_at, submitted_at";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * The signed-in student's own attempt, read through their RLS-scoped client
 * and filtered on `student_id` as well — staff can read attempts in their
 * scope, but only the owner may *take* one.
 */
export async function getOwnedAttempt(attemptId: string, studentId: string): Promise<OwnedAttempt | null> {
	if (!UUID.test(attemptId)) return null;
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("attempts")
		.select(ATTEMPT_FIELDS)
		.eq("id", attemptId)
		.eq("student_id", studentId)
		.maybeSingle();
	if (error) queryFailed("owned attempt", error);
	return (data as OwnedAttempt | null) ?? null;
}

/** Why an attempt cannot be shown, in words the page uses. */
export type AttemptLoadProblem = "content_missing" | "content_invalid";

/**
 * Everything the player needs for one in-progress attempt (task 4 of the
 * beta list; M2-14/M2-15):
 *
 * - questions from the attempt's **pinned** `content_version` in R2, so a
 *   re-imported test never changes under a student mid-test;
 * - audio and labelling images as five-minute signed URLs, authorised against
 *   this attempt by `authorizeSignedDownload` before any credential is used;
 * - the student's saved answers and flags, so a reload resumes exactly;
 * - `secondsRemaining` from `expires_at` — the server clock, not the browser's.
 *
 * Returns the per-control revisions alongside, for autosave to number above.
 */
export async function loadAttemptSession(
	attempt: OwnedAttempt,
): Promise<{ session: AttemptSession; revisions: Record<string, number> } | { problem: AttemptLoadProblem }> {
	const supabase = await createClient();
	const [testResult, answersResult] = await Promise.all([
		supabase
			.from("tests")
			.select("id, title, skill, variant, difficulty, total_questions, duration_seconds, audio_duration_seconds")
			.eq("id", attempt.test_id)
			.maybeSingle(),
		supabase.from("answers").select("q_number, section_no, given_answer, flagged, revision").eq("attempt_id", attempt.id),
	]);
	if (testResult.error) queryFailed("attempt test", testResult.error);
	if (answersResult.error) queryFailed("attempt answers", answersResult.error);
	const test = testResult.data ? testSummary(testResult.data) : null;
	if (!testResult.data || !test) return { problem: "content_missing" };

	const object = await readContentObject(contentObjectKey(attempt.test_id, attempt.content_version));
	if (!object) return { problem: "content_missing" };
	const parsed = testContentSchema.safeParse(await object.json());
	if (!parsed.success || parsed.data.test_id.toLowerCase() !== attempt.test_id.toLowerCase()) {
		console.error("attempt content.json:", parsed.success ? "test_id mismatch" : parsed.error.message);
		return { problem: "content_invalid" };
	}
	const content = parsed.data;

	const access: AttemptObjectAccess = {
		attemptId: attempt.id,
		testId: attempt.test_id,
		contentVersion: attempt.content_version,
		status: attempt.status,
		resultsReleased: false,
	};

	// Image extensions are not stored anywhere readable; one listing maps
	// ordinal → key for the whole attempt.
	const assetKeys = new Map<number, string>();
	if (content.assets.length > 0) {
		const prefix = contentObjectKey(attempt.test_id, attempt.content_version).replace(/content\.json$/, "assets/");
		const listing = await getCloudflareContext().env.CONTENT_BUCKET.list({ prefix, limit: 1000 });
		for (const item of listing.objects) {
			const ref = parseR2ObjectKey(item.key);
			const ordinal = Number(item.key.slice(prefix.length).split(".")[0]);
			if (ref.kind === "asset" && Number.isSafeInteger(ordinal)) assetKeys.set(ordinal, ref.key);
		}
	}
	const assetUrls = new Map<number, string>();
	await Promise.all(
		content.assets.map(async (asset) => {
			const key = assetKeys.get(asset.ordinal);
			if (key) assetUrls.set(asset.ordinal, await signUrl(key, access));
		}),
	);

	const audioUrl =
		test.skill === "listening" && testResult.data.audio_duration_seconds
			? await signUrl(audioObjectKey(attempt.test_id, attempt.content_version), access)
			: null;

	const sections = toAttemptSections(content, (asset) => assetUrls.get(asset.ordinal) ?? "");
	const state = playerStateFromRows(sections, answersResult.data ?? []);

	const session: AttemptSession = {
		attemptId: attempt.id,
		test,
		mode: content.kind,
		secondsRemaining: secondsLeft(attempt),
		expiresAt: attempt.expires_at,
		audio:
			audioUrl && testResult.data.audio_duration_seconds
				? { url: audioUrl, durationSeconds: testResult.data.audio_duration_seconds }
				: null,
		sections,
		answers: state.answers,
		flagged: state.flagged,
	};
	return { session: sanitizeAttemptSession(session), revisions: state.revisions };
}

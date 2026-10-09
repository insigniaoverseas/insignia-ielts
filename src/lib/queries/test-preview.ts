import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import { readContentObject } from "@/lib/r2";
import { audioObjectKey, contentObjectKey, parseR2ObjectKey } from "@/lib/r2-keys";
import { sanitizeAttemptSession } from "@/lib/security/sanitize-attempt";
import { createClient } from "@/lib/supabase/server";
import { testContentSchema, toAttemptSections } from "@/lib/test-content";
import type { AttemptSession } from "@/lib/view-models/attempt";
import { queryFailed, testSummary } from "./shared";

/**
 * The `tests` row fields a preview needs. The `r2_*` path columns are not
 * granted to API roles (content migration), so the keys are rebuilt from
 * `id` + `content_version` with the same builders the importer used.
 */
type PreviewRow = {
	id: string;
	title: string;
	skill: string;
	variant: string;
	difficulty: string;
	total_questions: number;
	duration_seconds: number;
	content_version: number;
	status: string;
	audio_duration_seconds: number | null;
};

/**
 * One test row, through the signed-in staff member's RLS-scoped client — so a
 * test they cannot see in the library cannot be previewed or streamed either.
 */
export async function getPreviewRow(testId: string): Promise<PreviewRow | null> {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("tests")
		.select(
			"id, title, skill, variant, difficulty, total_questions, duration_seconds, content_version, status, audio_duration_seconds",
		)
		.eq("id", testId)
		.maybeSingle();
	if (error) queryFailed("preview test", error);
	return data;
}

/** Same-origin URLs the preview's media route answers. Never an R2 key. */
export const previewMediaUrl = {
	audio: (testId: string) => `/admin/library/${testId}/preview/media/audio`,
	asset: (testId: string, ordinal: number) => `/admin/library/${testId}/preview/media/asset/${ordinal}`,
};

/** Why a preview could not be built, in words the page shows. */
export type PreviewProblem = "missing_content" | "invalid_content";

/**
 * Builds a staff preview of a test from its private `content.json`.
 *
 * The result is an {@link AttemptSession} so the real player draws it, but it
 * is not an attempt: no row exists, nothing is saved, and the clock is the
 * test's full duration, drawn for show. `content.json` holds no answers, and
 * every authored HTML field is sanitised again here before it reaches the
 * client (`CLAUDE.md` rule 8).
 */
export async function getTestPreview(
	testId: string,
): Promise<{ session: AttemptSession } | { problem: PreviewProblem } | null> {
	const row = await getPreviewRow(testId);
	if (!row) return null;
	const test = testSummary(row);
	if (!test) return null;

	const object = await readContentObject(contentObjectKey(row.id, row.content_version));
	if (!object) return { problem: "missing_content" };

	const parsed = testContentSchema.safeParse(await object.json());
	if (!parsed.success || parsed.data.test_id.toLowerCase() !== row.id.toLowerCase()) {
		console.error("preview content.json:", parsed.success ? "test_id mismatch" : parsed.error.message);
		return { problem: "invalid_content" };
	}
	const content = parsed.data;

	const session: AttemptSession = {
		attemptId: `preview:${row.id}`,
		test,
		mode: content.kind,
		secondsRemaining: row.duration_seconds + content.transfer_seconds,
		// Display-only: nothing reads it, because a preview never submits.
		expiresAt: new Date(0).toISOString(),
		audio:
			row.skill === "listening" && row.audio_duration_seconds
				? { url: previewMediaUrl.audio(row.id), durationSeconds: row.audio_duration_seconds }
				: null,
		sections: toAttemptSections(content, (asset) => previewMediaUrl.asset(row.id, asset.ordinal)),
		answers: {},
		flagged: [],
	};
	return { session: sanitizeAttemptSession(session) };
}

/**
 * Streams one of a test's private media objects — its MP3 or a labelling
 * image — through the Worker binding, honouring `Range` so the audio element
 * can buffer it. The R2 key is rebuilt from the row's id and content
 * version; nothing in the request names a key.
 */
export async function streamPreviewMedia(
	row: PreviewRow,
	media: { kind: "audio" } | { kind: "asset"; ordinal: number },
	request: Request,
): Promise<Response> {
	const { env } = getCloudflareContext();
	let bucket: R2Bucket;
	let key: string;

	if (media.kind === "audio") {
		if (row.skill !== "listening") return new Response("Not found", { status: 404 });
		key = audioObjectKey(row.id, row.content_version);
		bucket = env.AUDIO_BUCKET;
	} else {
		if (!Number.isSafeInteger(media.ordinal) || media.ordinal < 1) {
			return new Response("Not found", { status: 404 });
		}
		// The extension is not stored anywhere readable; content key prefix + ordinal is unique.
		const prefix = contentObjectKey(row.id, row.content_version).replace(/content\.json$/, "assets/");
		const listing = await env.CONTENT_BUCKET.list({ prefix: `${prefix}${media.ordinal}.`, limit: 2 });
		const match = listing.objects[0];
		if (!match) return new Response("Not found", { status: 404 });
		const parsed = parseR2ObjectKey(match.key);
		if (parsed.kind !== "asset" || parsed.testId !== row.id.toLowerCase()) {
			return new Response("Not found", { status: 404 });
		}
		key = parsed.key;
		bucket = env.CONTENT_BUCKET;
	}

	const object = await bucket.get(key, { range: request.headers });
	if (!object) return new Response("Not found", { status: 404 });

	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set("etag", object.httpEtag);
	headers.set("accept-ranges", "bytes");
	// Staff-only content: never let a shared cache keep it.
	headers.set("cache-control", "private, no-store");

	const range = object.range as { offset?: number; length?: number; suffix?: number } | undefined;
	if (range && request.headers.has("range")) {
		const offset = range.suffix !== undefined ? object.size - range.suffix : (range.offset ?? 0);
		const length = range.suffix ?? range.length ?? object.size - offset;
		headers.set("content-range", `bytes ${offset}-${offset + length - 1}/${object.size}`);
		headers.set("content-length", String(length));
		return new Response(object.body, { status: 206, headers });
	}
	headers.set("content-length", String(object.size));
	return new Response(object.body, { status: 200, headers });
}

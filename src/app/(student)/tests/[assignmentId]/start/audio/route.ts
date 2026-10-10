import { getCloudflareContext } from "@opennextjs/cloudflare";

import { requireRole } from "@/lib/auth/guard";
import { getPreStartAudio, getPreTestBriefing } from "@/lib/queries/student";
import { audioObjectKey, streamR2Object } from "@/lib/r2";

/**
 * The test's one audio file, downloaded whole on the pre-test screen before
 * Start (M2-06, `MVP-1.md` §12) — so the server clock never runs while a slow
 * lab connection is still fetching it.
 *
 * Same-origin and streamed through the R2 binding rather than a signed R2
 * URL: the browser has to `fetch()` the bytes into its cache, and a
 * cross-origin fetch would need CORS on the private bucket and a wider
 * `connect-src`. The Worker only pipes the body, so the CPU cost is small.
 *
 * Gated like Start itself: a Listening test this student may start or resume
 * now. Nothing in the request names an R2 key; it is rebuilt from the test.
 */
export async function GET(request: Request, ctx: { params: Promise<{ assignmentId: string }> }) {
	const { assignmentId } = await ctx.params;
	await requireRole(["student"], `/tests/${assignmentId}/start`);

	const briefing = await getPreTestBriefing(assignmentId);
	const audio = briefing ? await getPreStartAudio(briefing) : null;
	if (!audio) return new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });

	return streamR2Object(
		getCloudflareContext().env.AUDIO_BUCKET,
		audioObjectKey(audio.testId, audio.contentVersion),
		request,
	);
}

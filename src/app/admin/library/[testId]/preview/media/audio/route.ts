import type { NextRequest } from "next/server";

import { requirePermissionOrRedirect } from "@/lib/auth/guard";
import { getPreviewRow, streamPreviewMedia } from "@/lib/queries/test-preview";

/** Streams a test's one MP3 from R2 to the staff preview, after the page's own permission check. */
export async function GET(request: NextRequest, ctx: { params: Promise<{ testId: string }> }) {
	const { testId } = await ctx.params;
	await requirePermissionOrRedirect("test:author");
	const row = await getPreviewRow(testId);
	if (!row) return new Response("Not found", { status: 404 });
	return streamPreviewMedia(row, { kind: "audio" }, request);
}

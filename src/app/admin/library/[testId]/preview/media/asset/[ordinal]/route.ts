import type { NextRequest } from "next/server";

import { requirePermissionOrRedirect } from "@/lib/auth/guard";
import { getPreviewRow, streamPreviewMedia } from "@/lib/queries/test-preview";

/** Streams one labelling image from R2 to the staff preview, after the page's own permission check. */
export async function GET(
	request: NextRequest,
	ctx: { params: Promise<{ testId: string; ordinal: string }> },
) {
	const { testId, ordinal } = await ctx.params;
	await requirePermissionOrRedirect("test:author");
	if (!/^[1-9]\d{0,3}$/.test(ordinal)) return new Response("Not found", { status: 404 });
	const row = await getPreviewRow(testId);
	if (!row) return new Response("Not found", { status: 404 });
	return streamPreviewMedia(row, { kind: "asset", ordinal: Number(ordinal) }, request);
}

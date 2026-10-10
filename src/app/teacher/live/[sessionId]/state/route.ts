import { requirePermissionOrRedirect } from "@/lib/auth/guard";
import { getLiveStudents } from "@/lib/queries/teacher";

/**
 * The live monitor's poll (M7-01): screen 17 asks this every 10 seconds.
 *
 * A plain GET of fresh tiles, not a realtime channel (`PROJECT-MEMORY.md` §4,
 * 2026-09-15). Same gate as the page — a signed-out or revoked session is
 * redirected to sign-in, which the monitor notices and follows. `no-store`
 * because a cached answer here is a room that looks calm and isn't.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ sessionId: string }> }) {
	const { sessionId } = await ctx.params;
	await requirePermissionOrRedirect("session:invigilate", `/teacher/live/${sessionId}`);
	const students = await getLiveStudents(sessionId);
	if (!students) return Response.json({ error: "not_found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
	return Response.json({ students }, { headers: { "Cache-Control": "no-store" } });
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LiveMonitor } from "@/components/staff/live-monitor";
import { requirePermissionOrRedirect } from "@/lib/auth/guard";
import { getLiveSession } from "@/lib/queries/teacher";

export const metadata: Metadata = { title: "Live session" };

/**
 * Screen 17 — Live session monitor (M7-02). The invigilator's screen.
 *
 * Its data arrives by polling, not a realtime channel — the polled endpoint is
 * M7-01 and the invigilator actions are M7-03. Until those land the tiles tick
 * their own clocks so the page behaves as it will in a lab.
 */
export default async function LivePage({ params }: { params: Promise<{ sessionId: string }> }) {
	const { sessionId } = await params;
	await requirePermissionOrRedirect("session:invigilate", `/teacher/live/${sessionId}`);
	const session = await getLiveSession(sessionId);
	if (!session) notFound();

	return (
		<div className="flex flex-col gap-6">
			<Link href="/teacher/dashboard" className="font-semibold">
				← Back to dashboard
			</Link>

			<div className="flex flex-col gap-1">
				<h1 className="m-0 text-h1">{session.testTitle}</h1>
				<p className="m-0 text-ink-2">{session.batchName} · live now</p>
			</div>

			<LiveMonitor initial={session} />
		</div>
	);
}

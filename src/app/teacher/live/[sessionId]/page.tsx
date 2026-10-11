import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LiveMonitor } from "@/components/staff/live-monitor";
import { requirePermissionOrRedirect, withGuard } from "@/lib/auth/guard";
import { getLiveSession } from "@/lib/queries/teacher";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = { title: "Live session" };

/**
 * Screen 17 — Live session monitor (M7-02). The invigilator's screen.
 *
 * Its data arrives by polling, not a realtime channel: this page renders the
 * first state, then the monitor polls `./state` (M7-01) every 10 seconds. The
 * invigilator actions are M7-03 and are not wired yet.
 */
export default async function LivePage({ params }: { params: Promise<{ sessionId: string }> }) {
	const { sessionId } = await params;
	const session = await withGuard(requirePermissionOrRedirect("session:invigilate", `/teacher/live/${sessionId}`), getLiveSession(sessionId));
	if (!session) notFound();

	return (
		<div className="flex flex-col gap-6">
			<Link href="/teacher/dashboard" className="font-semibold">
				<Icon name="arrow-left" className="mr-1.5" />
				Back to dashboard
			</Link>

			<div className="flex flex-col gap-1">
				<h1 className="m-0 text-h1">{session.testTitle}</h1>
				<p className="m-0 text-ink-2">{session.batchName} · live now</p>
			</div>

			<LiveMonitor initial={session} />
		</div>
	);
}

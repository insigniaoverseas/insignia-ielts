import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ResultsTable } from "@/components/staff/results-table";
import { SKILL_LABEL } from "@/components/student/labels";
import { requirePermissionOrRedirect } from "@/lib/auth/guard";
import { getAssignmentResults } from "@/lib/queries/teacher";

export const metadata: Metadata = {
	title: "Results",
	// Keep result and integrity data out of search indexes.
	robots: { index: false, follow: false },
};

/**
 * Screen 18 — Results & release (M6-04, M6-05).
 *
 * Staff-only, gated by a database permission and RLS. Correct-answer override
 * rows remain absent until the private R2 key reader is connected.
 */
export default async function ResultsPage({ params }: { params: Promise<{ assignmentId: string }> }) {
	const { assignmentId } = await params;
	await requirePermissionOrRedirect("results:release", `/teacher/results/${assignmentId}`);
	const data = await getAssignmentResults(assignmentId);
	if (!data) notFound();

	return (
		<div className="flex flex-col gap-6">
			<Link href="/teacher/dashboard" className="font-semibold">
				← Back to dashboard
			</Link>

			<div className="flex flex-col gap-1">
				<h1 className="m-0 text-h1">{data.testTitle}</h1>
				<p className="m-0 text-ink-2">
					{SKILL_LABEL[data.skill]} · {data.batchName}
				</p>
			</div>

			<ResultsTable data={data} />
		</div>
	);
}

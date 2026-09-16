import type { Metadata } from "next";
import Link from "next/link";
import { AssignFlow } from "@/components/staff/assign-flow";
import { requirePermissionOrRedirect } from "@/lib/auth/guard";
import { getAssignOptions } from "@/lib/queries/teacher";

export const metadata: Metadata = { title: "Assign a test" };

/**
 * Screen 16 — Assign a test (M6-03).
 *
 * The three steps and the summary sentence live in `AssignFlow`; this page
 * just loads what the steps can offer. The assign Server Action lands with M6.
 */
export default async function AssignPage({
	searchParams,
}: {
	searchParams: Promise<{ batch?: string }>;
}) {
	await requirePermissionOrRedirect("assignment:manage", "/teacher/assign");
	const { batch } = await searchParams;
	const options = await getAssignOptions();

	return (
		<div className="flex max-w-[840px] flex-col gap-6">
			<Link href="/teacher/dashboard" className="font-semibold">
				← Back to dashboard
			</Link>
			<h1 className="m-0 text-h1">Assign a test</h1>
			<AssignFlow options={options} initialBatch={batch} />
		</div>
	);
}

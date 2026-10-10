"use client";

import Link from "next/link";
import { AssignFlow } from "@/components/staff/assign-flow";
import { pageData, useTeacherData } from "@/components/staff/staff-data";

/**
 * Screen 16 — Assign a test (M6-03).
 *
 * The three steps and the summary sentence live in `AssignFlow`; this page
 * just loads what the steps can offer. The assign Server Action lands with M6.
 */
export function AssignView({ batch }: { batch?: string }) {
	const options = pageData(useTeacherData().assign, "/teacher/dashboard");

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

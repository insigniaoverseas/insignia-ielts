import type { Metadata } from "next";
import Link from "next/link";

import { CreateBatchForm } from "@/components/admin/create-batch-form";
import { requirePermissionOrRedirect } from "@/lib/auth/guard";
import { listBranchOptions, listTeacherOptions } from "@/lib/queries/batches";
import { instituteToday } from "@/lib/queries/shared";

export const metadata: Metadata = { title: "Create a batch" };

/**
 * Screen 25a — create a batch (M5-07).
 *
 * Screen 25's button has linked here since the screen was designed; the page,
 * the Server Action and the write were all missing, so batches could only be
 * created straight in the database.
 *
 * Guarded on `student:manage` — "invite students; manage plans and batches" —
 * which admins hold in `branch` scope and the Owner in `all`.
 */
export default async function NewBatchPage() {
	await requirePermissionOrRedirect("student:manage", "/admin/batches/new");
	const [branches, teachers] = await Promise.all([listBranchOptions(), listTeacherOptions()]);

	return (
		<div className="flex max-w-[640px] flex-col gap-6">
			<Link href="/admin/batches" className="font-semibold">
				← Back to batches
			</Link>

			<div className="flex flex-col gap-1">
				<h1 className="m-0 text-h1">Create a batch</h1>
				<p className="m-0 text-ink-2">A class group. Tests are assigned to batches, not to students one by one.</p>
			</div>

			{/* Today in India, not the Worker's timezone (`CLAUDE.md` rule 9). */}
			<CreateBatchForm branches={branches} teachers={teachers} today={instituteToday()} />
		</div>
	);
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BatchRoster } from "@/components/admin/batch-roster";
import { EditBatchForm } from "@/components/admin/edit-batch-form";
import { RemoveBatch } from "@/components/admin/remove-batch";
import { requirePermissionOrRedirect, withGuard } from "@/lib/auth/guard";
import { getBatchDetail } from "@/lib/queries/admin";
import { previewBatchPurge } from "@/lib/batches";
import { listStudentOptions, listTeacherOptions } from "@/lib/queries/batches";
import { requirePermission } from "@/lib/rbac";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = { title: "Batch" };

/**
 * Screen 25b — one batch (M5-07).
 *
 * Every batch name on screen 25 has linked here since the screen was designed,
 * and this page did not exist, so the list was a set of dead links and a batch
 * could not be corrected once created.
 *
 * A batch outside the admin's centre is `notFound`, not "forbidden": RLS
 * returns no row either way, and telling someone guessing IDs which ones are
 * real is the whole thing worth not doing.
 */
export default async function BatchPage({ params }: { params: Promise<{ batchId: string }> }) {
	const { batchId } = await params;
	const [batch, teachers, students] = await withGuard(
		requirePermissionOrRedirect("student:manage", `/admin/batches/${batchId}`),
		Promise.all([getBatchDetail(batchId), listTeacherOptions(), listStudentOptions()]),
	);
	if (!batch) notFound();
	// The guard above has already turned away anyone without this permission.
	const { actor, scope } = await requirePermission("student:manage");
	const purge = await previewBatchPurge(actor, scope, batch.id);

	return (
		<div className="flex max-w-[640px] flex-col gap-6">
			<Link href="/admin/batches" className="font-semibold">
				<Icon name="arrow-left" className="mr-1.5" />
				Back to batches
			</Link>

			<div className="flex flex-col gap-1">
				<h1 className="m-0 text-h1">{batch.name}</h1>
				<p className="m-0 text-ink-2">{batch.branchName}</p>
			</div>

			<EditBatchForm batch={batch} teachers={teachers} />

			<BatchRoster batchId={batch.id} members={batch.students} candidates={students} />

			<RemoveBatch batch={batch} purge={purge} />

		</div>
	);
}

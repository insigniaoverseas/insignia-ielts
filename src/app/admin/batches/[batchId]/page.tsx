import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EditBatchForm } from "@/components/admin/edit-batch-form";
import { TableCard, TableToolbar } from "@/components/ui/table";
import { requirePermissionOrRedirect } from "@/lib/auth/guard";
import { getBatchDetail } from "@/lib/queries/admin";
import { listTeacherOptions } from "@/lib/queries/batches";

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
	await requirePermissionOrRedirect("student:manage", `/admin/batches/${batchId}`);

	const [batch, teachers] = await Promise.all([getBatchDetail(batchId), listTeacherOptions()]);
	if (!batch) notFound();

	return (
		<div className="flex max-w-[640px] flex-col gap-6">
			<Link href="/admin/batches" className="font-semibold">
				← Back to batches
			</Link>

			<div className="flex flex-col gap-1">
				<h1 className="m-0 text-h1">{batch.name}</h1>
				<p className="m-0 text-ink-2">{batch.branchName}</p>
			</div>

			<EditBatchForm batch={batch} teachers={teachers} />

			<TableCard>
				<TableToolbar>
					<div className="flex flex-col gap-1">
						<h2 className="m-0 text-h3">
							Students ({batch.students.length})
						</h2>
						{/* Honest about the boundary: this screen shows the roster but
						    does not change it, and saying so beats a control that
						    silently is not there. */}
						<p className="m-0 text-small text-ink-2">
							Students join a batch when they&rsquo;re invited. Moving them between batches isn&rsquo;t built yet.
						</p>
					</div>
				</TableToolbar>
				{batch.students.length === 0 ? (
					<p className="m-0 px-6 py-5 text-ink-2">Nobody in this batch yet.</p>
				) : (
					<ul className="m-0 flex list-none flex-col gap-0 p-0">
						{batch.students.map((student) => (
							<li key={student.id} className="border-t border-line px-6 py-3">
								<Link href={`/admin/students/${student.id}`} className="font-semibold">
									{student.name}
								</Link>
							</li>
						))}
					</ul>
				)}
			</TableCard>
		</div>
	);
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import {
	Table,
	TableBody,
	TableCard,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	TableToolbar,
} from "@/components/ui/table";
import { pageData, useAdminData } from "@/components/staff/staff-data";

/**
 * Screen 25 — Batches (M5-07).
 *
 * A batch with no teacher and a batch with no students are both broken, and
 * both are easy to create by accident, so the table calls them out in words
 * rather than leaving an empty cell to be noticed.
 *
 * Removed (archived) batches are hidden until "Show removed batches" (M10-14),
 * so the everyday list is the batches that are running or finished.
 */
export function BatchesView({ created, done }: { created?: string; done?: string }) {
	const all = pageData(useAdminData().batches, "/admin/overview");
	const [showRemoved, setShowRemoved] = useState(false);
	const removed = all.filter((b) => b.status === "archived").length;
	const batches = showRemoved ? all : all.filter((b) => b.status !== "archived");

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="m-0 text-h1">Batches</h1>
				<Button asChild>
					<Link href="/admin/batches/new">Create batch</Link>
				</Button>
			</div>

			{/* Confirmation lands on the list, where the new row is visible, rather
			    than on the form the admin has just left. */}
			{created && <Banner tone="success">{created} was created.</Banner>}
			{done && <Banner tone="success">{done}</Banner>}

			<TableCard>
				<TableToolbar>
					<span className="text-small text-ink-2">
						{batches.length} {batches.length === 1 ? "batch" : "batches"}
					</span>
					{removed > 0 && (
						<Button variant="ghost" onClick={() => setShowRemoved((v) => !v)} aria-pressed={showRemoved}>
							{showRemoved ? "Hide removed batches" : `Show removed batches (${removed})`}
						</Button>
					)}
				</TableToolbar>
				<Table>
					<TableHeader sticky>
						<TableRow>
							<TableHead>Batch</TableHead>
							<TableHead>Centre</TableHead>
							<TableHead>Teachers</TableHead>
							<TableHead className="text-right">Students</TableHead>
							<TableHead>Runs</TableHead>
							<TableHead>Status</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{batches.map((b) => (
							<TableRow key={b.id}>
								<TableCell>
									<Link href={`/admin/batches/${b.id}`} className="font-semibold">
										{b.name}
									</Link>
								</TableCell>
								<TableCell className="text-ink-2">{b.branchName}</TableCell>
								<TableCell>
									{b.teacherNames.length > 0 ? (
										b.teacherNames.join(", ")
									) : (
										// An unstaffed batch can't be taught; say so, don't leave a blank.
										<span className="font-semibold text-warning">No teacher yet</span>
									)}
								</TableCell>
								<TableCell className="text-right font-mono">
									{b.studentCount > 0 ? (
										b.studentCount
									) : (
										<span className="font-sans font-semibold text-warning">Empty</span>
									)}
								</TableCell>
								<TableCell className="font-mono text-small text-ink-2">
									{b.startsLabel ?? "—"} → {b.endsLabel ?? "open-ended"}
								</TableCell>
								<TableCell>
									<StatusPill
										status={b.status === "active" ? "active" : b.status === "completed" ? "submitted" : "locked"}
										size="sm"
										label={b.status === "active" ? "Active" : b.status === "completed" ? "Finished" : "Removed"}
									/>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableCard>
		</div>
	);
}

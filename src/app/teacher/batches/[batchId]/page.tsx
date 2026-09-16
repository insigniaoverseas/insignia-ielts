import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { formatBand } from "@/components/ui/band-score";
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
import { getBatchView } from "@/lib/mock/teacher";

export const metadata: Metadata = { title: "Batch" };

/**
 * Screen 15 — Batch view (M6-02).
 *
 * The roster, with plan expiry in it. A teacher is the person who finds out
 * first that a student is about to lose access — they see them twice a week —
 * so the warning belongs on the register they already read, not only in the
 * admin's queue.
 */
export default async function BatchPage({ params }: { params: Promise<{ batchId: string }> }) {
	const { batchId } = await params;
	const data = await getBatchView(batchId);
	if (!data) notFound();

	const expiringSoon = data.roster.filter((r) => r.daysRemaining <= 7).length;

	return (
		<div className="flex flex-col gap-6">
			<Link href="/teacher/dashboard" className="font-semibold">
				← Back to dashboard
			</Link>

			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="m-0 text-h1">{data.batchName}</h1>
				<div className="flex gap-3">
					<Button variant="secondary" asChild>
						<Link href={`/teacher/batches/${batchId}/analytics`}>What to teach</Link>
					</Button>
					<Button asChild>
						<Link href={`/teacher/assign?batch=${batchId}`}>Assign a test</Link>
					</Button>
				</div>
			</div>

			<TableCard>
				<TableToolbar>
					<span className="text-small text-ink-2">
						{data.roster.length} {data.roster.length === 1 ? "student" : "students"}
						{expiringSoon > 0 && (
							<>
								{" · "}
								<strong className="font-semibold text-warning">
									{expiringSoon} losing access within a week
								</strong>
							</>
						)}
					</span>
				</TableToolbar>

				<Table>
					<TableHeader sticky>
						<TableRow>
							<TableHead>Student</TableHead>
							<TableHead className="text-right">Last band</TableHead>
							<TableHead className="text-right">Tests done</TableHead>
							<TableHead>Access</TableHead>
							<TableHead>Last active</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.roster.map((r) => (
							<TableRow key={r.studentId}>
								<TableCell>
									<span className="font-semibold">{r.name}</span>
									<div className="font-mono text-small text-ink-2">{r.phone}</div>
								</TableCell>
								<TableCell className="text-right font-mono">
									{r.lastBand === null ? <span className="text-ink-3">—</span> : formatBand(r.lastBand)}
								</TableCell>
								<TableCell className="text-right font-mono">{r.testsDone}</TableCell>
								<TableCell>
									{r.daysRemaining < 0 ? (
										<StatusPill status="expired" size="sm" label={`Ended ${r.planEndsLabel}`} />
									) : r.daysRemaining <= 7 ? (
										<StatusPill status="expiring" size="sm" label={`${r.daysRemaining} days left`} />
									) : (
										<span className="font-mono text-small text-ink-2">{r.planEndsLabel}</span>
									)}
								</TableCell>
								<TableCell className="text-ink-2">{r.lastActiveLabel}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableCard>
		</div>
	);
}

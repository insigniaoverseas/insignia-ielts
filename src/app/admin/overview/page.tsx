import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
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
import { getAdminOverview } from "@/lib/queries/admin";

export const metadata: Metadata = { title: "Overview" };

/**
 * Screen 20 — Admin overview (M5-02).
 *
 * Four numbers, then the work. The "expiring soon" table is the point of the
 * screen — a student whose plan lapses silently is a student who turns up to a
 * lab and cannot start, so the fix (Extend) is inline on the row rather than
 * three clicks away in the plans queue.
 */
export default async function OverviewPage() {
	const data = await getAdminOverview();
	const { stats, deltas } = data;

	return (
		<div className="flex flex-col gap-6">
			<h1 className="m-0 text-h1">Overview</h1>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<StatCard label="Active students" value={stats.activeStudents} delta={deltas.activeStudents} deltaTone="good" />
				<StatCard label="Tests taken this week" value={stats.testsThisWeek} delta={deltas.testsThisWeek} deltaTone="good" />
				<StatCard
					label="Plans expiring in 7 days"
					value={stats.expiringIn7Days}
					valueTone={stats.expiringIn7Days > 0 ? "attention" : "neutral"}
					delta={stats.expiringIn7Days > 0 ? "Needs attention" : "Nothing to do"}
					deltaTone={stats.expiringIn7Days > 0 ? "attention" : "neutral"}
				/>
				<StatCard label="Live sessions now" value={stats.liveSessions} delta={stats.liveSessions > 0 ? "Tests in progress" : "None running"} />
			</div>

			<TableCard>
				<TableToolbar>
					<div className="flex flex-col gap-1">
						<h2 className="m-0 text-h3">Expiring soon</h2>
						<p className="m-0 text-small text-ink-2">Soonest first. Extend before the student is locked out.</p>
					</div>
					<Button variant="secondary" asChild>
						<Link href="/admin/plans">Open the plans queue</Link>
					</Button>
				</TableToolbar>

				<Table>
					<TableHeader sticky>
						<TableRow>
							<TableHead>Student</TableHead>
							<TableHead>Batch</TableHead>
							<TableHead>Plan ends</TableHead>
							<TableHead>Status</TableHead>
							<TableHead className="text-right">Action</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.expiringSoon.map((s) => (
							<TableRow key={s.id}>
								<TableCell>
									<Link href={`/admin/students/${s.id}`} className="font-semibold">
										{s.name}
									</Link>
									<div className="font-mono text-small text-ink-2">{s.phone}</div>
								</TableCell>
								<TableCell className="text-ink-2">{s.batchName ?? "—"}</TableCell>
								<TableCell className="font-mono">{s.planEndsLabel}</TableCell>
								<TableCell>
									<StatusPill
										status="expiring"
										size="sm"
										label={s.daysRemaining === 0 ? "Ends today" : `${s.daysRemaining} days left`}
									/>
								</TableCell>
								<TableCell className="text-right">
									<Button variant="secondary" asChild>
										<Link href={`/admin/plans?student=${s.id}`}>Extend</Link>
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableCard>

			<section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
				<h2 className="m-0 text-h3">Recent activity</h2>
				<ul className="m-0 flex list-none flex-col gap-0 p-0">
					{data.recentActivity.map((a) => (
						<li key={a.id} className="flex flex-wrap gap-x-3 border-b border-line py-3 last:border-b-0">
							<span className="w-[140px] flex-none font-mono text-small text-ink-2">{a.whenLabel}</span>
							<span className="min-w-0 flex-1">
								<strong className="font-semibold">{a.actor}</strong> — {a.summary}
							</span>
						</li>
					))}
				</ul>
			</section>
		</div>
	);
}

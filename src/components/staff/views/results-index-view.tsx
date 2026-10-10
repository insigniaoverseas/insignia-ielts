"use client";

import Link from "next/link";

import { SKILL_LABEL } from "@/components/student/labels";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { Table, TableBody, TableCard, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { pageData, useTeacherData } from "@/components/staff/staff-data";

/**
 * `/teacher/results` — the list behind the nav's "Results" link (M10-01).
 *
 * Every test this person has set, newest first: who it went to, how many
 * have handed in, and whether the results are out. Each row opens screen 18,
 * where results are released and marks are given by hand.
 */
export function ResultsIndexView() {
	const rows = pageData(useTeacherData().results, "/teacher/dashboard");

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="m-0 text-h1">Results</h1>
				<p className="m-0 text-ink-2">Every test you&rsquo;ve set, newest first. Open one to see marks and release results.</p>
			</div>

			{rows.length === 0 ? (
				<EmptyState
					icon="✓"
					title="No tests set yet"
					action={
						<Link href="/teacher/assign" className="font-semibold">
							Assign a test
						</Link>
					}
				>
					Results appear here once you assign a test.
				</EmptyState>
			) : (
				<TableCard>
					<Table>
						<TableHeader sticky>
							<TableRow>
								<TableHead>Test</TableHead>
								<TableHead>Given to</TableHead>
								<TableHead className="text-right">Handed in</TableHead>
								<TableHead>Results</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.map((r) => (
								<TableRow key={r.assignmentId}>
									<TableCell>
										<Link href={`/teacher/results/${r.assignmentId}`} className="font-semibold">
											{r.testTitle}
										</Link>
										<div className="text-small text-ink-2">
											{SKILL_LABEL[r.skill as keyof typeof SKILL_LABEL] ?? r.skill} · set {r.setLabel}
										</div>
									</TableCell>
									<TableCell className="text-ink-2">{r.targetLabel}</TableCell>
									<TableCell className="text-right font-mono">
										{r.submitted}
										{r.working > 0 && <div className="text-small text-ink-2">{r.working} still working</div>}
									</TableCell>
									<TableCell>
										{r.release.released ? (
											<StatusPill status="submitted" size="sm" label={r.release.mode === "immediate" ? "Shown at once" : "Released"} />
										) : r.release.mode === "scheduled" ? (
											<StatusPill status="not_started" size="sm" label={`Out ${r.release.whenLabel}`} />
										) : (
											<StatusPill status="not_started" size="sm" label="Held — release when ready" />
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</TableCard>
			)}
		</div>
	);
}

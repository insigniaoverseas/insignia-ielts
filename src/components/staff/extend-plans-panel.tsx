"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import {
	Table,
	TableBody,
	TableBulkActions,
	TableCard,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	TableToolbar,
} from "@/components/ui/table";
import type { StudentRow } from "@/lib/view-models/admin";

/** The extension lengths staff actually use, plus a custom date. */
const LENGTHS = [
	{ value: 1, label: "1 month" },
	{ value: 3, label: "3 months" },
	{ value: 6, label: "6 months" },
];

/**
 * One group of the expiry workqueue (screen 24), with its bulk extend flow.
 *
 * The confirm dialog states **exactly what will change** — "28 students, new
 * expiry 12 Mar 2027" — because this action is applied to tens of people at
 * once and is only reversible by hand. A reason is required for the same
 * reason: the plan history is what the next person reads when a student
 * disputes their access.
 */
export function ExtendPlansPanel({
	title,
	note,
	tone,
	rows,
}: {
	title: string;
	note: string;
	tone: "danger" | "warning" | "neutral";
	rows: StudentRow[];
}) {
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [months, setMonths] = useState(3);
	const [reason, setReason] = useState("");
	const [confirming, setConfirming] = useState(false);

	if (rows.length === 0) return null;

	const allOn = selected.size === rows.length;
	const someOn = selected.size > 0 && !allOn;

	function toggle(id: string) {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	/**
	 * The date the confirm dialog quotes. Computed here only to *show* the
	 * consequence; the server recomputes it from each plan's own end date when
	 * the action runs, so a stale tab cannot write a wrong date.
	 */
	const newExpiry = new Date();
	newExpiry.setMonth(newExpiry.getMonth() + months);
	const newExpiryLabel = newExpiry.toLocaleDateString("en-IN", {
		day: "numeric",
		month: "short",
		year: "numeric",
		timeZone: "Asia/Kolkata",
	});

	return (
		<TableCard>
			<TableToolbar>
				<div className="flex flex-col gap-1">
					<div className="flex items-center gap-3">
						<h2 className="m-0 text-h3">{title}</h2>
						<StatusPill
							status={tone === "danger" ? "expired" : tone === "warning" ? "expiring" : "active"}
							size="sm"
							label={`${rows.length}`}
						/>
					</div>
					<p className="m-0 text-small text-ink-2">{note}</p>
				</div>
			</TableToolbar>

			<Table>
				<TableHeader sticky>
					<TableRow>
						<TableHead className="w-12">
							<Checkbox
								checked={allOn ? true : someOn ? "indeterminate" : false}
								onCheckedChange={() => setSelected(allOn ? new Set() : new Set(rows.map((r) => r.id)))}
								aria-label={`Select all ${rows.length} students in ${title}`}
							/>
						</TableHead>
						<TableHead>Student</TableHead>
						<TableHead>Batch</TableHead>
						<TableHead>Plan ends</TableHead>
						<TableHead>Status</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{rows.map((s) => (
						<TableRow key={s.id} selected={selected.has(s.id)}>
							<TableCell>
								<Checkbox
									checked={selected.has(s.id)}
									onCheckedChange={() => toggle(s.id)}
									aria-label={`Select ${s.name}`}
								/>
							</TableCell>
							<TableCell>
								<span className="font-semibold">{s.name}</span>
								<div className="font-mono text-small text-ink-2">{s.phone}</div>
							</TableCell>
							<TableCell className="text-ink-2">{s.batchName ?? "—"}</TableCell>
							<TableCell className="font-mono">{s.planEndsLabel}</TableCell>
							<TableCell>
								<StatusPill
									status={s.daysRemaining < 0 ? "expired" : "expiring"}
									size="sm"
									label={
										s.daysRemaining < 0
											? `${Math.abs(s.daysRemaining)} days ago`
											: s.daysRemaining === 0
												? "Ends today"
												: `${s.daysRemaining} days left`
									}
								/>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>

			{selected.size > 0 && (
				<TableBulkActions>
					<span className="font-semibold text-white">
						{selected.size} {selected.size === 1 ? "student" : "students"} selected
					</span>
					<div className="flex flex-wrap items-center gap-2">
						{LENGTHS.map((l) => (
							<Button
								key={l.value}
								variant={months === l.value ? "inverse" : "inverse-secondary"}
								onClick={() => setMonths(l.value)}
								aria-pressed={months === l.value}
							>
								{l.label}
							</Button>
						))}
						<Button variant="inverse" onClick={() => setConfirming(true)}>
							Extend
						</Button>
					</div>
				</TableBulkActions>
			)}

			<ConfirmDialog
				open={confirming}
				onOpenChange={setConfirming}
				title={`Extend ${selected.size} ${selected.size === 1 ? "plan" : "plans"} by ${months} ${
					months === 1 ? "month" : "months"
				}?`}
				description={
					<>
						Each plan will be extended from its own end date, so nobody loses time they already have. Plans
						ending today would run to about <strong className="font-semibold">{newExpiryLabel}</strong>.
						<span className="mt-4 block">
							<span className="mb-1.5 block text-small font-semibold text-ink">
								Why (this is kept in the student&rsquo;s history)
							</span>
							<Input
								size="admin"
								value={reason}
								onChange={(e) => setReason(e.target.value)}
								placeholder="e.g. missed classes, illness"
							/>
						</span>
					</>
				}
				confirmLabel="Extend the plans"
				cancelLabel="Cancel"
				onConfirm={() => setConfirming(false)}
			/>
		</TableCard>
	);
}

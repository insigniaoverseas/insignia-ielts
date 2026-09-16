import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import { formatBand } from "@/components/ui/band-score";
import {
	Table,
	TableBody,
	TableCard,
	TableCell,
	TableHead,
	TableHeader,
	TablePagination,
	TableRow,
	TableToolbar,
} from "@/components/ui/table";
import { getStudentsList } from "@/lib/mock/admin";
import type { PlanState } from "@/lib/view-models/admin";

export const metadata: Metadata = { title: "Students" };

/** The plan pill, so "expiring" always says *how* expiring. */
function PlanPill({ state, days, endsLabel }: { state: PlanState; days: number; endsLabel: string }) {
	if (state === "expired") return <StatusPill status="expired" size="sm" label={`Ended ${endsLabel}`} />;
	if (state === "expiring")
		return <StatusPill status="expiring" size="sm" label={days === 0 ? "Ends today" : `${days} days left`} />;
	if (state === "suspended") return <StatusPill status="locked" size="sm" label="Suspended" />;
	return <StatusPill status="active" size="sm" />;
}

/**
 * Screen 21 — Students list (M5-03).
 *
 * Search and filters live in the URL, not in client state: a filtered list is
 * a thing staff paste to each other ("the 12 expiring in Karol Bagh"), and it
 * survives a refresh in the middle of a support call.
 *
 * Bulk selection and the sticky bulk bar land with the server actions (M5-06);
 * the toolbar shows the actions that already have a destination.
 */
export default async function StudentsPage({
	searchParams,
}: {
	searchParams: Promise<{ q?: string; batch?: string; status?: string }>;
}) {
	const { q, batch, status } = await searchParams;
	const data = await getStudentsList({ search: q, batch, status });

	const STATUSES = [
		{ value: "all", label: "All" },
		{ value: "active", label: "Active" },
		{ value: "expiring", label: "Expiring" },
		{ value: "expired", label: "Expired" },
	];

	/** Keep the other filters when one changes. */
	const href = (next: Record<string, string | undefined>) => {
		const merged = { q, batch, status, ...next };
		const qs = Object.entries(merged)
			.filter(([, v]) => v && v !== "all")
			.map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`)
			.join("&");
		return qs ? `/admin/students?${qs}` : "/admin/students";
	};

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="m-0 text-h1">Students</h1>
				<div className="flex gap-3">
					<Button variant="secondary" asChild>
						<Link href="/admin/students/import">Import CSV</Link>
					</Button>
					<Button asChild>
						<Link href="/admin/students/new">Add student</Link>
					</Button>
				</div>
			</div>

			{/* A plain GET form: no JavaScript needed, and the result is a URL. */}
			<form action="/admin/students" method="get" className="flex flex-wrap items-end gap-3">
				<label className="flex min-w-[240px] flex-1 flex-col gap-1.5">
					<span className="text-small font-semibold">Search</span>
					<Input name="q" size="admin" defaultValue={q ?? ""} placeholder="Name or phone number" />
				</label>
				{batch && <input type="hidden" name="batch" value={batch} />}
				{status && <input type="hidden" name="status" value={status} />}
				<Button type="submit" variant="secondary">
					Search
				</Button>
			</form>

			<div className="flex flex-wrap gap-2">
				{STATUSES.map((s) => {
					const on = (status ?? "all") === s.value;
					return (
						<Link
							key={s.value}
							href={href({ status: s.value })}
							aria-pressed={on}
							className={`flex min-h-10 items-center rounded-full border px-4 text-small font-semibold no-underline hover:no-underline ${
								on ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-ink-2 hover:text-ink"
							}`}
						>
							{s.label}
						</Link>
					);
				})}
				<span className="mx-1 w-px self-stretch bg-line" aria-hidden="true" />
				<Link
					href={href({ batch: "all" })}
					aria-pressed={!batch || batch === "all"}
					className={`flex min-h-10 items-center rounded-full border px-4 text-small font-semibold no-underline hover:no-underline ${
						!batch || batch === "all"
							? "border-brand bg-brand-soft text-brand"
							: "border-line bg-surface text-ink-2 hover:text-ink"
					}`}
				>
					All batches
				</Link>
				{data.batches.map((b) => {
					const on = batch === b.name;
					return (
						<Link
							key={b.id}
							href={href({ batch: b.name })}
							aria-pressed={on}
							className={`flex min-h-10 items-center rounded-full border px-4 text-small font-semibold no-underline hover:no-underline ${
								on ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-ink-2 hover:text-ink"
							}`}
						>
							{b.name}
						</Link>
					);
				})}
			</div>

			{data.rows.length === 0 ? (
				<EmptyState
					icon="🔍"
					title="No students match that"
					action={
						<Button variant="secondary" asChild>
							<Link href="/admin/students">Clear the filters</Link>
						</Button>
					}
				>
					Try a shorter search, or clear the filters and start again.
				</EmptyState>
			) : (
				<TableCard>
					<TableToolbar>
						<span className="text-small text-ink-2">
							{data.total} {data.total === 1 ? "student" : "students"}
							{data.total > data.rows.length ? ` · showing the first ${data.rows.length}` : ""}
						</span>
					</TableToolbar>

					<Table>
						<TableHeader sticky>
							<TableRow>
								<TableHead>Student</TableHead>
								<TableHead>Batch</TableHead>
								<TableHead>Plan</TableHead>
								<TableHead className="text-right">Last band</TableHead>
								<TableHead className="text-right">Tests</TableHead>
								<TableHead>Last active</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data.rows.map((s) => (
								<TableRow key={s.id}>
									<TableCell>
										<Link href={`/admin/students/${s.id}`} className="font-semibold">
											{s.name}
										</Link>
										<div className="font-mono text-small text-ink-2">{s.phone}</div>
									</TableCell>
									<TableCell className="text-ink-2">{s.batchName ?? "—"}</TableCell>
									<TableCell>
										<PlanPill state={s.planState} days={s.daysRemaining} endsLabel={s.planEndsLabel} />
									</TableCell>
									<TableCell className="text-right font-mono">
										{s.lastBand === null ? <span className="text-ink-3">—</span> : formatBand(s.lastBand)}
									</TableCell>
									<TableCell className="text-right font-mono">{s.testsTaken}</TableCell>
									<TableCell className="text-ink-2">{s.lastActiveLabel}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>

					{data.total > data.rows.length && (
						<TablePagination>
							<span className="text-small text-ink-2">
								Showing 1–{data.rows.length} of {data.total}
							</span>
						</TablePagination>
					)}
				</TableCard>
			)}
		</div>
	);
}

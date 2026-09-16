import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { SKILL_LABEL } from "@/components/student/labels";
import { getStudentDetail } from "@/lib/mock/admin";

export const metadata: Metadata = { title: "Student" };

/** A titled block of history. All three timelines on this screen share it. */
function Timeline({
	title,
	empty,
	rows,
}: {
	title: string;
	empty: string;
	rows: { id: string; whenLabel: string; lead: string; detail: string }[];
}) {
	return (
		<section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
			<h2 className="m-0 text-h3">{title}</h2>
			{rows.length === 0 ? (
				<p className="m-0 text-ink-2">{empty}</p>
			) : (
				<ul className="m-0 flex list-none flex-col gap-0 p-0">
					{rows.map((r) => (
						<li key={r.id} className="flex flex-wrap gap-x-3 border-b border-line py-3 last:border-b-0">
							<span className="w-[150px] flex-none font-mono text-small text-ink-2">{r.whenLabel}</span>
							<span className="min-w-0 flex-1">
								<strong className="font-semibold">{r.lead}</strong>
								{r.detail ? ` — ${r.detail}` : ""}
							</span>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}

/**
 * Screen 23 — Student detail (M5-05).
 *
 * The design calls this a drawer; it is a **page** with its own URL instead.
 * Staff open it mid-support-call and read the link out or paste it to a
 * colleague, and a drawer has no address. It keeps the drawer's content and
 * ordering — plan first, because that is what the call is almost always about.
 *
 * The destructive actions (reset PIN, change phone) are listed but inert until
 * their Server Actions land in M1/M5; each one will name what it changes before
 * it does it.
 */
export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const data = await getStudentDetail(id);
	if (!data) notFound();

	const { student: s } = data;

	return (
		<div className="flex flex-col gap-6">
			<Link href="/admin/students" className="font-semibold">
				← Back to students
			</Link>

			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="flex flex-col gap-1">
					<h1 className="m-0 text-h1">{s.name}</h1>
					<span className="font-mono text-ink-2">{s.phone}</span>
				</div>
				<div className="flex flex-wrap gap-3">
					<Button variant="secondary">Reset PIN</Button>
					<Button variant="secondary">Change phone number</Button>
					<Button asChild>
						<Link href={`/admin/plans?student=${s.id}`}>Extend plan</Link>
					</Button>
				</div>
			</div>

			<section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<div className="flex flex-col gap-1.5 rounded-card border border-line bg-surface p-6">
					<span className="text-small text-ink-2">Plan</span>
					<StatusPill
						status={s.planState === "expired" ? "expired" : s.planState === "expiring" ? "expiring" : "active"}
						size="sm"
						label={
							s.planState === "expired"
								? `Ended ${s.planEndsLabel}`
								: `${s.daysRemaining} days left`
						}
					/>
					<span className="font-mono text-small text-ink-2">Ends {s.planEndsLabel}</span>
				</div>
				<div className="flex flex-col gap-1.5 rounded-card border border-line bg-surface p-6">
					<span className="text-small text-ink-2">Batch</span>
					<span className="text-h3">{s.batchName ?? "Not in a batch"}</span>
				</div>
				<div className="flex flex-col gap-1.5 rounded-card border border-line bg-surface p-6">
					<span className="text-small text-ink-2">Tests taken</span>
					<span className="font-mono text-display">{s.testsTaken}</span>
				</div>
				<div className="flex flex-col gap-1.5 rounded-card border border-line bg-surface p-6">
					<span className="text-small text-ink-2">Last active</span>
					<span className="text-h3">{s.lastActiveLabel}</span>
				</div>
			</section>

			<section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
				<h2 className="m-0 text-h3">Attempts</h2>
				<ul className="m-0 flex list-none flex-col gap-0 p-0">
					{data.attempts.map((a) => (
						<li
							key={a.attemptId}
							className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line py-3 last:border-b-0"
						>
							<span className="w-[120px] flex-none font-mono text-small text-ink-2">{a.whenLabel}</span>
							<span className="min-w-[220px] flex-1 font-semibold">{a.testTitle}</span>
							<span className="text-small text-ink-2">{SKILL_LABEL[a.skill]}</span>
							<span className={`font-mono ${a.band === null ? "text-ink-2" : "font-medium"}`}>
								{a.bandLabel}
							</span>
						</li>
					))}
				</ul>
			</section>

			<Timeline
				title="Plan history"
				empty="No changes yet."
				rows={data.planHistory.map((p) => ({
					id: p.id,
					whenLabel: p.whenLabel,
					lead: `${p.action} by ${p.actor}`,
					detail: p.detail,
				}))}
			/>

			<Timeline
				title="Everything that has changed"
				empty="Nothing recorded yet."
				rows={data.auditTrail.map((a) => ({
					id: a.id,
					whenLabel: a.whenLabel,
					lead: a.actor,
					detail: a.summary,
				}))}
			/>
		</div>
	);
}

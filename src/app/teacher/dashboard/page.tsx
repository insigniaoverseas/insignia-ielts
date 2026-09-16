import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { formatBand } from "@/components/ui/band-score";
import { SKILL_LABEL } from "@/components/student/labels";
import { getTeacherDashboard } from "@/lib/queries/teacher";

export const metadata: Metadata = { title: "Dashboard" };

/** What each kind of attention item looks like, so the list scans by shape. */
const KIND: Record<string, { glyph: string; tone: string; action: string }> = {
	release: { glyph: "✓", tone: "text-brand", action: "Release them" },
	override: { glyph: "!", tone: "text-warning", action: "Take a look" },
	expiring: { glyph: "⏳", tone: "text-warning", action: "See the batch" },
};

/**
 * Screen 14 — Teacher dashboard (M6-01).
 *
 * Three questions, in the order a teacher asks them at 9am: what is running
 * today, what is waiting on me, and how are my batches doing. Every item in
 * "needs attention" links somewhere — a list of problems with no destination
 * only makes people feel behind.
 */
export default async function TeacherDashboardPage() {
	const data = await getTeacherDashboard();

	return (
		<div className="flex flex-col gap-6">
			<h1 className="m-0 text-h1">Hello, {data.teacherName}</h1>

			{data.todaysTests.length > 0 && (
				<section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
					<h2 className="m-0 text-h3">Today</h2>
					<ul className="m-0 flex list-none flex-col gap-0 p-0">
						{data.todaysTests.map((t) => (
							<li
								key={t.assignmentId}
								className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line py-3 last:border-b-0"
							>
								<span className="min-w-[220px] flex-1">
									<span className="font-semibold">{t.testTitle}</span>
									<span className="block text-small text-ink-2">
										{SKILL_LABEL[t.skill]} · {t.batchName}
									</span>
								</span>
								<span className="text-ink-2">{t.whenLabel}</span>
								{t.liveSessionId ? (
									<Button asChild>
										<Link href={`/teacher/live/${t.liveSessionId}`}>Watch the room</Link>
									</Button>
								) : (
									<StatusPill status="not_started" size="sm" label="Not started" />
								)}
							</li>
						))}
					</ul>
				</section>
			)}

			{data.needsAttention.length > 0 && (
				<section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
					<h2 className="m-0 text-h3">Needs you</h2>
					<ul className="m-0 flex list-none flex-col gap-0 p-0">
						{data.needsAttention.map((n) => {
							const k = KIND[n.kind] ?? KIND.release;
							return (
								<li
									key={n.id}
									className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line py-3 last:border-b-0"
								>
									<span className={`font-bold ${k.tone}`} aria-hidden="true">
										{k.glyph}
									</span>
									<span className="min-w-[240px] flex-1">{n.summary}</span>
									<Button variant="secondary" asChild>
										<Link href={n.href}>{k.action}</Link>
									</Button>
								</li>
							);
						})}
					</ul>
				</section>
			)}

			<section className="flex flex-col gap-4">
				<h2 className="m-0 text-h3">My batches</h2>
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{data.batches.map((b) => (
						<div key={b.id} className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
							<div className="flex flex-col gap-1">
								<Link href={`/teacher/batches/${b.id}`} className="text-h3">
									{b.name}
								</Link>
								<span className="text-small text-ink-2">
									{b.studentCount} {b.studentCount === 1 ? "student" : "students"}
								</span>
							</div>

							<div className="flex items-end gap-6">
								<div className="flex flex-col gap-0.5">
									<span className="font-mono text-display">
										{b.averageBand === null ? "—" : formatBand(b.averageBand)}
									</span>
									<span className="text-small text-ink-2">average band</span>
								</div>
								{b.awaitingRelease > 0 && (
									<StatusPill status="expiring" size="sm" label={`${b.awaitingRelease} to release`} />
								)}
							</div>

							<div className="flex flex-wrap gap-2">
								<Button variant="secondary" asChild>
									<Link href={`/teacher/batches/${b.id}`}>Roster</Link>
								</Button>
								<Button variant="secondary" asChild>
									<Link href={`/teacher/batches/${b.id}/analytics`}>What to teach</Link>
								</Button>
							</div>
						</div>
					))}
				</div>
			</section>
		</div>
	);
}

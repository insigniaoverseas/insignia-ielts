import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { ExtendPlansPanel } from "@/components/staff/extend-plans-panel";
import { requirePermissionOrRedirect } from "@/lib/auth/guard";
import { getPlansWorkqueue } from "@/lib/queries/admin";

export const metadata: Metadata = { title: "Plans & validity" };

/**
 * Screen 24 — Plans & validity (M5-06). The expiry workqueue.
 *
 * Grouped Expired / this week / this month rather than one sortable table,
 * because the three groups are three different jobs: apologise, act, and plan.
 * Sorting a single list makes staff re-derive that split every time they open
 * the screen.
 *
 * The extend flow is in `ExtendPlansPanel` — it needs selection state, and the
 * confirm step has to state exactly what will change before it changes it.
 */
export default async function PlansPage() {
	await requirePermissionOrRedirect("student:manage", "/admin/plans");
	const data = await getPlansWorkqueue();
	const empty =
		data.expired.length === 0 && data.expiringThisWeek.length === 0 && data.expiringThisMonth.length === 0;

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="m-0 text-h1">Plans &amp; validity</h1>
				<p className="m-0 text-ink-2">
					Extend before a student is locked out. A student whose plan lapses cannot start a test, even in the
					lab.
				</p>
			</div>

			{empty ? (
				<EmptyState
					icon="✓"
					title="Nothing expiring"
					action={
						<Link
							href="/admin/students"
							className="flex min-h-10 items-center rounded-control border border-line bg-surface px-5 font-semibold text-ink no-underline hover:border-ink-3 hover:no-underline"
						>
							See all students
						</Link>
					}
				>
					No plan ends in the next month. Check back next week.
				</EmptyState>
			) : (
				<div className="flex flex-col gap-8">
					<ExtendPlansPanel
						title="Expired"
						note="These students cannot start a test right now."
						tone="danger"
						rows={data.expired}
					/>
					<ExtendPlansPanel
						title="Expiring this week"
						note="Act on these before the weekend."
						tone="warning"
						rows={data.expiringThisWeek}
					/>
					<ExtendPlansPanel
						title="Expiring this month"
						note="No rush, but worth a look."
						tone="neutral"
						rows={data.expiringThisMonth}
					/>
				</div>
			)}
		</div>
	);
}

import type { Metadata } from "next";
import Link from "next/link";
import { StatusPill } from "@/components/ui/status-pill";
import { LogOutButton } from "@/components/student/log-out-button";
import { PlanBanner } from "@/components/student/plan-banner";
import { getStudentProfile, type Scenario } from "@/lib/mock/student";

export const metadata: Metadata = { title: "Profile" };

/** One label/value row in the details card. */
function Row({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line py-4 last:border-b-0">
			<span className="text-ink-2">{label}</span>
			<span className="font-semibold">{value}</span>
		</div>
	);
}

/**
 * Screen 13 — Profile (M4-06).
 *
 * Name, phone, batch, teacher, plan validity, change PIN, log out. Nothing
 * else — this screen exists to answer "when does my access end?" and "who do I
 * ask?", which are the two things students actually come here for.
 *
 * The plan bar shows time *used*, not time left, so a nearly-full bar reads as
 * "act now" at a glance; the date beside it is what they'll quote to a teacher.
 */
export default async function ProfilePage({
	searchParams,
}: {
	searchParams: Promise<{ state?: string }>;
}) {
	const { state } = await searchParams;
	const { student, plan, devices } = await getStudentProfile((state as Scenario) ?? "default");

	return (
		<div className="flex flex-col gap-6">
			<h1 className="m-0 text-[1.75rem] leading-9 font-bold md:text-h1">Profile</h1>

			<PlanBanner plan={plan} />

			<section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
				<div className="flex items-center gap-4">
					<span
						className="grid size-14 flex-none place-items-center rounded-full bg-brand-soft text-h1 font-bold text-brand"
						aria-hidden="true"
					>
						{student.firstName.charAt(0)}
					</span>
					<div className="flex flex-col">
						<span className="text-h2">{student.fullName}</span>
						<span className="font-mono text-ink-2">{student.phone}</span>
					</div>
				</div>

				<div className="flex flex-col">
					<Row label="Batch" value={student.batchName ?? "Not in a batch yet"} />
					<Row label="Your teacher" value={student.teacherName ?? "Ask at the front desk"} />
					<Row label="Centre" value={student.branchName} />
				</div>
			</section>

			<section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<h2 className="m-0 text-h3">Your access</h2>
					<StatusPill
						status={plan.state === "expired" ? "expired" : plan.state === "expiring" ? "expiring" : "active"}
						size="sm"
						label={
							plan.state === "expired"
								? "Ended"
								: plan.state === "expiring"
									? `${plan.daysRemaining} days left`
									: "Active"
						}
					/>
				</div>

				<p className="m-0 text-ink-2">
					{plan.state === "expired" ? "Your access ended on " : "Your access ends on "}
					<strong className="font-semibold text-ink">{plan.endsOnLabel}</strong>.
				</p>

				<div
					className="h-3 overflow-hidden rounded-full bg-bg"
					role="progressbar"
					aria-label="How much of your access you have used"
					aria-valuenow={plan.percentUsed}
					aria-valuemin={0}
					aria-valuemax={100}
				>
					<div
						className={`h-full rounded-full ${
							plan.state === "expired" ? "bg-danger" : plan.state === "expiring" ? "bg-warning" : "bg-success"
						}`}
						style={{ width: `${plan.percentUsed}%` }}
					/>
				</div>
				<p className="m-0 text-small text-ink-2">{plan.percentUsed}% of your time used</p>
			</section>

			{devices.length > 0 && (
				<section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
					<div className="flex flex-col gap-1">
						<h2 className="m-0 text-h3">Where you&rsquo;re logged in</h2>
						<p className="m-0 text-ink-2">
							If you don&rsquo;t recognise one of these, change your PIN and tell your teacher.
						</p>
					</div>
					<ul className="m-0 flex list-none flex-col gap-0 p-0">
						{devices.map((d) => (
							<li
								key={d.id}
								className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-4 last:border-b-0"
							>
								<span className="flex flex-col">
									<span className="font-semibold">{d.label}</span>
									<span className="text-small text-ink-2">Last used {d.lastUsedLabel}</span>
								</span>
								{d.current && <StatusPill status="active" size="sm" label="This device" />}
							</li>
						))}
					</ul>
				</section>
			)}

			<div className="flex flex-col gap-3">
				<Link
					href="/profile/pin"
					className="flex h-primary items-center justify-center rounded-control bg-brand text-h3 font-semibold text-white no-underline hover:bg-brand-hover hover:no-underline"
				>
					Change my PIN
				</Link>
				<LogOutButton />
			</div>
		</div>
	);
}

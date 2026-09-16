import type { Metadata } from "next";
import Link from "next/link";
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
import { getAuditLog } from "@/lib/mock/admin";

export const metadata: Metadata = { title: "Audit log" };

/**
 * Screen 29 — Audit log (M9-02).
 *
 * Who, what, when, and the detail that makes it mean something — an extension
 * without its reason, or a mark change without its note, answers none of the
 * questions this screen gets opened for.
 *
 * `actorName` can be null. Staff accounts can be erased (DPDP, M9-08) but the
 * trail must not disappear with them, which is why `audit_log` keeps actor ids
 * **without a foreign key** (`PROJECT-MEMORY.md` §4, M0-10). A deleted actor
 * shows as "Account deleted", never as a blank.
 */
export default async function AuditPage({
	searchParams,
}: {
	searchParams: Promise<{ action?: string }>;
}) {
	const { action } = await searchParams;
	const data = await getAuditLog({ action });

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="m-0 text-h1">Audit log</h1>
				<p className="m-0 text-ink-2">Everything that changed a student&rsquo;s access, marks or results.</p>
			</div>

			<div className="flex flex-wrap gap-2">
				{[{ value: "all", label: "Everything" }, ...data.actions].map((a) => {
					const on = (action ?? "all") === a.value;
					return (
						<Link
							key={a.value}
							href={a.value === "all" ? "/admin/audit" : `/admin/audit?action=${a.value}`}
							aria-pressed={on}
							className={`flex min-h-10 items-center rounded-full border px-4 text-small font-semibold no-underline hover:no-underline ${
								on ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-ink-2 hover:text-ink"
							}`}
						>
							{a.label}
						</Link>
					);
				})}
			</div>

			<TableCard>
				<TableToolbar>
					<span className="text-small text-ink-2">
						{data.total} {data.total === 1 ? "entry" : "entries"}
					</span>
				</TableToolbar>
				<Table>
					<TableHeader sticky>
						<TableRow>
							<TableHead>When</TableHead>
							<TableHead>Who</TableHead>
							<TableHead>What</TableHead>
							<TableHead>Which</TableHead>
							<TableHead>Detail</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.entries.map((e) => (
							<TableRow key={e.id}>
								<TableCell className="font-mono text-small whitespace-nowrap text-ink-2">
									{e.whenLabel}
								</TableCell>
								<TableCell>
									{e.actorName === null ? (
										// The trail outlives the account, on purpose.
										<span className="text-ink-3">Account deleted</span>
									) : (
										<>
											<span className="font-semibold">{e.actorName}</span>
											<div className="text-small text-ink-2">{e.actorRole}</div>
										</>
									)}
								</TableCell>
								<TableCell className="font-semibold">{e.actionLabel}</TableCell>
								<TableCell className="text-ink-2">{e.target}</TableCell>
								<TableCell className="text-ink-2">{e.detail}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableCard>
		</div>
	);
}

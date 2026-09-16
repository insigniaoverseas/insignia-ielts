import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import { requirePermissionOrRedirect } from "@/lib/auth/guard";
import { getUsersAndRoles } from "@/lib/queries/admin";

export const metadata: Metadata = { title: "Users & roles" };

/** How a scope reads to someone who has never seen the word "scope". */
const SCOPE_LABEL: Record<string, string> = {
	all: "Everywhere",
	branch: "Their centre",
	batch: "Their batches",
	own: "Their own",
};

/**
 * Screen 28 — Users & roles (M9-03).
 *
 * The matrix is **read from `roles.permissions`**, not hardcoded here. That
 * matters: the permissions in the database are what `lib/rbac.ts` actually
 * enforces, so a grid drawn from anything else would eventually lie — and a
 * permissions screen that lies is worse than none.
 *
 * Cells say *where* a permission applies, not just whether — "Their centre" is
 * a different answer from "Everywhere", and both are different from "No".
 */
export default async function UsersPage() {
	await requirePermissionOrRedirect("staff:manage", "/admin/users");
	const data = await getUsersAndRoles();

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="m-0 text-h1">Users &amp; roles</h1>
				<Button asChild>
					<Link href="/admin/users/new">Invite a colleague</Link>
				</Button>
			</div>

			<TableCard>
				<TableToolbar>
					{/* Counted from the rows on screen, so the summary can't disagree
					    with the list under it. */}
					<span className="text-small text-ink-2">
						{data.users.length} staff accounts ·{" "}
						{data.roles
							.map((r) => ({ r, n: data.users.filter((u) => u.roleKey === r.key).length }))
							.filter(({ n }) => n > 0)
							.map(({ r, n }) => `${n} ${r.label.toLowerCase()}${n === 1 ? "" : "s"}`)
							.join(" · ")}
					</span>
				</TableToolbar>
				<Table>
					<TableHeader sticky>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Role</TableHead>
							<TableHead>Centre</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Last active</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.users.map((u) => (
							<TableRow key={u.id}>
								<TableCell>
									<span className="font-semibold">{u.name}</span>
									<div className="text-small text-ink-2">{u.email}</div>
								</TableCell>
								<TableCell>
									<span className="rounded-full bg-brand-soft px-3 py-1 text-small font-semibold text-brand">
										{u.roleLabel}
									</span>
								</TableCell>
								<TableCell className="text-ink-2">{u.branchName}</TableCell>
								<TableCell>
									{u.status === "active" ? (
										<StatusPill status="active" size="sm" />
									) : (
										<StatusPill status="locked" size="sm" label={u.status === "inactive" ? "Deactivated" : "Suspended"} />
									)}
								</TableCell>
								<TableCell className="text-ink-2">{u.lastActiveLabel}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableCard>

			<TableCard>
				<TableToolbar>
					<div className="flex flex-col gap-1">
						<h2 className="m-0 text-h3">What each role can do</h2>
						<p className="m-0 text-small text-ink-2">
							Read from the database, so this is what the app actually enforces.
						</p>
					</div>
				</TableToolbar>
				<Table>
					<TableHeader sticky>
						<TableRow>
							<TableHead>Can…</TableHead>
							{data.roles.map((r) => (
								<TableHead key={r.key} className="text-center">
									{r.label}
								</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.matrix.map((row) => (
							<TableRow key={row.permission}>
								<TableCell>
									<span className="font-semibold">{row.label}</span>
									<div className="font-mono text-small text-ink-3">{row.permission}</div>
								</TableCell>
								{data.roles.map((r) => {
									const scope = row.byRole[r.key] ?? null;
									return (
										<TableCell key={r.key} className="text-center">
											{scope ? (
												<span className="inline-flex items-center gap-1.5 text-small font-semibold text-success">
													<span aria-hidden="true">✓</span>
													{SCOPE_LABEL[scope] ?? scope}
												</span>
											) : (
												// A word, not a blank cell — an empty cell reads as "not filled in".
												<span className="text-small text-ink-3">
													<span aria-hidden="true">—</span> No
												</span>
											)}
										</TableCell>
									);
								})}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableCard>
		</div>
	);
}

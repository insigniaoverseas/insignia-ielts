import type { Metadata } from "next";
import Link from "next/link";

import { InviteColleagueForm, type InvitableRole } from "@/components/admin/invite-colleague-form";
import { requirePermissionOrRedirect } from "@/lib/auth/guard";
import { canInviteRole } from "@/lib/permissions";
import { listBranchOptions } from "@/lib/queries/batches";

export const metadata: Metadata = { title: "Invite a colleague" };

/**
 * The staff roles an invitation can grant, in the order an admin thinks of
 * them — least reach first, so "Admin" is a deliberate scroll rather than the
 * default sitting under the cursor.
 *
 * `super_admin` is absent by design: nobody becomes Owner through the app
 * (`lib/permissions.ts`), so offering it could only ever produce a refusal.
 */
const STAFF_ROLES: InvitableRole[] = [
	{
		key: "invigilator",
		label: "Invigilator",
		description: "Watches tests in progress. Cannot create tests, change results or see other centres.",
	},
	{
		key: "teacher",
		label: "Teacher",
		description: "Runs batches, assigns tests and sees their own students' results.",
	},
	{
		key: "admin",
		label: "Admin",
		description: "Everything at this centre, including students, staff and plans. Give this one sparingly.",
	},
];

/**
 * Screen 28a — invite a colleague (M5-04).
 *
 * The button on screen 28 has linked here since the screen was designed; the
 * page itself was never built, so "Invite a colleague" was a 404 and there was
 * no way to add staff at all. `inviteAction` already handled staff roles — only
 * the screen was missing.
 *
 * Guarded on `staff:manage`, which is the floor for inviting anybody here. The
 * *admin* role additionally needs `admin:manage`, so the list is filtered per
 * role rather than gated once at the door: an admin who cannot create another
 * admin can still invite a teacher.
 */
export default async function NewColleaguePage() {
	const actor = await requirePermissionOrRedirect("staff:manage", "/admin/users/new");
	const roles = STAFF_ROLES.filter((role) => canInviteRole(actor, role.key));
	const branches = await listBranchOptions();

	return (
		<div className="flex max-w-[640px] flex-col gap-6">
			<Link href="/admin/users" className="font-semibold">
				← Back to users &amp; roles
			</Link>

			<div className="flex flex-col gap-1">
				<h1 className="m-0 text-h1">Invite a colleague</h1>
				<p className="m-0 text-ink-2">
					They&rsquo;ll get a link to choose their own password. Nothing is active until they accept.
				</p>
			</div>

			<InviteColleagueForm roles={roles} branches={branches} />
		</div>
	);
}

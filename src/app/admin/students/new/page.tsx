import type { Metadata } from "next";
import Link from "next/link";

import { InviteStudentForm } from "@/components/admin/invite-student-form";
import { requirePermissionOrRedirect } from "@/lib/auth/guard";
import { listBatchOptions } from "@/lib/queries/batches";

export const metadata: Metadata = { title: "Invite a student" };

/**
 * Screen 22a — invite one student (M5-04, wired to the server in M1-02).
 *
 * Called "Invite", not "Add": there is no public signup, so every account
 * starts as an admin invitation (`CLAUDE.md` rule 7), and the account does not
 * exist until the student accepts.
 *
 * Guarded on `student:manage` — admins hold it in `branch` scope, the Owner in
 * `all`. The guard protects the *screen*; `inviteAction` checks again for
 * itself, because a Server Action is a public endpoint and a page guard does
 * not stand between the browser and it.
 */
export default async function NewStudentPage() {
	await requirePermissionOrRedirect("student:manage", "/admin/students/new");
	const batches = await listBatchOptions();

	return (
		<div className="flex max-w-[640px] flex-col gap-6">
			<Link href="/admin/students" className="font-semibold">
				← Back to students
			</Link>

			<div className="flex flex-col gap-1">
				<h1 className="m-0 text-h1">Invite a student</h1>
				<p className="m-0 text-ink-2">
					They&rsquo;ll get a link to choose their own password. Nothing is active until they accept.
				</p>
			</div>

			<InviteStudentForm batches={batches} />
		</div>
	);
}

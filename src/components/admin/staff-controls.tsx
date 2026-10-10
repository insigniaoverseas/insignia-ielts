"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import {
	changeStaffRoleAction,
	resendStaffInvitationAction,
	revokeStaffInvitationAction,
	setStaffActiveAction,
} from "@/lib/actions/staff";

type Result = { ok: boolean; message: string } | null;

/** The result line under a control. */
function Said({ result }: { result: Result }) {
	if (!result) return null;
	return (
		<p className={`m-0 text-small font-semibold ${result.ok ? "text-success" : "text-danger"}`} role="status">
			{result.message}
		</p>
	);
}

/**
 * One staff member's controls on screen 28 (M9-03): suspend or reactivate, and
 * — for the Owner — change role. Shown only when the server would allow them;
 * the server checks again regardless.
 */
export function StaffRowControls({
	userId,
	name,
	status,
	roleKey,
	canManage,
	roleChoices,
}: {
	userId: string;
	name: string;
	status: "active" | "suspended" | "inactive";
	roleKey: string;
	canManage: boolean;
	/** Roles the Owner may move them to; empty when the viewer can't change roles. */
	roleChoices: { key: string; label: string }[];
}) {
	const [dialog, setDialog] = useState<"status" | "role" | null>(null);
	const [role, setRole] = useState(roleKey);
	const [result, setResult] = useState<Result>(null);
	const [pending, startTransition] = useTransition();
	const active = status === "active";

	function run(action: () => Promise<Result>) {
		startTransition(async () => {
			setResult(await action());
			setDialog(null);
		});
	}

	if (!canManage && roleChoices.length === 0) return <span className="text-ink-3">—</span>;
	const newRoleLabel = roleChoices.find((r) => r.key === role)?.label ?? role;

	return (
		<div className="flex flex-col items-start gap-1.5">
			<div className="flex flex-wrap items-center gap-2">
				{canManage && (
					<Button variant="secondary" onClick={() => setDialog("status")}>
						{active ? "Suspend" : "Reactivate"}
					</Button>
				)}
				{roleChoices.length > 0 && (
					<>
						<select
							aria-label={`Role for ${name}`}
							value={role}
							onChange={(e) => setRole(e.target.value)}
							className="h-10 rounded-control border border-line bg-surface px-3 text-body"
						>
							{roleChoices.map((r) => (
								<option key={r.key} value={r.key}>
									{r.label}
								</option>
							))}
						</select>
						{role !== roleKey && (
							<Button variant="secondary" onClick={() => setDialog("role")}>
								Change role
							</Button>
						)}
					</>
				)}
			</div>
			<Said result={result} />

			<ConfirmDialog
				open={dialog === "status"}
				onOpenChange={(o) => setDialog(o ? "status" : null)}
				destructive={active}
				loading={pending}
				title={active ? `Suspend ${name}?` : `Let ${name} sign in again?`}
				description={
					active
						? "They are signed out everywhere straight away and can't sign in until you reactivate them. Nothing they made is deleted."
						: "They can sign in with their own password again."
				}
				confirmLabel={active ? "Yes, suspend" : "Reactivate"}
				cancelLabel="Cancel"
				onConfirm={() => run(() => setStaffActiveAction(userId, !active))}
			/>
			<ConfirmDialog
				open={dialog === "role"}
				onOpenChange={(o) => setDialog(o ? "role" : null)}
				loading={pending}
				title={`Make ${name} ${/^[aeiou]/i.test(newRoleLabel) ? "an" : "a"} ${newRoleLabel.toLowerCase()}?`}
				description="What they can see and do changes the next time they open a page. This is recorded with your name."
				confirmLabel="Change role"
				cancelLabel="Cancel"
				onConfirm={() => run(() => changeStaffRoleAction(userId, role))}
			/>
		</div>
	);
}

/** Resend or cancel one pending staff invitation. */
export function PendingInviteControls({ invitationId, email }: { invitationId: string; email: string }) {
	const [dialog, setDialog] = useState<"resend" | "revoke" | null>(null);
	const [result, setResult] = useState<Result>(null);
	const [pending, startTransition] = useTransition();

	function run(action: () => Promise<Result>) {
		startTransition(async () => {
			setResult(await action());
			setDialog(null);
		});
	}

	return (
		<div className="flex flex-col items-start gap-1.5">
			<div className="flex flex-wrap gap-2">
				<Button variant="secondary" onClick={() => setDialog("resend")}>
					Send again
				</Button>
				<Button variant="secondary" onClick={() => setDialog("revoke")}>
					Cancel invitation
				</Button>
			</div>
			<Said result={result} />
			<ConfirmDialog
				open={dialog === "resend"}
				onOpenChange={(o) => setDialog(o ? "resend" : null)}
				loading={pending}
				title="Send the invitation again?"
				description={`A fresh link goes to ${email}. The old link stops working.`}
				confirmLabel="Send again"
				cancelLabel="Not now"
				onConfirm={() => run(() => resendStaffInvitationAction(invitationId))}
			/>
			<ConfirmDialog
				open={dialog === "revoke"}
				onOpenChange={(o) => setDialog(o ? "revoke" : null)}
				destructive
				loading={pending}
				title="Cancel this invitation?"
				description={`The link sent to ${email} stops working. You can invite them again later.`}
				confirmLabel="Cancel it"
				cancelLabel="Keep it"
				onConfirm={() => run(() => revokeStaffInvitationAction(invitationId))}
			/>
		</div>
	);
}

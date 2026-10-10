import "server-only";

import { recordAudit } from "@/lib/audit";
import { canAssignRole, canInviteRole, scopeOf, type Actor } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Managing staff accounts on screen 28 (M9-03): suspend, reactivate, change role.
 *
 * Every rule is checked here, on the server, against the **target**:
 *
 * - Suspending or reactivating someone needs the permission that would let you
 *   invite them (`canInviteRole`): teachers and invigilators need
 *   `staff:manage`, admins need `admin:manage`. Nobody can act on the Owner or
 *   on themselves.
 * - Changing a role needs `role:change` (the Owner) for the role being given
 *   (`canAssignRole`), only between staff roles, never on yourself.
 * - Outside `all` scope, only staff at your own centre.
 *
 * The target is read through the actor's RLS client first; writes go through
 * the secret key (`users` is read-only to API roles) and are audited.
 */

type Outcome = { ok: true; message: string } | { ok: false; message: string };

const STAFF_ROLES = new Set(["teacher", "invigilator", "admin"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function staffTarget(actor: Actor, userId: string) {
	if (!UUID.test(userId)) return { ok: false, message: "That person couldn't be found." } as const;
	if (userId === actor.id) return { ok: false, message: "You can't change your own account here." } as const;
	const { data, error } = await (await createClient())
		.from("users")
		.select("id, name, branch_id, status, roles ( key )")
		.eq("id", userId)
		.maybeSingle();
	if (error) throw error;
	const role: string | undefined = data?.roles?.key;
	if (!data || role === undefined || !STAFF_ROLES.has(role)) return { ok: false, message: "That person couldn't be found." } as const;
	return { ok: true, user: data, role } as const;
}

/** Whether the actor may suspend/reactivate someone with `role` at `branchId`. */
function mayManage(actor: Actor, role: string, branchId: string): boolean {
	if (!canInviteRole(actor, role)) return false;
	const permission = role === "admin" ? "admin:manage" : "staff:manage";
	return scopeOf(actor, permission) === "all" || branchId === actor.branchId;
}

/** Suspends (signing them out everywhere) or reactivates a staff account. */
export async function setStaffActive(actor: Actor, userId: string, active: boolean): Promise<Outcome> {
	const target = await staffTarget(actor, userId);
	if (!target.ok) return { ok: false, message: target.message };
	const { user, role } = target;
	if (!mayManage(actor, role, user.branch_id)) return { ok: false, message: "You can't change that person's account." };
	const next = active ? "active" : "suspended";
	if (user.status === next) return { ok: false, message: active ? "They're already active." : "They're already suspended." };

	const admin = createAdminClient();
	const { error } = await admin.from("users").update({ status: next }).eq("id", user.id);
	if (error) {
		console.error("staff status change failed:", error.message);
		return { ok: false, message: "Something went wrong. Nothing was changed." };
	}
	if (!active) {
		// Their JWT stays valid for a while; ending every session record is what
		// puts them out now (and `getActor` refuses a non-active user anyway).
		await admin.from("user_sessions").update({ revoked_at: new Date().toISOString() }).eq("user_id", user.id).is("revoked_at", null);
	}
	await recordAudit({
		actorId: actor.id,
		branchId: user.branch_id,
		action: active ? "user.reactivate" : "user.suspend",
		entity: "user",
		entityId: user.id,
		meta: { role, from: user.status, to: next },
	});
	return {
		ok: true,
		message: active ? `${user.name} can sign in again.` : `${user.name} is suspended and has been signed out everywhere.`,
	};
}

/** Moves a staff member to another staff role. The Owner's call (`role:change`). */
export async function changeStaffRole(actor: Actor, userId: string, newRole: string): Promise<Outcome> {
	if (!STAFF_ROLES.has(newRole)) return { ok: false, message: "Pick teacher, invigilator or admin." };
	if (!canAssignRole(actor, newRole)) return { ok: false, message: "Only the owner can change roles." };
	const target = await staffTarget(actor, userId);
	if (!target.ok) return { ok: false, message: target.message };
	const { user, role } = target;
	if (role === newRole) return { ok: false, message: "They already have that role." };
	if (scopeOf(actor, "role:change") !== "all" && user.branch_id !== actor.branchId) {
		return { ok: false, message: "You can't change that person's account." };
	}

	const admin = createAdminClient();
	const { data: roleRow, error: roleError } = await admin.from("roles").select("id, name").eq("key", newRole).single();
	if (roleError) throw roleError;
	const { error } = await admin.from("users").update({ role_id: roleRow.id }).eq("id", user.id);
	if (error) {
		console.error("role change failed:", error.message);
		return { ok: false, message: "Something went wrong. The role wasn't changed." };
	}
	await recordAudit({
		actorId: actor.id,
		branchId: user.branch_id,
		action: "role.change",
		entity: "user",
		entityId: user.id,
		meta: { from: role, to: newRole },
	});
	return { ok: true, message: `${user.name} is now ${/^[aeiou]/i.test(roleRow.name) ? "an" : "a"} ${roleRow.name.toLowerCase()}.` };
}

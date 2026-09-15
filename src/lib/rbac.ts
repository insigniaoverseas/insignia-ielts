import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { type Actor, type Permission, type Scope, parsePermissions, scopeOf } from "@/lib/permissions";

export { can, canAssignRole, canInviteRole, scopeOf } from "@/lib/permissions";
export type { Actor, Permission, Scope } from "@/lib/permissions";

/**
 * The second, independent gate over RLS (MVP-1 §13). Every privileged Server
 * Action or Route Handler calls {@link requirePermission} *and* still relies
 * on RLS, so one missing policy — or one missing check here — isn't a breach.
 *
 * Independence is deliberate: the actor's role and status are read with the
 * secret-key client, not through the user's own RLS view, so this gate doesn't
 * inherit a mistake in the policies it backs up.
 */

/** Thrown when there's no signed-in active user, or they lack the permission. */
export class ForbiddenError extends Error {
	constructor(readonly reason: "signed_out" | "inactive" | "missing_permission", readonly permission?: Permission) {
		super(reason === "missing_permission" ? `missing permission ${permission}` : reason);
		this.name = "ForbiddenError";
	}
}

/**
 * The signed-in user as an {@link Actor}, or `null` if nobody is signed in or
 * their account isn't `active` (suspended and inactive users hold nothing).
 *
 * Identity comes from `getClaims()` (the verified JWT), never from anything the
 * browser sent. Permissions come from `roles.permissions`.
 */
export async function getActor(): Promise<Actor | null> {
	const supabase = await createClient();
	const { data: auth } = await supabase.auth.getClaims();
	const userId = auth?.claims?.sub;
	if (!userId) return null;

	const { data: row, error } = await createAdminClient()
		.from("users")
		.select("id, branch_id, status, roles ( key, permissions )")
		.eq("id", userId)
		.maybeSingle();
	if (error) throw error;
	if (!row || row.status !== "active" || !row.roles) return null;

	return {
		id: row.id,
		role: row.roles.key,
		branchId: row.branch_id,
		permissions: parsePermissions(row.roles.permissions),
	};
}

/**
 * Resolves the signed-in actor and the scope in which they hold `permission`,
 * or throws {@link ForbiddenError}. The caller must still check the target is
 * inside that scope (their batch, their branch) before acting.
 *
 * @example
 * const { actor, scope } = await requirePermission("results:release");
 * // scope is "batch" for a teacher: confirm they teach the assignment's batch.
 */
export async function requirePermission(permission: Permission): Promise<{ actor: Actor; scope: Scope }> {
	const actor = await getActor();
	if (!actor) throw new ForbiddenError("signed_out");
	const scope = scopeOf(actor, permission);
	if (!scope) throw new ForbiddenError("missing_permission", permission);
	return { actor, scope };
}

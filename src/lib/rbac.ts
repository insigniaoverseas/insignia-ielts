import "server-only";

import { cache } from "react";

import { sessionState } from "@/lib/auth/sessions";
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
export const getActor = cache(async function getActor(): Promise<Actor | null> {
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
});

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
	const actor = await liveActor();
	const scope = scopeOf(actor, permission);
	if (!scope) throw new ForbiddenError("missing_permission", permission);
	return { actor, scope };
}

/**
 * Like {@link requirePermission}, for an action more than one role reaches by
 * a different permission. Passes if the actor holds **any** of `permissions`;
 * the caller still checks the target is in scope.
 */
export async function requireAnyPermission(permissions: readonly Permission[]): Promise<Actor> {
	const actor = await liveActor();
	if (!permissions.some((permission) => scopeOf(actor, permission))) {
		throw new ForbiddenError("missing_permission", permissions[0]);
	}
	return actor;
}

async function liveActor(): Promise<Actor> {
	const actor = await getActor();
	if (!actor) throw new ForbiddenError("signed_out");
	// A revoked device still holds a valid JWT until it expires. Proxy turns it
	// away on every guarded route — but lets a request through if it cannot
	// *read* the session, trusting the page to check again. Server Actions are
	// endpoints with no page around them, so they check here. Memoised per
	// request: a page that already ran `requireUser` pays nothing.
	if ((await sessionState(actor.id)) !== "live") throw new ForbiddenError("signed_out");
	return actor;
}

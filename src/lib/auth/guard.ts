import "server-only";

import { redirect } from "next/navigation";

import { getActor } from "@/lib/rbac";
import { can, type Actor, type Permission } from "@/lib/permissions";
import { endSession, sessionState } from "@/lib/auth/sessions";
import { createClient } from "@/lib/supabase/server";

/**
 * Route guards (M1-13) — the layout-level half of the second gate.
 *
 * `requirePermission` in `lib/rbac.ts` throws, which is right for a Server
 * Action. A page needs the other behaviour: send the visitor somewhere useful.
 * So these redirect, and they are the only place that decides *where*.
 *
 * Both gates still apply underneath. A guard that let something through would
 * still meet RLS, and every privileged action re-checks for itself — a page
 * guard protects the *screen*, not the data (`MVP-1.md` §13).
 */

/**
 * The signed-in, active user, or a redirect to sign in.
 *
 * Also enforces revocation: a student who signed in elsewhere, or a device an
 * admin revoked, still holds a valid JWT until it expires. The session record
 * is what turns them away, and it is checked on every guarded page rather than
 * only at sign-in.
 *
 * @param currentPath Where they were going, so they land there afterwards
 *   instead of on a generic home screen.
 */
export async function requireUser(currentPath?: string): Promise<Actor> {
	const actor = await getActor();

	if (!actor) {
		// A signed-in visitor with no profile row is the bootstrap Owner before
		// setup: `getActor` reports them as nobody, which is correct, but the
		// answer is to finish setting up rather than to sign in again.
		if (await isFirstRunPending()) redirect("/setup");
		redirect(signInPath(currentPath));
	}

	if ((await sessionState(actor.id)) === "revoked") {
		await endSession();
		await (await createClient()).auth.signOut();
		redirect("/login?ended=1");
	}

	return actor;
}

/** The signed-in user, provided they hold `permission`. Otherwise their own home. */
export async function requirePermissionOrRedirect(permission: Permission, currentPath?: string): Promise<Actor> {
	const actor = await requireUser(currentPath);
	if (!can(actor, permission)) redirect(homeFor(actor.role));
	return actor;
}

/** The signed-in user, provided they are staff. Students get their own home. */
export async function requireStaff(currentPath?: string): Promise<Actor> {
	const actor = await requireUser(currentPath);
	if (actor.role === "student") redirect("/home");
	return actor;
}

/**
 * Whether the pinned bootstrap account still needs first-run setup. Everyone
 * else always gets `false` — the database function decides, not this code.
 */
export async function isFirstRunPending(): Promise<boolean> {
	const supabase = await createClient();
	const { data } = await supabase.auth.getClaims();
	if (!data?.claims?.sub) return false;

	const { data: pending } = await supabase.rpc("first_run_pending");
	return pending === true;
}

/** The sign-in URL, carrying where the visitor was heading. */
function signInPath(currentPath?: string): string {
	if (!currentPath || !currentPath.startsWith("/") || currentPath.startsWith("//")) return "/login";
	return `/login?next=${encodeURIComponent(currentPath)}`;
}

/** Where a role belongs when it has strayed somewhere it may not be. */
function homeFor(roleKey: string): string {
	if (roleKey === "super_admin" || roleKey === "admin") return "/admin/overview";
	if (roleKey === "teacher" || roleKey === "invigilator") return "/teacher/dashboard";
	return "/home";
}

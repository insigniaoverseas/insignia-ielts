/**
 * The permission model behind `lib/rbac.ts` — pure data and functions, no
 * secrets and no I/O, so it can be unit-tested and imported anywhere.
 *
 * What each role may do is **data** in `roles.permissions` (seeded by
 * `supabase/migrations/20260915180655_role_permissions.sql`), mapping a
 * permission to the scope it applies in. This file only defines the
 * vocabulary and how to read it. It never decides who has what.
 */

/** Every permission the app checks. A key in `roles.permissions` not listed here is ignored. */
export const PERMISSIONS = [
	"attempt:take", // take assigned tests and practice
	"session:invigilate", // extra time, force submit, unlock during a live session
	"assignment:manage", // assign tests, edit assignments
	"results:release", // release (or schedule) results
	"mark:override", // change a mark after scoring
	"test:author", // create and edit draft tests and answer keys
	"test:publish", // publish a test to the library
	"band_scale:edit", // edit band conversion tables
	"student:manage", // invite students; manage plans and batches
	"staff:manage", // invite and deactivate teachers and invigilators
	"admin:manage", // invite and deactivate admins — Owner only
	"role:change", // change a user's role — Owner only
	"audit:read", // read the audit log
] as const;

/** One of {@link PERMISSIONS}. */
export type Permission = (typeof PERMISSIONS)[number];

/**
 * Where a permission applies. `own`: the user's own records. `batch`: batches
 * they teach. `branch`: their branch. `all`: everywhere.
 */
export const SCOPES = ["own", "batch", "branch", "all"] as const;

/** One of {@link SCOPES}. */
export type Scope = (typeof SCOPES)[number];

/** A role's permissions, as read from `roles.permissions`. Missing key = not allowed. */
export type PermissionMap = Partial<Record<Permission, Scope>>;

/** The signed-in, **active** user as `lib/rbac.ts` sees them. */
export type Actor = {
	id: string;
	/** `roles.key`, e.g. `teacher`. `super_admin` is shown as "Owner". */
	role: string;
	branchId: string;
	permissions: PermissionMap;
};

const isPermission = (key: string): key is Permission => (PERMISSIONS as readonly string[]).includes(key);
const isScope = (value: unknown): value is Scope => (SCOPES as readonly unknown[]).includes(value);

/**
 * Reads `roles.permissions` into a {@link PermissionMap}. Fails closed: anything
 * that isn't a known permission with a valid scope is dropped, and a
 * non-object yields no permissions at all.
 */
export function parsePermissions(raw: unknown): PermissionMap {
	if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
	const map: PermissionMap = {};
	for (const [key, value] of Object.entries(raw)) {
		if (isPermission(key) && isScope(value)) map[key] = value;
	}
	return map;
}

/** The scope in which `actor` holds `permission`, or `null` if they don't. */
export function scopeOf(actor: Actor, permission: Permission): Scope | null {
	return actor.permissions[permission] ?? null;
}

/** Whether `actor` holds `permission` in any scope. Scope checks are the caller's job. */
export function can(actor: Actor, permission: Permission): boolean {
	return scopeOf(actor, permission) !== null;
}

/** The permission needed to invite (or deactivate) someone with each role key. */
const MANAGE_PERMISSION: Record<string, Permission> = {
	student: "student:manage",
	teacher: "staff:manage",
	invigilator: "staff:manage",
	admin: "admin:manage",
};

/**
 * Whether `actor` may invite someone into `roleKey`. Nobody can invite an
 * Owner (`super_admin`) through the app, and an unknown role is refused —
 * so an invite can never grant more than the inviter could.
 */
export function canInviteRole(actor: Actor, roleKey: string): boolean {
	const needed = MANAGE_PERMISSION[roleKey];
	return needed !== undefined && can(actor, needed);
}

/**
 * Whether `actor` may move a user into `roleKey`. Needs `role:change` (Owner
 * only), and no one can be made an Owner through the app.
 */
export function canAssignRole(actor: Actor, roleKey: string): boolean {
	return roleKey !== "super_admin" && roleKey in MANAGE_PERMISSION && can(actor, "role:change");
}

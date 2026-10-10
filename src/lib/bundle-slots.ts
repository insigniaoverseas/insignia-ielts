/**
 * The rule that keeps a layout bundle honest: a page's data goes to the
 * browser only if this person holds that page's permission.
 *
 * Pure (it only reads the permission map) so it is unit-tested; used by
 * `lib/queries/staff-bundles.ts`.
 */
import { can, type Actor, type Permission } from "./permissions.ts";
import type { Slot } from "./view-models/staff.ts";

/** A loader's outcome before the permission check. */
export type Settled<T> = { ok: true; data: T } | { ok: false };

/**
 * The slot for one page: its data when `actor` may open it (or it needs no
 * permission), `forbidden` — with the data left behind — when they may not,
 * and `error` when it failed to load.
 */
export function toSlot<T>(actor: Actor, permission: Permission | null, settled: Settled<T>): Slot<T> {
	if (permission && !can(actor, permission)) return { ok: false, reason: "forbidden" };
	return settled.ok ? { ok: true, data: settled.data } : { ok: false, reason: "error" };
}

import "server-only";

import { unstable_rethrow } from "next/navigation";

import { toSlot, type Settled } from "@/lib/bundle-slots";
import type { Actor, Permission } from "@/lib/permissions";
import type { AdminBundle, Slot, TeacherBundle } from "@/lib/view-models/staff";
import {
	getAdminOverview,
	getAuditLog,
	getBatches,
	getPlansWorkqueue,
	getStudentsList,
	getTestLibrary,
	getUsersAndRoles,
} from "./admin";
import { getAssignOptions, getResultsIndex, getTeacherDashboard } from "./teacher";

/*
 * The staff layouts' bundles: every sidebar page's data, read in **one**
 * round trip.
 *
 * All the loaders start at the same moment as the layout's guard, so nothing
 * waits on "who is this?" first. Every one reads through the caller's RLS
 * client, so what each returns is already limited to what this person may
 * see. Once the guard has answered, a page whose permission they lack is
 * dropped — its data never leaves the server — exactly as that page's own
 * `requirePermissionOrRedirect` used to turn them away.
 */


/**
 * Starts a loader now; a failure is logged and kept to that one page.
 *
 * Next.js's own control flow — `redirect()`, `notFound()`, "render this
 * dynamically" — travels as thrown errors too, and must not be swallowed:
 * `unstable_rethrow` passes those through. The returned promise is marked
 * handled, so one left unawaited after the guard redirects raises no warning.
 */
function start<T>(label: string, load: () => Promise<T>): Promise<Settled<T>> {
	const pending = load().then(
		(data): Settled<T> => ({ ok: true, data }),
		(error: unknown): Settled<T> => {
			unstable_rethrow(error);
			console.error(`${label} failed to load:`, error);
			return { ok: false };
		},
	);
	pending.catch(() => undefined);
	return pending;
}

async function slot<T>(actor: Actor, permission: Permission | null, pending: Promise<Settled<T>>): Promise<Slot<T>> {
	return toSlot(actor, permission, await pending);
}

/**
 * Screens 20–29's list pages for the admin layout.
 *
 * @param guard The layout's `requireRole` call, already started. Its redirect
 *   (signed out, wrong role, session ended) wins over everything else.
 */
export async function getAdminBundle(guard: Promise<Actor>): Promise<{ actor: Actor; bundle: AdminBundle }> {
	const pending = {
		overview: start("admin overview", getAdminOverview),
		students: start("students list", getStudentsList),
		plans: start("plans workqueue", getPlansWorkqueue),
		batches: start("batches", getBatches),
		library: start("test library", getTestLibrary),
		users: start("users and roles", getUsersAndRoles),
		audit: start("audit log", getAuditLog),
	};
	const actor = await guard;
	const [overview, students, plans, batches, library, users, audit] = await Promise.all([
		slot(actor, null, pending.overview),
		slot(actor, "student:manage", pending.students),
		slot(actor, "student:manage", pending.plans),
		slot(actor, "student:manage", pending.batches),
		slot(actor, "test:author", pending.library),
		slot(actor, "staff:manage", pending.users),
		slot(actor, "audit:read", pending.audit),
	]);
	return { actor, bundle: { actor, overview, students, plans, batches, library, users, audit } };
}

/**
 * Screens 14–18's list pages for the teacher layout.
 *
 * @param guard The layout's `requireRole` call, already started.
 */
export async function getTeacherBundle(guard: Promise<Actor>): Promise<{ actor: Actor; bundle: TeacherBundle }> {
	const pending = {
		dashboard: start("teacher dashboard", getTeacherDashboard),
		assign: start("assign options", getAssignOptions),
		results: start("results index", getResultsIndex),
	};
	const actor = await guard;
	const [dashboard, assign, results] = await Promise.all([
		slot(actor, null, pending.dashboard),
		slot(actor, "assignment:manage", pending.assign),
		slot(actor, "results:release", pending.results),
	]);
	return { actor, bundle: { actor, dashboard, assign, results } };
}

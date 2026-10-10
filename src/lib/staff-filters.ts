/**
 * The admin lists' search and filters, run in the browser over data the admin
 * layout already loaded — so changing a filter costs no round trip.
 *
 * Pure and import-free (types only) so it is unit-testable and safe in client
 * components.
 */
import type { AuditEntry, StudentRow } from "./view-models/admin.ts";

/** How many students the list shows at once. */
export const STUDENTS_PAGE_SIZE = 25;

/** Screen 21's filters, as they appear in the URL. `"all"` or missing means no filter. */
export type StudentFilters = { search?: string; batch?: string; status?: string };

/**
 * The students matching the search (name or phone), batch and plan status.
 *
 * @returns The first {@link STUDENTS_PAGE_SIZE} matches, and how many matched in all.
 */
export function filterStudents(rows: StudentRow[], filters: StudentFilters): { rows: StudentRow[]; total: number } {
	let matched = rows;
	const needle = filters.search?.trim().toLowerCase();
	if (needle) matched = matched.filter((row) => row.name.toLowerCase().includes(needle) || row.phone.toLowerCase().includes(needle));
	if (filters.batch && filters.batch !== "all") matched = matched.filter((row) => row.batchId === filters.batch);
	if (filters.status && filters.status !== "all") matched = matched.filter((row) => row.planState === filters.status);
	return { rows: matched.slice(0, STUDENTS_PAGE_SIZE), total: matched.length };
}

/** The audit rows for one action, or all of them for `"all"` or no filter. */
export function filterAudit(entries: AuditEntry[], action?: string): AuditEntry[] {
	return action && action !== "all" ? entries.filter((entry) => entry.action === action) : entries;
}

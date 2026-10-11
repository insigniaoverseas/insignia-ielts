/**
 * What the admin and teacher layouts load once and hand to their pages.
 *
 * Each sidebar page's data is a {@link Slot}: present, withheld because this
 * person lacks the page's permission (the data was never sent), or failed to
 * load (that page shows the error screen; the others still work).
 */
import type { Actor } from "@/lib/permissions";
import type {
	AdminOverview,
	AuditLog,
	BatchRow,
	PlansWorkqueue,
	StudentsList,
	TestLibraryRow,
	UsersAndRoles,
} from "./admin";
import type { AssignOptions, ResultsIndexRow, TeacherDashboard } from "./teacher";
import type { DeviceRow } from "@/lib/auth/devices";

/** One page's data inside a layout bundle. */
export type Slot<T> = { ok: true; data: T } | { ok: false; reason: "forbidden" | "error" };

/** Everything the admin sidebar's pages show, read in one round trip by the admin layout. */
export type AdminBundle = {
	/** Who is signed in — for the per-row "may I change this?" checks on the Users page. */
	actor: Actor;
	overview: Slot<AdminOverview>;
	students: Slot<StudentsList>;
	plans: Slot<PlansWorkqueue>;
	batches: Slot<BatchRow[]>;
	library: Slot<TestLibraryRow[]>;
	users: Slot<UsersAndRoles>;
	audit: Slot<AuditLog>;
};

/** Everything the teacher sidebar's pages show, read in one round trip by the teacher layout. */
export type TeacherBundle = {
	actor: Actor;
	dashboard: Slot<TeacherDashboard>;
	assign: Slot<AssignOptions>;
	results: Slot<ResultsIndexRow[]>;
};

/** My account (M10-12) — who is signed in, and every device they're signed in on. */
export type StaffAccount = {
	name: string;
	email: string;
	/** "Owner", "Admin", "Teacher", "Invigilator". */
	roleLabel: string;
	branchName: string | null;
	/** This device first. */
	devices: DeviceRow[];
};

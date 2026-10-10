"use client";

import { redirect } from "next/navigation";
import { createContext, useContext } from "react";

import type { AdminBundle, Slot, TeacherBundle } from "@/lib/view-models/staff";

/*
 * The admin and teacher sidebar pages' data, loaded once by their layout
 * (`lib/queries/staff-bundles.ts`) and kept in the browser — so moving between
 * those pages costs no database round trip. Rebuilt whenever the layout
 * renders again: after a save (`revalidatePath`) and by `AutoRefresh`.
 */

const AdminData = createContext<AdminBundle | null>(null);
const TeacherData = createContext<TeacherBundle | null>(null);

/** Makes the admin layout's bundle available to the pages below it. */
export function AdminDataProvider({ bundle, children }: { bundle: AdminBundle; children: React.ReactNode }) {
	return <AdminData.Provider value={bundle}>{children}</AdminData.Provider>;
}

/** Makes the teacher layout's bundle available to the pages below it. */
export function TeacherDataProvider({ bundle, children }: { bundle: TeacherBundle; children: React.ReactNode }) {
	return <TeacherData.Provider value={bundle}>{children}</TeacherData.Provider>;
}

/** The admin sidebar pages' data. Only inside the admin layout. */
export function useAdminData(): AdminBundle {
	const bundle = useContext(AdminData);
	if (!bundle) throw new Error("Admin data is only available inside the admin layout.");
	return bundle;
}

/** The teacher sidebar pages' data. Only inside the teacher layout. */
export function useTeacherData(): TeacherBundle {
	const bundle = useContext(TeacherData);
	if (!bundle) throw new Error("Teacher data is only available inside the teacher layout.");
	return bundle;
}

/**
 * One page's data out of its slot.
 *
 * Without the page's permission the server never sent the data; the visitor
 * goes to `home`, as the page's own permission check used to send them. A
 * failed load throws, so that page — and only that page — shows the error
 * screen.
 */
export function pageData<T>(slot: Slot<T>, home: string): T {
	if (slot.ok) return slot.data;
	if (slot.reason === "forbidden") redirect(home);
	throw new Error("This page's data could not be loaded.");
}

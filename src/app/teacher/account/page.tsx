import type { Metadata } from "next";

import { AccountView } from "@/components/staff/views/account-view";
import { requireRole, withGuard } from "@/lib/auth/guard";
import { getStaffAccount } from "@/lib/queries/account";

export const metadata: Metadata = { title: "My account" };

/** My account for teachers and invigilators (M10-12). Same page as admin's — see there. */
export default async function TeacherAccountPage() {
	const account = await withGuard(requireRole(["teacher", "invigilator"], "/teacher/account"), getStaffAccount());
	return <AccountView account={account} />;
}

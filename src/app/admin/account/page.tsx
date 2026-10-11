import type { Metadata } from "next";

import { AccountView } from "@/components/staff/views/account-view";
import { requireRole, withGuard } from "@/lib/auth/guard";
import { getStaffAccount } from "@/lib/queries/account";

export const metadata: Metadata = { title: "My account" };

/**
 * My account for admins and the Owner (M10-12): where they're signed in, with
 * Sign out for each device. Read fresh on every visit, not from the layout's
 * bundle — a device list that is a minute stale is the wrong list.
 */
export default async function AdminAccountPage() {
	const account = await withGuard(requireRole(["admin", "super_admin"], "/admin/account"), getStaffAccount());
	return <AccountView account={account} />;
}

import type { Metadata } from "next";
import { UsersView } from "@/components/staff/views/users-view";

export const metadata: Metadata = { title: "Users & roles" };

/** Screen 28. The data comes from the layout's bundle — no query here. */
export default function UsersPage() {
	return <UsersView />;
}

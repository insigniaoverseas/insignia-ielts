import type { Metadata } from "next";
import { TeacherDashboardView } from "@/components/staff/views/teacher-dashboard-view";

export const metadata: Metadata = { title: "Dashboard" };

/** Screen 14. The data comes from the layout's bundle — no query here. */
export default function TeacherDashboardPage() {
	return <TeacherDashboardView />;
}

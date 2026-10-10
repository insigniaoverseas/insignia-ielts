import type { Metadata } from "next";
import { AuditView } from "@/components/staff/views/audit-view";

export const metadata: Metadata = { title: "Audit log" };

/** Screen 29. The data comes from the layout's bundle; the filter runs in the browser. */
export default async function AuditPage({ searchParams }: { searchParams: Promise<{ action?: string }> }) {
	const { action } = await searchParams;
	return <AuditView action={action} />;
}

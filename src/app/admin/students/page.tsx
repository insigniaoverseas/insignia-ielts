import type { Metadata } from "next";
import { StudentsView } from "@/components/staff/views/students-view";

export const metadata: Metadata = { title: "Students" };

/** Screen 21. The data comes from the layout's bundle; search and filters run in the browser. */
export default async function StudentsPage({
	searchParams,
}: {
	searchParams: Promise<{ q?: string; batch?: string; status?: string }>;
}) {
	const { q, batch, status } = await searchParams;
	return <StudentsView q={q} batch={batch} status={status} />;
}

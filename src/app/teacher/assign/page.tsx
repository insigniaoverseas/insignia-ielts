import type { Metadata } from "next";
import { AssignView } from "@/components/staff/views/assign-view";

export const metadata: Metadata = { title: "Assign a test" };

/** Screen 16. The data comes from the layout's bundle — no query here. */
export default async function AssignPage({ searchParams }: { searchParams: Promise<{ batch?: string }> }) {
	const { batch } = await searchParams;
	return <AssignView batch={batch} />;
}

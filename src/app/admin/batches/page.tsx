import type { Metadata } from "next";
import { BatchesView } from "@/components/staff/views/batches-view";

export const metadata: Metadata = { title: "Batches" };

/** Screen 25. The data comes from the layout's bundle — no query here. */
export default async function BatchesPage({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
	const { created } = await searchParams;
	return <BatchesView created={created} />;
}

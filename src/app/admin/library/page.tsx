import type { Metadata } from "next";
import { LibraryView } from "@/components/staff/views/library-view";

export const metadata: Metadata = { title: "Test library" };

/** Screen 22. The data comes from the layout's bundle — no query here. */
export default async function LibraryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
	return <LibraryView query={await searchParams} />;
}

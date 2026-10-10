import type { Metadata } from "next";
import { MyTestsView } from "@/components/student/views/my-tests-view";

export const metadata: Metadata = { title: "My Tests" };

/** Screen 04. The data comes from the student layout's bundle — no query here. */
export default async function MyTestsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
	const { tab } = await searchParams;
	return <MyTestsView tab={tab} />;
}

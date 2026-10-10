import type { Metadata } from "next";
import { ResultView } from "@/components/student/views/result-view";

export const metadata: Metadata = { title: "Your result" };

/** Screen 09. The result comes from the student layout's bundle — no query here. */
export default async function ResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
	const { attemptId } = await params;
	return <ResultView attemptId={attemptId} />;
}

import type { Metadata } from "next";
import { ReviewView } from "@/components/student/views/review-view";

export const metadata: Metadata = {
	title: "Review my mistakes",
	robots: { index: false, follow: false },
};

/** Screen 10. The data is loaded in the browser — usually by the result screen, before this opens. */
export default async function ReviewPage({
	params,
	searchParams,
}: {
	params: Promise<{ attemptId: string }>;
	searchParams: Promise<{ show?: string }>;
}) {
	const { attemptId } = await params;
	const { show } = await searchParams;
	return <ReviewView attemptId={attemptId} show={show} />;
}

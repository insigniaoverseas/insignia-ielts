import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Banner } from "@/components/ui/banner";
import { getReviewAvailability } from "@/lib/queries/student";

export const metadata: Metadata = {
	title: "Review my mistakes",
	robots: { index: false, follow: false },
};

/**
 * Review access is resolved from Supabase now. Question prompts, explanations
 * and correct answers remain unavailable until the private R2 content/key
 * reader is implemented; no fixture answers are shown in their place.
 */
export default async function ReviewPage({ params }: { params: Promise<{ attemptId: string }> }) {
	const { attemptId } = await params;
	const review = await getReviewAvailability(attemptId);
	if (!review || !review.allowed) notFound();

	return (
		<div className="mx-auto flex w-full max-w-[760px] flex-col gap-6">
			<Link href={`/results/${attemptId}`} className="font-semibold">
				← Back to my result
			</Link>

			<div className="flex flex-col gap-2">
				<h1 className="m-0 text-[1.75rem] leading-9 font-bold md:text-h1">Review my mistakes</h1>
				<p className="m-0 text-ink-2">{review.attempt.test.title}</p>
			</div>

			<Banner tone="info">
				Your result is available, but question-by-question review will appear after private test content is connected.
				No sample answers are being shown in its place.
			</Banner>
		</div>
	);
}

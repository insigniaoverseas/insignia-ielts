import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Banner } from "@/components/ui/banner";
import { getAttemptPlaceholder } from "@/lib/queries/attempt";

export const metadata: Metadata = {
	title: "Your test",
	robots: { index: false, follow: false },
};

/**
 * The route verifies its Supabase attempt/assignment now. The actual question
 * document and Listening audio stay unavailable until the private R2 reader is
 * implemented, instead of silently falling back to a fixture paper.
 */
export default async function AttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
	const { attemptId } = await params;
	const attempt = await getAttemptPlaceholder(attemptId);
	if (!attempt) notFound();

	return (
		<main className="mx-auto flex min-h-screen w-full max-w-[760px] flex-col justify-center gap-6 px-4 py-12">
			<div className="flex flex-col gap-2">
				<h1 className="m-0 text-h1">{attempt.test.title}</h1>
				<p className="m-0 text-ink-2">
					{attempt.test.questionCount} questions · {attempt.test.durationMinutes} minutes
				</p>
			</div>
			<Banner tone="info">
				This test is assigned in Supabase, but its private questions and audio are not connected yet. The timer has not
				started and no attempt data has been changed.
			</Banner>
			<Link href="/tests" className="font-semibold">
				← Back to My Tests
			</Link>
		</main>
	);
}

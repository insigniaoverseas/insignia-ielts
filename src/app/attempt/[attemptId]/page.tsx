import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AttemptRunner } from "@/components/player/attempt-runner";
import { Banner } from "@/components/ui/banner";
import { isOverdue } from "@/lib/attempts/clock";
import { finishAttempt } from "@/lib/attempts/finish";
import { getOwnedAttempt, loadAttemptSession } from "@/lib/attempts/load";
import { requireUser } from "@/lib/auth/guard";

export const metadata: Metadata = {
	title: "Your test",
	robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Screens 06/07 — the running test (M2-07, M2-15).
 *
 * Only ever an attempt the student owns, addressed by its own id. An
 * assignment or `practice:` reference — an old bookmark, or the pre-test
 * screen before Start existed — goes back to the briefing, where Start
 * creates or resumes the attempt. A finished attempt goes to its result.
 */
export default async function AttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
	const { attemptId } = await params;
	const actor = await requireUser(`/attempt/${attemptId}`);

	if (!UUID.test(attemptId)) {
		if (attemptId.startsWith("practice:")) redirect(`/tests/${encodeURIComponent(attemptId)}/start`);
		notFound();
	}
	const attempt = await getOwnedAttempt(attemptId, actor.id);
	if (!attempt) redirect(`/tests/${attemptId}/start`);
	if (isOverdue(attempt)) {
		// The deadline passed with the page closed: the server clock decides.
		await finishAttempt(attempt, "expired");
		redirect(`/results/${attempt.id}`);
	}
	if (attempt.status !== "in_progress") redirect(`/results/${attempt.id}`);

	const loaded = await loadAttemptSession(attempt);
	if ("problem" in loaded) {
		return (
			<main className="mx-auto flex min-h-screen w-full max-w-[760px] flex-col justify-center gap-6 px-4 py-12">
				<Banner tone="warning">
					This test can&rsquo;t be opened right now. Your time and answers are safe — tell your teacher.
				</Banner>
				<Link href="/tests" className="font-semibold">
					← Back to My Tests
				</Link>
			</main>
		);
	}

	const highest = Object.values(loaded.revisions);
	return <AttemptRunner session={loaded.session} firstRevision={highest.length ? Math.max(...highest) : 0} />;
}

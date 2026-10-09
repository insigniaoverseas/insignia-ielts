import Link from "next/link";

import type { OpenAttempt } from "@/lib/attempts/load";

/** "about 23 minutes" — rounded up, so it never promises more time than there is to lose. */
function minutesLeft(seconds: number): string {
	const minutes = Math.max(1, Math.ceil(seconds / 60));
	return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}

/**
 * Shown on every student page while a test is open (beta feedback,
 * 2026-10-09). A mock or class test's clock does not stop while the student
 * is away, so they must never be somewhere else without knowing it; practice
 * pauses, and says so. One sentence, one button.
 */
export function RunningTestBanner({ attempts }: { attempts: OpenAttempt[] }) {
	if (attempts.length === 0) return null;
	return (
		<div className="mb-6 flex flex-col gap-2">
			{attempts.map((attempt) => (
				<div
					key={attempt.id}
					role="status"
					className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-warning bg-warning-soft px-5 py-4"
				>
					<span>
						{attempt.paused ? (
							<>
								<strong className="font-semibold">{attempt.title}</strong> is paused with{" "}
								{minutesLeft(attempt.secondsLeft)} left. Practice waits for you.
							</>
						) : (
							<>
								<strong className="font-semibold">{attempt.title}</strong> is still running —{" "}
								{minutesLeft(attempt.secondsLeft)} left. The clock doesn&rsquo;t stop while you&rsquo;re away.
							</>
						)}
					</span>
					<Link
						href={`/attempt/${attempt.id}`}
						className="flex min-h-touch items-center rounded-control bg-brand px-5 font-semibold text-white no-underline hover:bg-brand-hover hover:no-underline"
					>
						Carry on
					</Link>
				</div>
			))}
		</div>
	);
}

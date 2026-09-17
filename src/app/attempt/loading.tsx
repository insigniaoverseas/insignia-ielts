import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state for the test player.
 *
 * Deliberately calm and deliberately *not* test-shaped. A student taps "Start
 * test" and this is the first thing they see, so it must not look like the
 * paper has appeared — if it did, they would start reading a skeleton and
 * believe they were losing time.
 *
 * The words carry the meaning, because this is the one screen where a shimmer
 * alone would be frightening. The timer is server-owned and has not started:
 * it starts when the attempt does (`CLAUDE.md` non-negotiable 1), and saying so
 * here is the difference between waiting calmly and tapping the button again.
 */
export default function Loading() {
	return (
		<main
			className="mx-auto flex min-h-screen max-w-[640px] flex-col justify-center gap-6 px-6 py-16"
			aria-busy="true"
			aria-live="polite"
		>
			<h1 className="m-0 text-h2">Getting your test ready…</h1>
			<p className="m-0 text-passage text-ink-2">
				Your time hasn&rsquo;t started yet. It starts when the test opens.
			</p>
			<div className="flex flex-col gap-3">
				<Skeleton className="h-5 w-full" />
				<Skeleton className="h-5 w-4/5" />
			</div>
		</main>
	);
}

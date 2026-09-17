import { Skeleton } from "@/components/ui/skeleton";

/**
 * Student loading state (screens 03–13).
 *
 * The student side is used on a phone, often on the institute's wifi, by
 * someone who is about to sit a test. Leaving the previous screen on the glass
 * while the server works reads as "it didn't work" and gets tapped again — so
 * the tap is acknowledged immediately, every time.
 *
 * Bigger blocks than the staff side, matching the student card sizes: this is
 * the same screen, one moment earlier, not a different one
 * (`CLAUDE.md` — nothing below 16px, one obvious thing per screen).
 */
export default function Loading() {
	return (
		<div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
			<span className="sr-only">Loading…</span>

			{/* The plan banner sits at the top of most student screens. */}
			<Skeleton className="h-12 w-full rounded-card" />

			<div className="flex flex-col gap-2">
				<Skeleton className="h-10 w-[260px]" />
				<Skeleton className="h-6 w-[180px]" />
			</div>

			{/* Test cards: the one obvious thing on the home screen. */}
			<div className="flex flex-col gap-4">
				{Array.from({ length: 3 }, (_, card) => (
					<div key={card} className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<Skeleton className="h-7 w-[240px]" />
							<Skeleton className="h-6 w-24 rounded-full" />
						</div>
						<Skeleton className="h-5 w-4/5" />
						<Skeleton className="h-5 w-2/5" />
						<Skeleton className="h-primary w-full rounded-control sm:w-[220px]" />
					</div>
				))}
			</div>
		</div>
	);
}

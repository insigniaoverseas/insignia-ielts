import { Skeleton } from "@/components/ui/skeleton";

/**
 * Teacher loading state (screens 14–19).
 *
 * The teacher shell stays put in the layout above; this replaces only the
 * screen, the moment a link is clicked. Same shape as the admin one because
 * the teacher screens are the same kind of thing — a title, a toolbar and a
 * roster or results table.
 */
export default function Loading() {
	return (
		<div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
			{/* Announced for screen readers; the blocks themselves are aria-hidden. */}
			<span className="sr-only">Loading…</span>

			<div className="flex flex-wrap items-center justify-between gap-4">
				<Skeleton className="h-9 w-[220px]" />
				<Skeleton className="h-10 w-[150px]" />
			</div>

			<div className="flex flex-col rounded-card border border-line bg-surface">
				<div className="border-b border-line px-6 py-4">
					<Skeleton className="h-5 w-[260px]" />
				</div>
				<div className="flex flex-col gap-4 px-6 py-5">
					{Array.from({ length: 8 }, (_, row) => (
						<div key={row} className="flex items-center gap-4">
							<Skeleton className="h-5 flex-[2]" />
							<Skeleton className="h-5 flex-1" />
							<Skeleton className="hidden h-5 flex-1 sm:block" />
							<Skeleton className="h-6 w-20 rounded-full" />
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

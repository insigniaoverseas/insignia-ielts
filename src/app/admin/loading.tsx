import { Skeleton } from "@/components/ui/skeleton";

/**
 * Admin loading state (screens 20–28).
 *
 * Shown the moment a link is clicked, instead of leaving the previous screen
 * on the glass while the server works. The admin shell — header and sidebar —
 * is in the layout above this, so on a move between admin pages only this part
 * is replaced, and it is replaced immediately.
 *
 * Shaped like the screen it stands in for: a title, a toolbar, then rows. Most
 * of these screens are tables, so the page does not jump when the data lands
 * (`components/ui/skeleton.tsx`).
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

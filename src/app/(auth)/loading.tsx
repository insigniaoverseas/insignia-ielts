import { Skeleton } from "@/components/ui/skeleton";

/**
 * Sign-in, invitation and password-reset loading state.
 *
 * These screens are narrow and short, so the skeleton is too — a full-page
 * shimmer where a small form is about to appear looks like something went
 * wrong. The auth layout already centres this in a 440px column.
 */
export default function Loading() {
	return (
		<div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
			<span className="sr-only">Loading…</span>

			<div className="flex flex-col gap-2">
				<Skeleton className="h-9 w-[200px]" />
				<Skeleton className="h-5 w-[280px]" />
			</div>

			<div className="flex flex-col gap-5 rounded-card border border-line bg-surface p-6">
				{Array.from({ length: 2 }, (_, field) => (
					<div key={field} className="flex flex-col gap-1.5">
						<Skeleton className="h-5 w-24" />
						<Skeleton className="h-11 w-full" />
					</div>
				))}
				<Skeleton className="h-11 w-full" />
			</div>
		</div>
	);
}

import Link from "next/link";

/**
 * Screen 30a — page not found (M9-04).
 *
 * Written for a student, because they are who ends up here: a stale link from
 * a teacher, or a test that has been unassigned. It says what happened in one
 * sentence and gives one way forward, like every other dead end in the product.
 */
export default function NotFound() {
	return (
		<main className="mx-auto flex min-h-screen max-w-[520px] flex-col items-center justify-center gap-5 px-4 text-center">
			<span className="grid size-14 place-items-center rounded-full bg-brand-soft text-h1" aria-hidden="true">
				🔍
			</span>
			<h1 className="m-0 text-h1">We couldn&rsquo;t find that page</h1>
			<p className="m-0 text-ink-2">
				The link may be old, or the test may have been taken down. Nothing you&rsquo;ve done is lost.
			</p>
			<Link
				href="/home"
				className="flex h-primary items-center justify-center rounded-control bg-brand px-8 text-h3 font-semibold text-white no-underline hover:bg-brand-hover hover:no-underline"
			>
				Go to my home page
			</Link>
		</main>
	);
}

"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Screen 30b — something broke (M9-04).
 *
 * The first line is the one that matters to a student mid-test: **their
 * answers are saved**. Autosave writes to the server as they type, so a crash
 * on this page does not cost them work — and saying so is the difference
 * between a student who retries and one who panics and calls a teacher over.
 *
 * No stack trace, no error code, no "an unexpected error occurred". `digest`
 * is what support would ask for, so it is present but quiet.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
	return (
		<main className="mx-auto flex min-h-screen max-w-[520px] flex-col items-center justify-center gap-5 px-4 text-center">
			<span className="grid size-14 place-items-center rounded-full bg-warning-soft text-h1" aria-hidden="true">
				!
			</span>
			<h1 className="m-0 text-h1">Something went wrong</h1>
			<p className="m-0 text-ink-2">
				<strong className="font-semibold text-ink">Your answers are saved.</strong> Try again — if it keeps
				happening, tell your teacher.
			</p>
			<div className="flex flex-col gap-3">
				<Button size="student" onClick={reset}>
					Try again
				</Button>
				<Link
					href="/home"
					className="flex min-h-touch items-center justify-center font-semibold text-ink-2 no-underline hover:text-ink hover:no-underline"
				>
					Go to my home page
				</Link>
			</div>
			{error.digest && <p className="m-0 font-mono text-small text-ink-3">Reference: {error.digest}</p>}
		</main>
	);
}

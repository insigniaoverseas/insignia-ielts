import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FirstRunForm } from "@/components/auth/first-run-form";
import { isFirstRunPending } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
	title: "Set up Insignia IELTS",
	robots: { index: false, follow: false },
};

/**
 * First-run setup — the one screen that exists because D9 has a chicken-and-egg
 * problem.
 *
 * Every account starts as an invitation, and nobody can be invited into the
 * Owner role, so the first account has no sender. It is created by hand in the
 * Supabase dashboard; this screen is where its owner names their centre and
 * themselves, after which every other account goes through invitations as
 * normal.
 *
 * It is **not** a signup route. `first_run_pending()` is true only for one
 * pinned uuid and only while the `users` table is empty; for anybody else, at
 * any other time, this page redirects away.
 */
export default async function SetupPage() {
	if (!(await isFirstRunPending())) {
		// Either setup is done, or this is not the bootstrap account. Both mean
		// "you have no business here", and both are answered by sending them
		// somewhere that does exist.
		redirect("/login");
	}

	const { data } = await (await createClient()).auth.getClaims();
	const email = typeof data?.claims?.email === "string" ? data.claims.email : "";

	return (
		<>
			<div className="flex flex-col items-center gap-4 text-center">
				<span
					className="grid size-12 place-items-center rounded-card bg-night text-h2 font-bold text-white"
					aria-hidden="true"
				>
					I
				</span>
				<div className="flex flex-col gap-1">
					<h1 className="m-0 text-h1">Let&rsquo;s set up your institute</h1>
					<p className="m-0 text-ink-2">
						This happens once. After it, you invite everyone else by email.
					</p>
				</div>
			</div>

			<FirstRunForm email={email} />
		</>
	);
}

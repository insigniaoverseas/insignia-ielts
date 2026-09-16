import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
	title: "Forgotten password",
	robots: { index: false, follow: false },
};

/**
 * Ask for a password reset (M1-15).
 *
 * `MVP-1.md` §9 originally had no self-serve reset — a locked-out student is
 * standing in a building with their teacher in it. That held for students and
 * failed for the Owner, who has nobody able to re-invite them; the user opened
 * it to every role on 2026-09-17 and §9 is corrected.
 */
export default function ForgotPasswordPage() {
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
					<h1 className="m-0 text-h1">Forgotten your password?</h1>
					<p className="m-0 text-ink-2">
						Put in your email and we&rsquo;ll send you a link to choose a new one.
					</p>
				</div>
			</div>

			<ForgotPasswordForm />
		</>
	);
}

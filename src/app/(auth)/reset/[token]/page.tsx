import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { lookupPasswordReset } from "@/lib/auth/password-reset";

export const metadata: Metadata = {
	title: "Choose a new password",
	// A reset link must never be indexed or previewed.
	robots: { index: false, follow: false },
};

/**
 * Choose a new password from an emailed link (M1-15).
 *
 * The dead ends get the same care as `/invite/[token]`: expired, already used
 * and unrecognised each keep their own sentence and a way forward. Someone who
 * reaches this page has already forgotten a password once today, and a 404 or
 * the word "invalid" is the last thing that helps.
 */
export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
	const { token } = await params;
	const reset = await lookupPasswordReset(token);

	if (reset.state !== "valid") {
		return (
			<>
				<div className="flex flex-col items-center gap-4 text-center">
					<span
						className="grid size-14 place-items-center rounded-full bg-warning-soft text-h1"
						aria-hidden="true"
					>
						!
					</span>
					<h1 className="m-0 text-h1">
						{reset.state === "used" ? "You've already used this link" : "This link doesn't work any more"}
					</h1>
					<p className="m-0 text-ink-2">{reset.message}</p>
				</div>

				{/* Expired and unknown both have the same fix, so offer it rather
				    than making them find their way back to it. */}
				{reset.state !== "used" && (
					<Button size="student" asChild>
						<Link href="/forgot">Send me a new link</Link>
					</Button>
				)}
				<Button size="student" variant={reset.state === "used" ? "primary" : "secondary"} asChild>
					<Link href="/login">Go to sign in</Link>
				</Button>
			</>
		);
	}

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
					<h1 className="m-0 text-h1">Hello again, {reset.name.split(" ")[0]}</h1>
					<p className="m-0 text-ink-2">Pick a new password and you&rsquo;re back in.</p>
				</div>
			</div>

			<ResetPasswordForm token={reset.token} />
		</>
	);
}

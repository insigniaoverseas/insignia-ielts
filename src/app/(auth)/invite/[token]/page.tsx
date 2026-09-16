import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SetPasswordForm } from "@/components/auth/set-password-form";
import { lookupInvitation } from "@/lib/auth/acceptance";

export const metadata: Metadata = {
	title: "Set up your account",
	// An invitation link must never be indexed or previewed.
	robots: { index: false, follow: false },
};

/**
 * Accept invitation (M1-05, M1-06) — the new screen D9 calls for.
 *
 * One step now that the PIN is gone: verify the token, then set a password.
 * Receiving the email already proves the address, so there is no separate
 * verification (`MVP-1.md` §9).
 *
 * **The dead ends are the interesting part.** An expired link is the single
 * most likely thing to go wrong in enrolment, and the person reading it has
 * done nothing wrong — so each dead state gets a plain sentence and a way
 * forward, never a 404 and never the word "invalid".
 */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
	const { token } = await params;
	const invite = await lookupInvitation(token);

	if (invite.state !== "valid") {
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
						{invite.state === "used" ? "You've already set this up" : "This link doesn't work any more"}
					</h1>
					<p className="m-0 text-ink-2">{invite.message}</p>
				</div>
				<Button size="student" asChild>
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
					<h1 className="m-0 text-h1">Welcome, {invite.fullName.split(" ")[0]}</h1>
					<p className="m-0 text-ink-2">Pick a password and you&rsquo;re in. This takes a minute.</p>
				</div>
			</div>

			{/* Shown so they can spot a wrong address before it becomes their login. */}
			<dl className="m-0 flex flex-col gap-0 rounded-card border border-line bg-surface px-6 py-2">
				{[
					["Email", invite.email],
					["Centre", invite.branchName],
					...(invite.batchName ? [["Batch", invite.batchName]] : []),
				].map(([label, value]) => (
					<div key={label} className="flex flex-wrap justify-between gap-2 border-b border-line py-3 last:border-b-0">
						<dt className="m-0 text-ink-2">{label}</dt>
						<dd className="m-0 font-semibold">{value}</dd>
					</div>
				))}
			</dl>

			<SetPasswordForm token={invite.token} email={invite.email} />

			<p className="m-0 text-center text-ink-2">
				Not you, or something looks wrong? Tell your teacher before you carry on.
			</p>
		</>
	);
}

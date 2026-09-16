import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { homeForRole } from "@/lib/auth/access";
import { isFirstRunPending } from "@/lib/auth/guard";
import { sessionState } from "@/lib/auth/sessions";
import { getActor } from "@/lib/rbac";

export const metadata: Metadata = { title: "Sign in" };

/**
 * Screen 01 — Login (M1-08).
 *
 * **Email and password only** — the PIN fast path was ruled out on 2026-09-16
 * (`PROJECT-MEMORY.md` §4), so the rendered phone+PIN design does not apply.
 *
 * Three things this screen deliberately does not have:
 *
 * - **No signup link.** Every account starts as an admin invitation
 *   (`CLAUDE.md` rule 7), so a "create account" link would be a dead end that
 *   makes people think they did something wrong.
 * - **No "which field was wrong".** One message for both, because naming the
 *   email tells an attacker which addresses are real (`MVP-1.md` §8).
 * - **No signed-in state.** A live session is redirected to its role home;
 *   the form is only rendered for somebody who actually needs to sign in.
 */
export default async function LoginPage({
	searchParams,
}: {
	searchParams: Promise<{ next?: string; ended?: string; reset?: string; session?: string; accepted?: string }>;
}) {
	const actor = await getActor();
	if (actor && (await sessionState(actor.id)) === "live") redirect(homeForRole(actor.role));
	if (!actor && (await isFirstRunPending())) redirect("/setup");

	const { next, ended, reset, session, accepted } = await searchParams;

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
					<h1 className="m-0 text-h1">Sign in</h1>
					<p className="m-0 text-ink-2">Use the email and password you set up.</p>
				</div>
			</div>

			{/* Reached by the guard when a session was revoked — most often a
			    student who signed in on another machine. Said plainly, so it
			    does not read as an error they caused. */}
			{ended && (
				<Banner tone="info">
					You were signed out because this account was used on another device. Sign in again to carry on.
				</Banner>
			)}

			{/* Arrived from a completed reset. Confirms the change landed, because
			    the reset deliberately does not sign them in — every session was
			    just revoked, including an intruder's. */}
			{reset && (
				<Banner tone="success">
					Your password has been changed, and you&rsquo;ve been signed out everywhere else. Sign in with your
					new one.
				</Banner>
			)}

			{session && (
				<Banner tone="danger">
					Your account is ready, but the app could not start a secure session. Please sign in again.
				</Banner>
			)}

			{accepted && (
				<Banner tone="success">Your account is ready. Sign in with the password you just created.</Banner>
			)}

			<LoginForm next={next} />

			{/* No signup link — accounts are created by invitation only. The
			    reset link is new (M1-15): §9 originally sent everyone to their
			    teacher, which left the Owner with no way back at all. */}
			<p className="m-0 text-center text-ink-2">
				<Link href="/forgot" className="font-semibold text-ink underline">
					Forgotten your password?
				</Link>
				<span className="mt-1 block">
					Still stuck? Ask your teacher — they can send you a new invitation.
				</span>
			</p>
		</>
	);
}

import type { Metadata } from "next";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLoginScreen } from "@/lib/mock/auth";

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
 * - **No self-serve password reset** yet — a student who is locked out is
 *   standing in a building with their teacher in it, and that is faster and
 *   safer than an email round trip.
 */
export default async function LoginPage({
	searchParams,
}: {
	searchParams: Promise<{ state?: string; next?: string }>;
}) {
	const { state, next } = await searchParams;
	const data = await getLoginScreen(state);
	const locked = data.lockedUntilLabel !== null;

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

			{locked && (
				<Banner tone="danger">
					Too many tries. You can sign in again after{" "}
					<strong className="font-semibold">{data.lockedUntilLabel}</strong>. If you need to get in now, ask
					your teacher.
				</Banner>
			)}

			<form className="flex flex-col gap-5 rounded-card border border-line bg-surface p-6">
				{next && <input type="hidden" name="next" value={next} />}

				<div className="flex flex-col gap-1.5">
					<Label htmlFor="email">Email</Label>
					<Input
						id="email"
						name="email"
						type="email"
						autoComplete="username"
						autoCapitalize="off"
						required
						disabled={locked}
						aria-invalid={data.error ? true : undefined}
					/>
				</div>

				<div className="flex flex-col gap-1.5">
					<Label htmlFor="password">Password</Label>
					<Input
						id="password"
						name="password"
						type="password"
						autoComplete="current-password"
						required
						disabled={locked}
						aria-invalid={data.error ? true : undefined}
					/>
				</div>

				{data.error && (
					<p className="m-0 flex items-start gap-2 font-semibold text-danger" role="alert">
						<span aria-hidden="true">✕</span>
						<span>
							{data.error.message}
							{data.error.triesLeft !== null && (
								<span className="block font-normal">
									{data.error.triesLeft === 1 ? "1 try left" : `${data.error.triesLeft} tries left`} before
									this account is locked for a while.
								</span>
							)}
						</span>
					</p>
				)}

				<Button type="submit" size="student" disabled={locked}>
					Sign in
				</Button>
			</form>

			{/* No signup link — accounts are created by invitation only. */}
			<p className="m-0 text-center text-ink-2">
				Forgotten your password? <strong className="font-semibold text-ink">Ask your teacher</strong> — they can
				send you a new invitation.
			</p>
		</>
	);
}

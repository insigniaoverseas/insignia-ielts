import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignInCodeForm } from "@/components/auth/sign-in-code-form";
import { BrandMark } from "@/components/brand/brand-mark";
import { AudioCacheGuard } from "@/components/student/audio-cache-guard";
import { homeForRole } from "@/lib/auth/access";
import { sessionState } from "@/lib/auth/sessions";
import { getActor } from "@/lib/rbac";

export const metadata: Metadata = {
	title: "Sign in with a code",
	robots: { index: false, follow: false },
};

/**
 * Sign in without a password (M10-10).
 *
 * Reached from "Sign in without a password" under the login form, and from
 * the "Too many tries" message. Kept off the login screen itself so that
 * screen still has one obvious action (`CLAUDE.md`, the design rule).
 */
export default async function SignInCodePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
	const actor = await getActor();
	if (actor && (await sessionState(actor.id)) === "live") redirect(homeForRole(actor.role));

	const { next } = await searchParams;

	return (
		<>
			{/* Whoever signs in next starts with no one else's audio cached (M2-06). */}
			<AudioCacheGuard />
			<div className="flex flex-col items-center gap-4 text-center">
				<BrandMark size={64} />
				<div className="flex flex-col gap-1">
					<h1 className="m-0 text-h1">Sign in with a code</h1>
					<p className="m-0 text-ink-2">No password needed. You don&rsquo;t have to open your email on this computer.</p>
				</div>
			</div>

			<SignInCodeForm next={next} />
		</>
	);
}

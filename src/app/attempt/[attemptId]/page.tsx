import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlayerShell } from "@/components/player/player-shell";
import { sanitizeAttemptSession } from "@/lib/security/sanitize-attempt";
import { getAttemptSession } from "@/lib/mock/attempt";

export const metadata: Metadata = {
	title: "Your test",
	// A test in progress must never be indexed or previewed.
	robots: { index: false, follow: false },
};

/**
 * The test player route (screens 06 and 07).
 *
 * It sits **outside** the `(student)` layout on purpose: during a test there is
 * no navigation to anywhere else, so the tab bar and the top nav must not be on
 * screen at all. Leaving is `Finish Test`, and nothing else.
 *
 * All authored HTML is sanitised here, on the server, before it reaches the
 * client player — see `sanitizeAttemptSession` for why that is not done at the
 * point of render.
 *
 * Autosave and submit land with M2-07. Until then `PlayerShell` is handed no
 * callbacks, which is why a keystroke goes nowhere: better an obviously inert
 * screen than one that looks like it is saving and is not.
 */
export default async function AttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
	const { attemptId } = await params;
	const session = await getAttemptSession(attemptId);
	if (!session) notFound();

	return <PlayerShell session={sanitizeAttemptSession(session)} />;
}

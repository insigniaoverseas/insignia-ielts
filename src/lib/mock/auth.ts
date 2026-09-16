import "server-only";

import type { InviteAcceptance, LoginScreen } from "@/lib/view-models/auth";

/* Auth fixtures (M1). Replaced by `lib/queries/auth.ts` + Server Actions. */

/** Screen 01 — Login. `?state=` drives the review scenarios; see `lib/mock/README.md`. */
export async function getLoginScreen(scenario = "default"): Promise<LoginScreen> {
	if (scenario === "wrong") {
		return {
			error: { message: "That email and password don't match.", triesLeft: 3 },
			lockedUntilLabel: null,
			redirectTo: null,
		};
	}
	if (scenario === "locked") {
		return {
			error: null,
			lockedUntilLabel: "10:45 AM",
			redirectTo: null,
		};
	}
	return { error: null, lockedUntilLabel: null, redirectTo: null };
}

/** The accept-invitation landing. Token shape decides the scenario in fixtures. */
export async function getInvite(token: string): Promise<InviteAcceptance> {
	if (token.startsWith("expired")) {
		return {
			state: "expired",
			message: "This link has expired. Ask your teacher for a new one — it only takes a minute.",
		};
	}
	if (token.startsWith("used")) {
		return {
			state: "used",
			message: "This link has already been used. If that was you, just sign in.",
		};
	}
	if (token.startsWith("revoked")) {
		return {
			state: "revoked",
			message: "This invitation was cancelled. Ask your teacher to send a new one.",
		};
	}
	if (token.length < 8) {
		return {
			state: "unknown",
			message: "We don't recognise this link. Check you copied the whole thing from your email.",
		};
	}
	return {
		state: "valid",
		token,
		email: "priya.sharma@example.com",
		fullName: "Priya Sharma",
		roleLabel: "Student",
		branchName: "Insignia — Karol Bagh",
		batchName: "Morning Batch A",
	};
}

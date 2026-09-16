/**
 * Auth screen view-models (screen 01 and the accept-invitation flow).
 *
 * **Email and password only.** The user ruled out the PIN fast path on
 * 2026-09-16, which supersedes the PIN half of D9 (`MVP-1.md` §9) and the
 * phone+PIN design in `01 Login.dc.html` / `02 First Login PIN Change.dc.html`.
 * See `PROJECT-MEMORY.md` §4.
 *
 * What survives from D9, and matters more than the PIN did:
 *
 * - **There is no signup.** Every account starts as an invitation, so the only
 *   way in is `InviteAcceptance` with a valid token.
 * - **Receiving the email proves the address**, so there is no separate
 *   verification step after accepting.
 */

/** Screen 01 — Login. */
export type LoginScreen = {
	/**
	 * Set after a failed attempt. Deliberately says nothing about *which* half
	 * was wrong: "no account with that email" tells an attacker which addresses
	 * are real (`MVP-1.md` §8).
	 */
	error: { message: string; triesLeft: number | null } | null;
	/**
	 * True once too many attempts have locked the account. The message says how
	 * long, because "try again later" sends people to the front desk.
	 */
	lockedUntilLabel: string | null;
	/** Where to send them after signing in, when they arrived at a deep link. */
	redirectTo: string | null;
};

/**
 * The invitation behind `/invite/[token]`.
 *
 * A dead token is a **state, not an error page**: an expired link is the single
 * most likely thing to go wrong in enrolment, and the student reading it has
 * done nothing wrong. Each dead state carries the sentence they should read.
 */
export type InviteAcceptance =
	| {
			state: "valid";
			/** Echoed back so the form can post it; never rendered on screen. */
			token: string;
			email: string;
			fullName: string;
			roleLabel: string;
			branchName: string;
			batchName: string | null;
	  }
	| { state: "expired" | "used" | "revoked" | "unknown"; message: string };

/**
 * Coarse route access rules shared by Proxy and server-side route guards.
 *
 * These rules decide which application a role belongs to. Fine-grained
 * permissions (for example `audit:read`) remain database data and are checked
 * inside the relevant page or Server Action.
 */

export const ROLE_KEYS = ["super_admin", "admin", "teacher", "invigilator", "student"] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

type RouteArea = "admin" | "teacher" | "student";

const STUDENT_ROOTS = ["/home", "/tests", "/practice", "/progress", "/profile", "/results", "/review", "/attempt"];

/** The protected application area containing `pathname`, or `null` for a public route. */
export function routeArea(pathname: string): RouteArea | null {
	if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
	if (pathname === "/teacher" || pathname.startsWith("/teacher/")) return "teacher";
	if (STUDENT_ROOTS.some((root) => pathname === root || pathname.startsWith(`${root}/`))) return "student";
	return null;
}

/** Whether a role may enter a protected application area. */
export function roleCanAccess(role: string, area: RouteArea): boolean {
	if (area === "admin") return role === "super_admin" || role === "admin";
	if (area === "teacher") return role === "teacher" || role === "invigilator";
	return role === "student";
}

/** The role's landing page after sign-in or a refused cross-role navigation. */
export function homeForRole(role: string): string {
	if (role === "super_admin" || role === "admin") return "/admin/overview";
	if (role === "teacher" || role === "invigilator") return "/teacher/dashboard";
	if (role === "student") return "/home";
	return "/login";
}

/** Login URL that safely preserves a local destination. */
export function signInPath(pathname?: string): string {
	const next = safeRelativePath(pathname);
	return next ? `/login?next=${encodeURIComponent(next)}` : "/login";
}

/**
 * `path` if it is a path on **this** site, else `null` — the guard on every
 * "go back where you were" link, so the login form cannot be used as an open
 * redirect (`MVP-1.md` §8).
 *
 * "Starts with `/` and not `//`" is not enough: browsers read `/\evil.com` as
 * `//evil.com`, and drop tabs and newlines, so `/<tab>/evil.com` is the same.
 * Those characters are refused outright; the rest is resolved against a dummy
 * origin and must still be on it.
 */
export function safeRelativePath(path: string | null | undefined): string | null {
	if (!path || !path.startsWith("/") || path.startsWith("//")) return null;
	// Backslash, and every control character (tab, newline, NUL, DEL…).
	if (/[\\\u0000-\u001f\u007f]/.test(path)) return null;
	try {
		const base = "https://insignia.invalid";
		const url = new URL(path, base);
		if (url.origin !== base) return null;
		return `${url.pathname}${url.search}${url.hash}`;
	} catch {
		return null;
	}
}

/**
 * Whether Proxy must resolve who the visitor is before answering.
 *
 * Every protected area, plus the two routes whose answer depends on being
 * signed in: `/` chooses a home, and `/login` bounces a live session away
 * from a form it does not need.
 */
export function routeNeedsIdentity(pathname: string): boolean {
	return routeArea(pathname) !== null || pathname === "/" || pathname === "/login";
}

/**
 * Whether Proxy must also look up the visitor's role and session row — a
 * database round trip — rather than only verify the JWT locally.
 *
 * Only the two routes whose *answer* is the role: `/` picks a home, and
 * `/login` bounces a live session to it (and clears the cookies of an ended
 * one). Inside an app area the layout guard makes the same checks, so doing
 * them here as well only added latency to every click.
 */
export function routeNeedsRole(pathname: string): boolean {
	return pathname === "/" || pathname === "/login";
}

/**
 * What the request could establish about the browser's application session.
 *
 * `unverified` exists because a transient database error must not sign the
 * whole institute out. A confirmed missing or revoked row is `ended`; a read
 * that failed is `unverified`, and the server layout repeats the check.
 */
export type SessionStanding = "live" | "ended" | "unverified";

/** What the edge should do with a request. */
export type RouteDecision =
	/** Continue to the page. */
	| { kind: "pass" }
	/** Redirect, carrying refreshed auth cookies. */
	| { kind: "redirect"; to: string }
	/** Redirect *and* clear both cookies: the session is gone. */
	| { kind: "endSession"; to: string };

/**
 * The single routing rule for entry, login and the protected areas.
 *
 * Pure on purpose: Proxy supplies the request facts and performs the effects,
 * while the policy itself stays testable and lives beside the role rules it
 * shares. Order matters — a dead session outranks every other outcome.
 *
 * @param pathname The request path.
 * @param userId The Supabase JWT subject, or `null` when unauthenticated.
 * @param role The role key of an **active** account, else `null`. A signed-in
 *   visitor with no profile row is the bootstrap Owner mid-first-run.
 * @param session Standing of the `user_sessions` row named by the cookie.
 */
export function routeDecision({
	pathname,
	userId,
	role,
	session,
}: {
	pathname: string;
	userId: string | null;
	role: string | null;
	session: SessionStanding;
}): RouteDecision {
	const area = routeArea(pathname);
	const isEntry = pathname === "/";
	const isLogin = pathname === "/login";
	if (!area && !isEntry && !isLogin) return { kind: "pass" };

	// A JWT without its revocable session is only half a login. Deleting the
	// cookie must not become a way around device revocation.
	if (userId && role && session === "ended") return { kind: "endSession", to: "/login?ended=1" };

	if (isEntry) return { kind: "redirect", to: role ? homeForRole(role) : "/login" };
	if (isLogin) return role ? { kind: "redirect", to: homeForRole(role) } : { kind: "pass" };

	if (!area) return { kind: "pass" };
	if (!userId) return { kind: "redirect", to: signInPath(pathname) };
	if (!role) return { kind: "redirect", to: "/login" };
	if (!roleCanAccess(role, area)) return { kind: "redirect", to: homeForRole(role) };

	return { kind: "pass" };
}

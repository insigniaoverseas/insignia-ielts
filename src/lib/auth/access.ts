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
	if (!pathname || !pathname.startsWith("/") || pathname.startsWith("//")) return "/login";
	return `/login?next=${encodeURIComponent(pathname)}`;
}

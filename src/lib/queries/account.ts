import "server-only";

import { cookies } from "next/headers";

import { deviceRows } from "@/lib/auth/devices";
import { SESSION_COOKIE } from "@/lib/auth/session-cookie";
import { createClient } from "@/lib/supabase/server";
import type { StaffAccount } from "@/lib/view-models/staff";
import { queryFailed, relativeActivity } from "./shared";

/**
 * My account for staff (M10-12): their own profile row and live sessions, read
 * in one round through their own RLS client — `users` and `user_sessions` both
 * let anyone read their own rows, so nothing here needs the secret key.
 */
export async function getStaffAccount(): Promise<StaffAccount> {
	const supabase = await createClient();
	const { data: claims } = await supabase.auth.getClaims();
	const userId = claims?.claims?.sub;
	if (!userId) throw new Error("A signed-in user is required.");

	const [profileResult, sessionsResult, store] = await Promise.all([
		supabase.from("users").select("name, email, roles ( name ), branches ( name )").eq("id", userId).single(),
		supabase
			.from("user_sessions")
			.select("id, user_agent, last_seen_at")
			.eq("user_id", userId)
			.is("revoked_at", null),
		cookies(),
	]);
	if (profileResult.error) queryFailed("my account", profileResult.error);
	if (sessionsResult.error) queryFailed("my devices", sessionsResult.error);

	const profile = profileResult.data;
	return {
		name: profile.name,
		email: profile.email,
		roleLabel: profile.roles?.name ?? "Staff",
		branchName: profile.branches?.name ?? null,
		devices: deviceRows(sessionsResult.data ?? [], store.get(SESSION_COOKIE)?.value, (iso) => relativeActivity(iso)),
	};
}
